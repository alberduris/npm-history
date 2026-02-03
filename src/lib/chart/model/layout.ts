import type { ChartLayout } from '../types';

const DEFAULT_MARGIN_LEFT = 70;
const DEFAULT_MARGIN_RIGHT = 30;
const DEFAULT_FONT_SIZE = 16;

interface LayoutInput {
  widthPx: number;
  heightPx: number;
  marginLeft?: number;
  marginRight?: number;
  fontSize?: number;
  minTickGapPx?: number;
}

export function buildChartLayout(input: LayoutInput): ChartLayout {
  const widthPx = Math.max(0, Math.round(input.widthPx));
  const heightPx = Math.max(0, Math.round(input.heightPx));
  const marginLeft = input.marginLeft ?? DEFAULT_MARGIN_LEFT;
  const marginRight = input.marginRight ?? DEFAULT_MARGIN_RIGHT;
  const fontSize = input.fontSize ?? DEFAULT_FONT_SIZE;
  const minTickGapPx = input.minTickGapPx ?? Math.max(6, Math.round(widthPx * 0.012));

  return {
    widthPx,
    heightPx,
    marginLeft,
    marginRight,
    fontSize,
    minTickGapPx,
  };
}

