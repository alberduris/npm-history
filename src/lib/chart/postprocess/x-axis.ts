import type { TickPolicy } from '../types';
import { getXAxisTicks } from './axis';

function setOpacity(text: SVGTextElement, value: string) {
  text.style.opacity = value;
  const existing = text.getAttribute('style') || '';
  const cleaned = existing.replace(/opacity:\s*[^;]+;?/g, '').trim();
  text.setAttribute('style', `${cleaned} opacity: ${value};`.trim());
}

export function applyXAxisTickPolicy(
  svg: SVGSVGElement | Element,
  tickPolicy: TickPolicy,
): void {
  const ticks = getXAxisTicks(svg);
  ticks.forEach((tick, i) => {
    const text = tick.querySelector('text') as SVGTextElement | null;
    if (!text) return;

    if (tickPolicy.tickPositions.has(i)) {
      const display = tickPolicy.tickDisplayTexts.get(i);
      if (display) text.textContent = display;
      setOpacity(text, '1');
    } else {
      setOpacity(text, '0');
    }
  });
}

