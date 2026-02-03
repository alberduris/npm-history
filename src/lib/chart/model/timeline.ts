import dayjs from 'dayjs';
import type { PackageChartData } from '../types';
import type { ClipRange } from '../types';

function generateMondaySequence(startDate: string, endDate: string): string[] {
  const mondays: string[] = [];
  let current = dayjs(startDate);
  const end = dayjs(endDate);
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    mondays.push(current.format('YYYY-MM-DD'));
    current = current.add(7, 'day');
  }
  return mondays;
}

export function buildUnifiedTimeline(
  series: PackageChartData[],
): { timeline: string[]; seriesValues: number[][]; clipRanges: ClipRange[] } {
  let minDate = '';
  let maxDate = '';
  for (const s of series) {
    if (s.data.length === 0) continue;
    const first = s.data[0].weekStart;
    const last = s.data[s.data.length - 1].weekStart;
    if (!minDate || first < minDate) minDate = first;
    if (!maxDate || last > maxDate) maxDate = last;
  }

  if (!minDate || !maxDate) return { timeline: [], seriesValues: [], clipRanges: [] };

  const timeline = generateMondaySequence(minDate, maxDate);
  const timelineIndex = new Map<string, number>();
  for (let i = 0; i < timeline.length; i++) timelineIndex.set(timeline[i], i);

  const seriesValues: number[][] = [];
  const clipRanges: ClipRange[] = [];

  for (const s of series) {
    const dataMap = new Map<string, number>();
    for (const dp of s.data) {
      dataMap.set(dp.weekStart, dp.downloads);
    }

    const firstWeek = s.data.length > 0 ? s.data[0].weekStart : '';
    const lastWeek = s.data.length > 0 ? s.data[s.data.length - 1].weekStart : '';
    const values: number[] = [];
    let lastKnown = 0;

    for (const week of timeline) {
      if (!firstWeek || week < firstWeek) {
        values.push(0);
      } else if (week > lastWeek) {
        values.push(0);
      } else if (dataMap.has(week)) {
        const val = dataMap.get(week)!;
        lastKnown = val;
        values.push(val);
      } else {
        values.push(lastKnown);
      }
    }

    seriesValues.push(values);
    clipRanges.push({
      startIndex: firstWeek ? (timelineIndex.get(firstWeek) ?? 0) : 0,
      endIndex: lastWeek ? (timelineIndex.get(lastWeek) ?? timeline.length - 1) : timeline.length - 1,
    });
  }

  return { timeline, seriesValues, clipRanges };
}

export function buildAlignedTimeline(
  series: PackageChartData[],
): { totalWeeks: number; seriesValues: number[][]; clipRanges: ClipRange[] } {
  let maxLen = 0;
  const rawValues: number[][] = [];

  for (const s of series) {
    const vals = s.data.map((d) => d.downloads);
    rawValues.push(vals);
    if (vals.length > maxLen) maxLen = vals.length;
  }

  const clipRanges: ClipRange[] = [];
  const seriesValues = rawValues.map((vals) => {
    clipRanges.push({ startIndex: 0, endIndex: vals.length - 1 });
    if (vals.length < maxLen) {
      return [...vals, ...Array(maxLen - vals.length).fill(0)];
    }
    return vals;
  });

  return { totalWeeks: maxLen, seriesValues, clipRanges };
}

