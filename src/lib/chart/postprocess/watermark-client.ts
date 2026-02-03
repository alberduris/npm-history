export function injectWatermark(svg: SVGSVGElement): void {
  const ns = 'http://www.w3.org/2000/svg';
  const svgRect = svg.getBoundingClientRect();

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

  const iconH = 16;
  const iconW = Math.round(iconH * (520 / 284));
  const icon = document.createElementNS(ns, 'image');
  icon.setAttribute('href', '/assets/npm-icon.png');
  icon.setAttribute('width', String(iconW));
  icon.setAttribute('height', String(iconH));
  icon.setAttribute('y', String(-iconH / 2));
  g.appendChild(icon);

  const domain = document.createElementNS(ns, 'text');
  domain.setAttribute('x', String(iconW + 5));
  domain.setAttribute('y', String(-iconH * 0.15));
  domain.setAttribute('dominant-baseline', 'central');
  domain.setAttribute('font-family', 'xkcd, sans-serif');
  domain.setAttribute('font-size', '15');
  domain.setAttribute('fill', '#555');
  domain.textContent = 'npm-history.com';
  g.appendChild(domain);

  svg.appendChild(g);
  const gBox = g.getBBox();
  const tx = svgRect.width - gBox.width - 20;
  g.setAttribute('transform', `translate(${tx}, ${refY})`);
}

