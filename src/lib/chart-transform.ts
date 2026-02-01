import dayjs from 'dayjs';
import type { PackageChartData, WeeklyDataPoint } from './data-transform';

// --- Types ---

interface ChartXkcdData {
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

interface ChartOptions {
  logScale: boolean;
  alignTimeline: boolean;
}

interface LabelResult {
  labels: string[];
  tickPositions: Set<number>;
  tickDisplayTexts: Map<number, string>;
}

interface TransformResult {
  chartData: ChartXkcdData;
  yTickCount: number;
  maxLogValue: number;
  tickPositions: Set<number>;
  tickDisplayTexts: Map<number, string>;
}

// --- X-Axis Tick Helpers ---

function computeXTickCount(totalWeeks: number): number {
  if (totalWeeks <= 4) return Math.max(1, totalWeeks);
  if (totalWeeks <= 13) return 4;
  if (totalWeeks <= 26) return 5;
  if (totalWeeks <= 52) return 6;
  if (totalWeeks <= 156) return 6;
  if (totalWeeks <= 416) return 7;
  return 8;
}

function computeLabelFormat(totalWeeks: number, xTickCount: number): string {
  const tickInterval = totalWeeks / Math.max(1, xTickCount - 1);
  if (tickInterval <= 8) return 'MMM D';
  if (totalWeeks <= 40) return 'MMM';
  if (tickInterval <= 52) return "MMM 'YY";
  return 'YYYY';
}

function getTickPositions(totalLabels: number, tickCount: number): Set<number> {
  if (totalLabels <= tickCount) {
    return new Set(Array.from({ length: totalLabels }, (_, i) => i));
  }
  const positions = new Set<number>();
  for (let i = 0; i < tickCount; i++) {
    positions.add(Math.round(i * (totalLabels - 1) / (tickCount - 1)));
  }
  return positions;
}

// --- Align Mode Helpers ---

function getAlignUnit(totalWeeks: number, tickInterval: number): 'weeks' | 'months' | 'years' {
  if (totalWeeks <= 12) return 'weeks';
  if (tickInterval < 52) return 'months';
  return 'years';
}

function formatAlignLabel(weekIndex: number, unit: 'weeks' | 'months' | 'years'): string {
  if (weekIndex === 0) return '0';
  switch (unit) {
    case 'weeks':
      return `${weekIndex}w`;
    case 'months': {
      const mo = Math.round(weekIndex / 4.33);
      return `${mo} mo`;
    }
    case 'years': {
      const yr = Math.round(weekIndex / 52);
      return yr === 0 ? '< 1 yr' : `${yr} yr`;
    }
  }
}

// --- Timeline Builders ---

function generateMondaySequence(startDate: string, endDate: string): string[] {
  const mondays: string[] = [];
  let current = dayjs(startDate);
  const end = dayjs(endDate);
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    mondays.push(current.format('YYYY-MM-DD'));
    current = current.add(7, 'day');
  }
  return mondays;
}

function buildUnifiedTimeline(
  series: PackageChartData[],
): { timeline: string[]; seriesValues: number[][] } {
  let minDate = '';
  let maxDate = '';
  for (const s of series) {
    if (s.data.length === 0) continue;
    const first = s.data[0].weekStart;
    const last = s.data[s.data.length - 1].weekStart;
    if (!minDate || first < minDate) minDate = first;
    if (!maxDate || last > maxDate) maxDate = last;
  }

  if (!minDate || !maxDate) return { timeline: [], seriesValues: [] };

  const timeline = generateMondaySequence(minDate, maxDate);
  const seriesValues: number[][] = [];

  for (const s of series) {
    const dataMap = new Map<string, number>();
    for (const dp of s.data) {
      dataMap.set(dp.weekStart, dp.downloads);
    }

    const firstWeek = s.data.length > 0 ? s.data[0].weekStart : '';
    const lastWeek = s.data.length > 0 ? s.data[s.data.length - 1].weekStart : '';
    const values: number[] = [];
    let lastKnown = 0;

    for (const week of timeline) {
      if (!firstWeek || week < firstWeek) {
        // Before series start
        values.push(0);
      } else if (week > lastWeek) {
        // After series end
        values.push(0);
      } else if (dataMap.has(week)) {
        const val = dataMap.get(week)!;
        lastKnown = val;
        values.push(val);
      } else {
        // Gap within range: forward-fill
        values.push(lastKnown);
      }
    }

    seriesValues.push(values);
  }

  return { timeline, seriesValues };
}

