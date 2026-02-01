import dayjs from 'dayjs';
import type { PackageChartData, ChartOptions, LabelResult, TransformResult } from './types';

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
