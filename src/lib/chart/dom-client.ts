import { formatDownloads } from './format-downloads';
import type { ClipRange } from './types';

// --- Post-render DOM hacks (client-side, uses getBoundingClientRect / getBBox) ---

function findAxisGroup(svg: SVGSVGElement | Element, axis: 'x' | 'y'): Element | null {
  const container = svg.querySelector('g[pointer-events="all"]');
  if (!container) return null;
  for (const child of Array.from(container.children)) {
    const anchor = child.getAttribute('text-anchor');
    if (axis === 'x' && anchor === 'middle') return child;
    if (axis === 'y' && anchor === 'end') return child;
  }
  return null;
}

export function styleXAxisLabels(
  svg: SVGSVGElement,
  tickPositions: Set<number>,
  tickDisplayTexts: Map<number, string>,
): void {
  const svgRect = svg.getBoundingClientRect();
  const xAxisGroup = findAxisGroup(svg, 'x');
  const xAxisTicks = xAxisGroup ? Array.from(xAxisGroup.querySelectorAll('.tick')) : [];

  if (xAxisTicks.length === 0) {
    // Fallback: Collect x-axis ticks by position (bottom ~10%), preserving DOM order = label order
    const allTicks = svg.querySelectorAll('.tick');
    for (const tick of allTicks) {
      const text = tick.querySelector('text');
      if (!text) continue;
      const rect = text.getBoundingClientRect();
      const relY = rect.y - svgRect.y;
      if (relY > svgRect.height * 0.9) xAxisTicks.push(tick);
    }
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

  // Hide overlapping visible ticks (mobile-safe)
  const visibleTicks = xAxisTicks
    .map((tick) => tick.querySelector('text') as SVGTextElement | null)
    .filter((text): text is SVGTextElement => {
      if (!text) return false;
      if (!text.textContent?.trim()) return false;
      return text.style.opacity !== '0';
    })
    .map((text) => ({ text, rect: text.getBoundingClientRect() }))
    .sort((a, b) => a.rect.x - b.rect.x);

  if (visibleTicks.length <= 2) return;

  const minGap = Math.max(6, Math.round(svgRect.width * 0.012));
  const lastTick = visibleTicks[visibleTicks.length - 1];
  const kept: typeof visibleTicks = [visibleTicks[0]];

  for (const item of visibleTicks.slice(1, -1)) {
    const prev = kept[kept.length - 1];
    if (item.rect.x <= prev.rect.right + minGap) {
      item.text.style.opacity = '0';
    } else {
      kept.push(item);
    }
  }

  const lastKept = kept[kept.length - 1];
  if (lastTick.rect.x <= lastKept.rect.right + minGap && kept.length > 1) {
    lastKept.text.style.opacity = '0';
  }
  lastTick.text.style.opacity = '1';
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

export function applyLineClipping(
  svg: SVGSVGElement,
  clipRanges: ClipRange[],
  totalLabels: number,
): void {
  if (clipRanges.length === 0 || totalLabels < 2) return;

  const ns = 'http://www.w3.org/2000/svg';
  const linePaths = svg.querySelectorAll('path.xkcd-chart-line');
  if (linePaths.length === 0) return;

  // chart.xkcd chart group: g[transform="translate(marginLeft, marginTop)"]
  // Lines are drawn inside this group, so path x-coords go from 0 to chartAreaWidth.
  // scalePoint: x(i) = (i / (totalLabels - 1)) * chartAreaWidth
  const svgWidth = svg.getBoundingClientRect().width;
  const mainG = svg.querySelector('g[transform]');
  let marginLeft = 70;
  if (mainG) {
    const m = mainG.getAttribute('transform')?.match(/translate\(([^,]+),/);
    if (m) marginLeft = parseFloat(m[1]);
  }
  const marginRight = 30; // chart.xkcd hardcoded
  const chartAreaWidth = svgWidth - marginLeft - marginRight;
  const pointSpacing = chartAreaWidth / (totalLabels - 1);

  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS(ns, 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  linePaths.forEach((path, i) => {
    if (i >= clipRanges.length) return;
    const { startIndex, endIndex } = clipRanges[i];
    if (startIndex === 0 && endIndex >= totalLabels - 1) return;

    const startX = startIndex > 0 ? startIndex * pointSpacing - pointSpacing * 0.5 : -10;
    const endX = endIndex < totalLabels - 1 ? endIndex * pointSpacing + pointSpacing * 0.5 : chartAreaWidth + 10;

    const clipId = `npm-clip-${i}`;
    const clipPath = document.createElementNS(ns, 'clipPath');
    clipPath.setAttribute('id', clipId);
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', String(startX));
    rect.setAttribute('y', '-1000');
    rect.setAttribute('width', String(endX - startX));
    rect.setAttribute('height', '2000');
    clipPath.appendChild(rect);
    defs!.appendChild(clipPath);

    path.setAttribute('clip-path', `url(#${clipId})`);
  });
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
