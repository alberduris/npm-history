import type { DailyDownload } from './npm-api';

export interface WeeklyDataPoint {
  weekStart: string;
  downloads: number;
}

export interface PackageChartData {
  packageName: string;
  color: string;
  data: WeeklyDataPoint[];
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function aggregateWeekly(daily: DailyDownload[]): WeeklyDataPoint[] {
  const weeks = new Map<string, number>();
  for (const { day, downloads } of daily) {
    const weekStart = getMonday(day);
    weeks.set(weekStart, (weeks.get(weekStart) || 0) + downloads);
  }
  return Array.from(weeks.entries())
    .filter(([, downloads]) => downloads > 0)
    .map(([weekStart, downloads]) => ({ weekStart, downloads }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

