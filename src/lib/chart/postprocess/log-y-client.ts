import { formatDownloads } from '../format-downloads';

export function formatLogYAxisLabels(svg: SVGSVGElement): void {
  const allTicks = svg.querySelectorAll('.tick text');
  const svgRect = svg.getBoundingClientRect();

  for (const t of allTicks) {
    const rect = t.getBoundingClientRect();
    const relX = rect.x - svgRect.x;
    const relY = rect.y - svgRect.y;
    if (relX >= svgRect.width * 0.15) continue;
    if (relY > svgRect.height * 0.9) continue;

    const content = t.textContent?.trim() || '';
    const logVal = parseFloat(content.replace(/[^0-9.-]/g, ''));
    if (isNaN(logVal)) continue;

    const original = Math.pow(10, logVal);
    t.textContent = formatDownloads(original);
  }
}

