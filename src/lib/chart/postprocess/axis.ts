export function findAxisGroup(
  svg: SVGSVGElement | Element,
  axis: 'x' | 'y',
): Element | null {
  const container = svg.querySelector('g[pointer-events="all"]');
  if (!container) return null;
  for (const child of Array.from(container.children)) {
    const anchor = child.getAttribute('text-anchor');
    if (axis === 'x' && anchor === 'middle') return child;
    if (axis === 'y' && anchor === 'end') return child;
  }
  return null;
}

export function getXAxisTicks(svg: SVGSVGElement | Element): Element[] {
  const xAxisGroup = findAxisGroup(svg, 'x');
  if (!xAxisGroup) return [];
  return Array.from(xAxisGroup.querySelectorAll('.tick'));
}

