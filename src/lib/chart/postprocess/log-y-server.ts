import { formatDownloads } from '../format-downloads';
import { findAxisGroup } from './axis';

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

