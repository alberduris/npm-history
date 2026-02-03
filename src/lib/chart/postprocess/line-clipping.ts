import type { ChartLayout, ClipRange } from '../types';

interface ClipRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeClipRects(
  clipRanges: ClipRange[],
  totalLabels: number,
  layout: ChartLayout,
  idPrefix = 'npm-clip',
): ClipRect[] {
  if (clipRanges.length === 0 || totalLabels < 2) return [];

  const chartAreaWidth = layout.widthPx - layout.marginLeft - layout.marginRight;
  if (chartAreaWidth <= 0) return [];
  const pointSpacing = chartAreaWidth / (totalLabels - 1);

  return clipRanges.map((range, i) => {
    const startX = range.startIndex > 0 ? range.startIndex * pointSpacing - pointSpacing * 0.5 : -10;
    const endX = range.endIndex < totalLabels - 1 ? range.endIndex * pointSpacing + pointSpacing * 0.5 : chartAreaWidth + 10;
    return {
      id: `${idPrefix}-${i}`,
      x: startX,
      y: -1000,
      width: endX - startX,
      height: 2000,
    };
  });
}

export function applyLineClipping(
  svg: SVGSVGElement,
  clipRects: ClipRect[],
): void {
  if (clipRects.length === 0) return;

  const ns = 'http://www.w3.org/2000/svg';
  const linePaths = svg.querySelectorAll('path.xkcd-chart-line');
  if (linePaths.length === 0) return;

  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS(ns, 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  linePaths.forEach((path, i) => {
    if (i >= clipRects.length) return;
    const rectSpec = clipRects[i];

    const clipPath = document.createElementNS(ns, 'clipPath');
    clipPath.setAttribute('id', rectSpec.id);
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', String(rectSpec.x));
    rect.setAttribute('y', String(rectSpec.y));
    rect.setAttribute('width', String(rectSpec.width));
    rect.setAttribute('height', String(rectSpec.height));
    clipPath.appendChild(rect);
    defs!.appendChild(clipPath);

    path.setAttribute('clip-path', `url(#${rectSpec.id})`);
  });
}

export function applyLineClippingServer(
  svg: SVGSVGElement | Element,
  doc: Document,
  clipRects: ClipRect[],
): void {
  if (clipRects.length === 0) return;

  const ns = 'http://www.w3.org/2000/svg';
  const linePaths = svg.querySelectorAll('path.xkcd-chart-line');
  if (linePaths.length === 0) return;

  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = doc.createElementNS(ns, 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  linePaths.forEach((path, i) => {
    if (i >= clipRects.length) return;
    const rectSpec = clipRects[i];

    const clipPath = doc.createElementNS(ns, 'clipPath');
    clipPath.setAttribute('id', rectSpec.id);
    const rect = doc.createElementNS(ns, 'rect');
    rect.setAttribute('x', String(rectSpec.x));
    rect.setAttribute('y', String(rectSpec.y));
    rect.setAttribute('width', String(rectSpec.width));
    rect.setAttribute('height', String(rectSpec.height));
    clipPath.appendChild(rect);
    defs!.appendChild(clipPath);

    path.setAttribute('clip-path', `url(#${rectSpec.id})`);
  });
}