function buildAlignedTimeline(
  series: PackageChartData[],
): { totalWeeks: number; seriesValues: number[][] } {
  let maxLen = 0;
  const rawValues: number[][] = [];

  for (const s of series) {
    const vals = s.data.map((d) => d.downloads);
    rawValues.push(vals);
    if (vals.length > maxLen) maxLen = vals.length;
  }

  // Pad shorter series with 0
  const seriesValues = rawValues.map((vals) => {
    if (vals.length < maxLen) {
      return [...vals, ...Array(maxLen - vals.length).fill(0)];
    }
    return vals;
  });

  return { totalWeeks: maxLen, seriesValues };
}

// --- Log Transform ---

function applyLogTransform(seriesValues: number[][]): { transformed: number[][]; maxLog: number } {
  let maxLog = 0;
  const transformed = seriesValues.map((vals) =>
    vals.map((v) => {
      if (v <= 0) return 0;
      const log = Math.log10(v);
      if (log > maxLog) maxLog = log;
      return log;
    }),
  );
  return { transformed, maxLog };
}

// --- Label Generation ---
// chart.xkcd uses D3 scaleBand (categorical X-axis). Each label must be UNIQUE
// or they collapse to the same position. ALL labels use tooltip-friendly format
// (readable dates / month counts). The DOM hack then reformats visible tick
// labels to shorter display format and hides the rest.

const TOOLTIP_DATE_FORMAT = 'MMM DD, YYYY'; // "May 04, 2017"

function formatMonths(weekIndex: number): string {
  const months = (weekIndex / 4.33).toFixed(1);
  // Strip trailing .0 for clean integers: "63.0" → "63"
  const clean = months.endsWith('.0') ? months.slice(0, -2) : months;
  return `${clean} months`;
}

function generateDateLabels(timeline: string[], totalWeeks: number): LabelResult {
  const xTickCount = computeXTickCount(totalWeeks);
  const displayFormat = computeLabelFormat(totalWeeks, xTickCount);
  const tickPositions = getTickPositions(timeline.length, xTickCount);

  // ALL labels: "May 04, 2017" — unique by distinct Mondays, readable in tooltip.
  const labels = timeline.map((date) => dayjs(date).format(TOOLTIP_DATE_FORMAT));

  // Tick display texts: shorter format for x-axis visibility ("Jan '23", "2017", etc.)
  const tickDisplayTexts = new Map<number, string>();
  for (const pos of tickPositions) {
    tickDisplayTexts.set(pos, dayjs(timeline[pos]).format(displayFormat));
  }

  return { labels, tickPositions, tickDisplayTexts };
}

function generateAlignLabels(totalWeeks: number): LabelResult {
  const xTickCount = computeXTickCount(totalWeeks);
  const tickInterval = totalWeeks / Math.max(1, xTickCount - 1);
  const unit = getAlignUnit(totalWeeks, tickInterval);
  const tickPositions = getTickPositions(totalWeeks, xTickCount);

  // ALL labels: "N months" (or "N.D months") — unique because step 1/4.33 ≈ 0.231
  // exceeds the .toFixed(1) bucket size of 0.1, guaranteeing distinct values.
  const labels = Array.from({ length: totalWeeks }, (_, i) => formatMonths(i));

  // Tick display texts: shorter format for x-axis ("0", "6 mo", "2 yr")
  const tickDisplayTexts = new Map<number, string>();
  for (const pos of tickPositions) {
    tickDisplayTexts.set(pos, formatAlignLabel(pos, unit));
  }

  return { labels, tickPositions, tickDisplayTexts };
}

// --- Main Orchestrator ---

export function transformForChart(
  series: PackageChartData[],
  options: ChartOptions,
): TransformResult {
  if (series.length === 0) {
    return { chartData: { labels: [], datasets: [] }, yTickCount: 4, maxLogValue: 0, tickPositions: new Set(), tickDisplayTexts: new Map() };
  }

  let seriesValues: number[][];
  let labelResult: LabelResult;

  if (options.alignTimeline) {
    const aligned = buildAlignedTimeline(series);
    seriesValues = aligned.seriesValues;
    labelResult = generateAlignLabels(aligned.totalWeeks);
  } else {
    const unified = buildUnifiedTimeline(series);
    seriesValues = unified.seriesValues;
    labelResult = generateDateLabels(unified.timeline, unified.timeline.length);
  }

  const { labels, tickPositions, tickDisplayTexts } = labelResult;

  let maxLogValue = 0;
  let yTickCount = 4;

  if (options.logScale) {
    const { transformed, maxLog } = applyLogTransform(seriesValues);
    seriesValues = transformed;
    maxLogValue = maxLog;
    yTickCount = Math.max(2, Math.ceil(maxLog));
  }

  const datasets = series.map((s, i) => ({
    label: s.packageName,
    data: seriesValues[i],
  }));

  return {
    chartData: { labels, datasets },
    yTickCount,
    maxLogValue,
    tickPositions,
    tickDisplayTexts,
  };
}

