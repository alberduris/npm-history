import type { PackageChartData, ChartOptions, ChartLayout, ChartModel, ClipRange } from '../types';
import { buildAlignedTimeline, buildUnifiedTimeline } from './timeline';
import { buildAlignLabels, buildTimelineLabels } from './labels';
import { buildTickPolicy } from './ticks';

function applyLogTransform(seriesValues: number[][]): { transformed: number[][]; maxLog: number } {
  let maxLog = 0;
  const transformed = seriesValues.map((vals) =>
    vals.map((v) => {
      if (v <= 0) return 0;
      const log = Math.log10(v);
      if (log > maxLog) maxLog = log;
      return log;
    }),
  );
  return { transformed, maxLog };
}

export function buildChartModel(
  series: PackageChartData[],
  options: ChartOptions,
  layout: ChartLayout,
): ChartModel {
  if (series.length === 0) {
    return {
      chartData: { labels: [], datasets: [] },
      yTickCount: 4,
      maxLogValue: 0,
      tickPolicy: { xTickCount: 0, tickPositions: new Set(), tickDisplayTexts: new Map() },
      clipRanges: [],
    };
  }

  let seriesValues: number[][];
  let labels: string[];
  let displayLabelByIndex: Map<number, string>;
  let clipRanges: ClipRange[] = [];

  if (options.alignTimeline) {
    const aligned = buildAlignedTimeline(series);
    seriesValues = aligned.seriesValues;
    clipRanges = aligned.clipRanges;
    const labelSet = buildAlignLabels(aligned.totalWeeks);
    labels = labelSet.labels;
    displayLabelByIndex = labelSet.displayLabelByIndex;
  } else {
    const unified = buildUnifiedTimeline(series);
    seriesValues = unified.seriesValues;
    clipRanges = unified.clipRanges;
    const labelSet = buildTimelineLabels(unified.timeline);
    labels = labelSet.labels;
    displayLabelByIndex = labelSet.displayLabelByIndex;
  }

  let maxLogValue = 0;
  let yTickCount = 4;

  if (options.logScale) {
    const { transformed, maxLog } = applyLogTransform(seriesValues);
    seriesValues = transformed;
    maxLogValue = maxLog;
    yTickCount = Math.max(2, Math.ceil(maxLog));
  }

  const datasets = series.map((s, i) => ({
    label: s.packageName,
    data: seriesValues[i] ?? [],
  }));

  const tickPolicy = buildTickPolicy({
    totalLabels: labels.length,
    displayLabelByIndex,
    layout,
  });

  return {
    chartData: { labels, datasets },
    yTickCount,
    maxLogValue,
    tickPolicy,
    clipRanges,
  };
}
