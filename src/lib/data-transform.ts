import type { DailyDownload } from './fetch';

export interface WeeklyDataPoint {
  weekStart: string;
  downloads: number;
}

export interface PackageChartData {
  packageName: string;
  color: string;
  data: WeeklyDataPoint[];
}

function toUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

function getMondayUtc(dateStr: string): string {
  const d = toUtcDate(dateStr);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return d.toISOString().split('T')[0];
}

function addUtcDays(dateStr: string, days: number): string {
  const d = toUtcDate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

export function aggregateWeekly(daily: DailyDownload[]): WeeklyDataPoint[] {
  const weeks = new Map<string, { downloads: number; days: number }>();
  let latestDay = '';
  for (const { day, downloads } of daily) {
    const weekStart = getMondayUtc(day);
    const entry = weeks.get(weekStart) ?? { downloads: 0, days: 0 };
    entry.downloads += downloads;
    entry.days += 1;
    weeks.set(weekStart, entry);
    if (!latestDay || day > latestDay) latestDay = day;
  }

  if (!latestDay) return [];

  const lastWeekStart = getMondayUtc(latestDay);
  const lastWeekEnd = addUtcDays(lastWeekStart, 6);
  const dropLastWeek = latestDay < lastWeekEnd;

  return Array.from(weeks.entries())
    .filter(([weekStart, entry]) => {
      if (entry.downloads <= 0) return false;
      if (dropLastWeek && weekStart === lastWeekStart) return false;
      return true;
    })
    .map(([weekStart, entry]) => ({ weekStart, downloads: entry.downloads }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}
