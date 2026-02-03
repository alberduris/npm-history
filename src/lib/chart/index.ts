// Types
export type { ChartXkcdData, ChartOptions, ClipRange, LabelResult, TransformResult, PackageChartData, WeeklyDataPoint } from './types';

// Pure data transform
export { transformForChart } from './transform';

// Shared utility
export { formatDownloads } from './format-downloads';

// Client-side DOM post-render
export { styleXAxisLabels, formatLogYAxisLabels, injectWatermark, applyLineClipping } from './dom-client';

// Server-side DOM post-render
export { styleXAxisLabelsServer, formatLogYAxisLabelsServer, injectWatermarkServer, applyLineClippingServer } from './dom-server';