// --- Post-render DOM hacks ---

export function styleXAxisLabels(
  svg: SVGSVGElement,
  tickPositions: Set<number>,
  tickDisplayTexts: Map<number, string>,
): void {
  const svgRect = svg.getBoundingClientRect();
  const allTicks = svg.querySelectorAll('.tick');

  // Collect x-axis ticks by position (bottom ~10%), preserving DOM order = label order
  const xAxisTicks: Element[] = [];
  for (const tick of allTicks) {
    const text = tick.querySelector('text');
    if (!text) continue;
    const rect = text.getBoundingClientRect();
    const relY = rect.y - svgRect.y;
    if (relY > svgRect.height * 0.9) xAxisTicks.push(tick);
  }

  // Index-based: Nth x-axis tick = labels[N]
  xAxisTicks.forEach((tick, i) => {
    const text = tick.querySelector('text') as SVGTextElement;
    if (!text) return;

    if (tickPositions.has(i)) {
      // Tick position: replace tooltip-friendly text with shorter display format
      const display = tickDisplayTexts.get(i);
      if (display) text.textContent = display;
    } else {
      // Non-tick: hide
      text.style.opacity = '0';
    }
  });
}

// --- Log scale Y-axis label replacement ---

function formatDownloads(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return m % 1 === 0 ? `${m}M` : `${parseFloat(m.toFixed(1))}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return k % 1 === 0 ? `${k}K` : `${parseFloat(k.toFixed(1))}K`;
  }
  return String(Math.round(n));
}

export function injectWatermark(svg: SVGSVGElement): void {
  const ns = 'http://www.w3.org/2000/svg';
  const svgRect = svg.getBoundingClientRect();

  // Find xLabel ("Date" / "Timeline") for vertical alignment
  let refY = svgRect.height - 15;
  for (const t of svg.querySelectorAll('text')) {
    const content = t.textContent?.trim();
    if (content === 'Date' || content === 'Timeline') {
      const r = t.getBoundingClientRect();
      refY = r.top + r.height / 2 - svgRect.top;
      break;
    }
  }

  const g = document.createElementNS(ns, 'g');
  g.setAttribute('pointer-events', 'none');

  // npm icon
  const iconH = 16;
  const iconW = Math.round(iconH * (520 / 284));
  const icon = document.createElementNS(ns, 'image');
  icon.setAttribute('href', '/assets/npm-icon.png');
  icon.setAttribute('width', String(iconW));
  icon.setAttribute('height', String(iconH));
  icon.setAttribute('y', String(-iconH / 2));
  g.appendChild(icon);

  // Domain text in hand-drawn font, vertically centered with icon
  const domain = document.createElementNS(ns, 'text');
  domain.setAttribute('x', String(iconW + 5));
  domain.setAttribute('y', String(-iconH * 0.15));
  domain.setAttribute('dominant-baseline', 'central');
  domain.setAttribute('font-family', 'xkcd, sans-serif');
  domain.setAttribute('font-size', '15');
  domain.setAttribute('fill', '#555');
  domain.textContent = 'npm-history.com';
  g.appendChild(domain);

  // Append to measure, then right-align
  svg.appendChild(g);
  const gBox = g.getBBox();
  const tx = svgRect.width - gBox.width - 20;
  g.setAttribute('transform', `translate(${tx}, ${refY})`);
}

export function formatLogYAxisLabels(svg: SVGSVGElement): void {
  const allTicks = svg.querySelectorAll('.tick text');
  const svgRect = svg.getBoundingClientRect();

  for (const t of allTicks) {
    const rect = t.getBoundingClientRect();
    const relX = rect.x - svgRect.x;
    const relY = rect.y - svgRect.y;
    // Y-axis ticks: left ~15% AND not at the bottom (X-axis labels sit at bottom ~10%)
    if (relX >= svgRect.width * 0.15) continue;
    if (relY > svgRect.height * 0.9) continue;

    const content = t.textContent?.trim() || '';
    const logVal = parseFloat(content.replace(/[^0-9.-]/g, ''));
    if (isNaN(logVal)) continue;

    // Use exact 10^logVal (no rounding) to avoid duplicate labels
    // when chart.xkcd auto-ranges to a narrow log range (e.g. [6, 8])
    const original = Math.pow(10, logVal);
    t.textContent = formatDownloads(original);
  }
}

// =============================================================================
// Server-side versions (no getBoundingClientRect / getBBox / layout APIs)
// Identify axes by DOM structure instead of pixel coordinates.
// chart.xkcd SVG structure:
//   <g pointer-events="all">
//     <g transform="translate(0, chartHeight)"> ← X-axis (text-anchor="middle")
//     <g transform="translate(0, 0)">            ← Y-axis (text-anchor="end")
// =============================================================================

function findAxisGroup(svg: SVGSVGElement | Element, axis: 'x' | 'y'): Element | null {
  const container = svg.querySelector('g[pointer-events="all"]');
  if (!container) return null;
  for (const child of container.children) {
    const anchor = child.getAttribute('text-anchor');
    if (axis === 'x' && anchor === 'middle') return child;
    if (axis === 'y' && anchor === 'end') return child;
  }
  return null;
}

export function styleXAxisLabelsServer(
  svg: SVGSVGElement | Element,
  tickPositions: Set<number>,
  tickDisplayTexts: Map<number, string>,
): void {
  const xAxisGroup = findAxisGroup(svg, 'x');
  if (!xAxisGroup) return;

  const ticks = xAxisGroup.querySelectorAll('.tick');
  ticks.forEach((tick, i) => {
    const text = tick.querySelector('text');
    if (!text) return;

    if (tickPositions.has(i)) {
      const display = tickDisplayTexts.get(i);
      if (display) text.textContent = display;
    } else {
      text.setAttribute('style', (text.getAttribute('style') || '') + ' opacity: 0;');
    }
  });
}

export function formatLogYAxisLabelsServer(svg: SVGSVGElement | Element): void {
  const yAxisGroup = findAxisGroup(svg, 'y');
  if (!yAxisGroup) return;

  const ticks = yAxisGroup.querySelectorAll('.tick text');
  for (const t of ticks) {
    const content = t.textContent?.trim() || '';
    const logVal = parseFloat(content.replace(/[^0-9.-]/g, ''));
    if (isNaN(logVal)) continue;
    const original = Math.pow(10, logVal);
    t.textContent = formatDownloads(original);
  }
}

export function injectWatermarkServer(
  svg: SVGSVGElement | Element,
  doc: Document,
  theme: 'light' | 'dark' = 'light',
): void {
  const ns = 'http://www.w3.org/2000/svg';
  const isDark = theme === 'dark';

  // Get SVG dimensions from attributes
  const svgWidth = parseFloat(svg.getAttribute('width') || '800');
  const svgHeight = parseFloat(svg.getAttribute('height') || '500');

  // Find the main chart translate to compute absolute position of xLabel
  // chart.xkcd uses translate(70, 60) as the chart area offset
  const mainG = svg.querySelector('g[transform]');
  let marginLeft = 70;
  let marginTop = 60;
  if (mainG) {
    const match = mainG.getAttribute('transform')?.match(/translate\(([^,]+),\s*([^)]+)\)/);
    if (match) {
      marginLeft = parseFloat(match[1]);
      marginTop = parseFloat(match[2]);
    }
  }

  // Find x-axis Y offset (= chart area height)
  const xAxisGroup = findAxisGroup(svg, 'x');
  let chartHeight = svgHeight - marginTop - 50; // fallback
  if (xAxisGroup) {
    const match = xAxisGroup.getAttribute('transform')?.match(/translate\([^,]*,\s*([^)]+)\)/);
    if (match) chartHeight = parseFloat(match[1]);
  }

  // Watermark Y: xLabel is ~40px below x-axis, center vertically with it
  const refY = marginTop + chartHeight + 40;

  const g = doc.createElementNS(ns, 'g');
  g.setAttribute('pointer-events', 'none');

  // npm icon (base64 embedded for server-side rendering)
  const iconH = 16;
  const iconW = Math.round(iconH * (520 / 284));
  const icon = doc.createElementNS(ns, 'image');
  icon.setAttribute('href', 'data:image/png;base64,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');
  icon.setAttribute('width', String(iconW));
  icon.setAttribute('height', String(iconH));
  icon.setAttribute('y', String(-iconH / 2));
  g.appendChild(icon);

  const domain = doc.createElementNS(ns, 'text');
  domain.setAttribute('x', String(iconW + 5));
  domain.setAttribute('y', String(-iconH * 0.15));
  domain.setAttribute('dominant-baseline', 'central');
  domain.setAttribute('font-family', 'xkcd, sans-serif');
  domain.setAttribute('font-size', '15');
  domain.setAttribute('fill', isDark ? '#555' : '#888');
  domain.textContent = 'npm-history.com';
  g.appendChild(domain);

  // Position: right-aligned, same line as xLabel
  // "npm-history.com" ≈ 15 chars * 7.5px ≈ 112px + badge 21px = ~133px
  const watermarkWidth = 140;
  const tx = svgWidth - watermarkWidth - 10;
  g.setAttribute('transform', `translate(${tx}, ${refY})`);

  svg.appendChild(g);
}
