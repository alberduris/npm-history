import dayjs from 'dayjs';
import { computeBaseTickCount } from './ticks';

export const TOOLTIP_DATE_FORMAT = 'MMM DD, YYYY'; // "May 04, 2017"

export interface LabelSet {
  labels: string[];
  displayLabelByIndex: Map<number, string>;
}

export function computeLabelFormat(totalWeeks: number, baseTickCount: number): string {
  const tickInterval = totalWeeks / Math.max(1, baseTickCount - 1);
  if (tickInterval <= 8) return 'MMM D';
  if (totalWeeks <= 40) return 'MMM';
  if (tickInterval <= 52) return "MMM 'YY";
  return 'YYYY';
}

function getAlignUnit(totalWeeks: number, tickInterval: number): 'weeks' | 'months' | 'years' {
  if (totalWeeks <= 12) return 'weeks';
  if (tickInterval < 52) return 'months';
  return 'years';
}

export function formatAlignLabel(weekIndex: number, unit: 'weeks' | 'months' | 'years'): string {
  if (weekIndex === 0) return '0';
  switch (unit) {
    case 'weeks':
      return `${weekIndex}w`;
    case 'months': {
      const mo = Math.round(weekIndex / 4.33);
      return `${mo} mo`;
    }
    case 'years': {
      const yr = Math.round(weekIndex / 52);
      return yr === 0 ? '< 1 yr' : `${yr} yr`;
    }
  }
}

function formatMonths(weekIndex: number): string {
  const months = (weekIndex / 4.33).toFixed(1);
  const clean = months.endsWith('.0') ? months.slice(0, -2) : months;
  return `${clean} months`;
}

export function buildTimelineLabels(timeline: string[]): LabelSet {
  if (timeline.length === 0) return { labels: [], displayLabelByIndex: new Map() };

  const baseTickCount = computeBaseTickCount(timeline.length);
  const displayFormat = computeLabelFormat(timeline.length, baseTickCount);

  const labels = timeline.map((date) => dayjs(date).format(TOOLTIP_DATE_FORMAT));
  const displayLabelByIndex = new Map<number, string>();
  for (let i = 0; i < timeline.length; i++) {
    displayLabelByIndex.set(i, dayjs(timeline[i]).format(displayFormat));
  }

  return { labels, displayLabelByIndex };
}

export function buildAlignLabels(totalWeeks: number): LabelSet {
  if (totalWeeks <= 0) return { labels: [], displayLabelByIndex: new Map() };

  const baseTickCount = computeBaseTickCount(totalWeeks);
  const tickInterval = totalWeeks / Math.max(1, baseTickCount - 1);
  const unit = getAlignUnit(totalWeeks, tickInterval);

  const labels = Array.from({ length: totalWeeks }, (_, i) => formatMonths(i));
  const displayLabelByIndex = new Map<number, string>();
  for (let i = 0; i < totalWeeks; i++) {
    displayLabelByIndex.set(i, formatAlignLabel(i, unit));
  }

  return { labels, displayLabelByIndex };
}
