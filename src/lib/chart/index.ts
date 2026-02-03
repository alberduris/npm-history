// Types
export type {
  ChartXkcdData,
  ChartOptions,
  ChartLayout,
  ChartModel,
  ClipRange,
  LabelResult,
  TickPolicy,
  TransformResult,
  PackageChartData,
  WeeklyDataPoint,
} from './types';

// Model (pure)
export { buildChartModel } from './model/build-chart-model';
export { buildChartLayout } from './model/layout';
export { transformForChart } from './transform';

// Shared utility
export { formatDownloads } from './format-downloads';

// Post-process (shared + client)
export { applyXAxisTickPolicy } from './postprocess/x-axis';
export { cullOverlappingXAxisLabels } from './postprocess/x-axis-cull';
export { applyLineClipping, applyLineClippingServer, computeClipRects } from './postprocess/line-clipping';
export { formatLogYAxisLabels } from './postprocess/log-y-client';
export { formatLogYAxisLabelsServer } from './postprocess/log-y-server';
export { injectWatermark } from './postprocess/watermark-client';
export { injectWatermarkServer } from './postprocess/watermark-server';
