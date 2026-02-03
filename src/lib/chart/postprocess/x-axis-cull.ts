import { getXAxisTicks } from './axis';

function isHidden(text: SVGTextElement): boolean {
  if (text.style.opacity === '0') return true;
  const style = text.getAttribute('style') || '';
  return /opacity:\s*0\b/.test(style);
}

export function cullOverlappingXAxisLabels(
  svg: SVGSVGElement,
  { minGapPx }: { minGapPx: number },
): void {
  const ticks = getXAxisTicks(svg);
  if (ticks.length <= 2) return;

  const visibleTicks = ticks
    .map((tick) => tick.querySelector('text') as SVGTextElement | null)
    .filter((text): text is SVGTextElement => {
      if (!text) return false;
      if (!text.textContent?.trim()) return false;
      return !isHidden(text);
    })
    .map((text) => ({ text, rect: text.getBoundingClientRect() }))
    .sort((a, b) => a.rect.x - b.rect.x);

  if (visibleTicks.length <= 2) return;

  const minGap = Math.max(0, minGapPx);
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

