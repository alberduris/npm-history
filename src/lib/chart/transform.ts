import type { PackageChartData, ChartOptions, TransformResult } from './types';
import { buildChartModel } from './model/build-chart-model';
import { buildChartLayout } from './model/layout';

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 530;

export function transformForChart(
  series: PackageChartData[],
  options: ChartOptions,
): TransformResult {
  const layout = buildChartLayout({ widthPx: DEFAULT_WIDTH, heightPx: DEFAULT_HEIGHT });
  const model = buildChartModel(series, options, layout);

  return {
    chartData: model.chartData,
    yTickCount: model.yTickCount,
    maxLogValue: model.maxLogValue,
    tickPositions: model.tickPolicy.tickPositions,
    tickDisplayTexts: model.tickPolicy.tickDisplayTexts,
    clipRanges: model.clipRanges,
  };
}
