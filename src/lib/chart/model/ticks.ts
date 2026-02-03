import type { ChartLayout, TickPolicy } from '../types';

export function computeBaseTickCount(totalLabels: number): number {
  if (totalLabels <= 4) return Math.max(1, totalLabels);
  if (totalLabels <= 13) return 4;
  if (totalLabels <= 26) return 5;
  if (totalLabels <= 52) return 6;
  if (totalLabels <= 156) return 6;
  if (totalLabels <= 416) return 7;
  return 8;
}

export function estimateTextWidth(label: string): number {
  return label.length * 7;
}

export function computeMaxTicksByWidth(input: {
  widthPx: number;
  marginLeft: number;
  marginRight: number;
  maxLabelWidth: number;
  minGapPx: number;
}): number {
  const availableWidth = Math.max(0, input.widthPx - input.marginLeft - input.marginRight);
  if (availableWidth === 0 || input.maxLabelWidth === 0) return 2;
  return Math.floor((availableWidth + input.minGapPx) / (input.maxLabelWidth + input.minGapPx)) + 1;
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

export function buildTickPolicy(params: {
  totalLabels: number;
  displayLabelByIndex: Map<number, string>;
  layout: ChartLayout;
}): TickPolicy {
  const { totalLabels, displayLabelByIndex, layout } = params;
  if (totalLabels <= 0) {
    return { xTickCount: 0, tickPositions: new Set(), tickDisplayTexts: new Map() };
  }
  if (totalLabels === 1) {
    const onlyLabel = displayLabelByIndex.get(0) ?? '';
    return { xTickCount: 1, tickPositions: new Set([0]), tickDisplayTexts: new Map([[0, onlyLabel]]) };
  }

  const baseTickCount = computeBaseTickCount(totalLabels);
  let maxLabelWidth = 0;
  for (const label of displayLabelByIndex.values()) {
    maxLabelWidth = Math.max(maxLabelWidth, estimateTextWidth(label));
  }
  const maxTicksByWidth = computeMaxTicksByWidth({
    widthPx: layout.widthPx,
    marginLeft: layout.marginLeft,
    marginRight: layout.marginRight,
    maxLabelWidth,
    minGapPx: layout.minTickGapPx,
  });

  const desired = Math.min(baseTickCount, maxTicksByWidth, totalLabels);
  const xTickCount = Math.max(2, desired);
  const tickPositions = getTickPositions(totalLabels, xTickCount);
  const tickDisplayTexts = new Map<number, string>();
  for (const pos of tickPositions) {
    const display = displayLabelByIndex.get(pos);
    if (display) tickDisplayTexts.set(pos, display);
  }

  return { xTickCount, tickPositions, tickDisplayTexts };
}

