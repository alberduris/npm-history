import { formatDownloads } from './format-downloads';

// --- Post-render DOM hacks (client-side, uses getBoundingClientRect / getBBox) ---

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
