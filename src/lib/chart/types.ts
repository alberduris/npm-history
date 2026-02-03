import type { PackageChartData, WeeklyDataPoint } from '../data-transform';
export type { PackageChartData, WeeklyDataPoint };

export interface ChartXkcdData {
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

export interface ChartOptions {
  logScale: boolean;
  alignTimeline: boolean;
}

export interface LabelResult {
  labels: string[];
  tickPositions: Set<number>;
  tickDisplayTexts: Map<number, string>;
}

/** Index range of real (non-zero-padded) data for one series. */
export interface ClipRange {
  startIndex: number;
  endIndex: number;
}

export interface TransformResult {
  chartData: ChartXkcdData;
  yTickCount: number;
  maxLogValue: number;
  tickPositions: Set<number>;
  tickDisplayTexts: Map<number, string>;
  clipRanges: ClipRange[];
}
