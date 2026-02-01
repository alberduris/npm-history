import { toPng } from 'html-to-image';
import type { PackageChartData } from './data-transform';
import type { UrlState } from './url-state';
import { buildHash } from './url-state';
import { SITE_URL } from './constants';

function buildFilename(packages: string[], ext: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `npm-history-${packages.join('-')}-${date}.${ext}`;
}

export async function exportAsPng(element: HTMLElement, packages: string[]): Promise<void> {
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  });
  const link = document.createElement('a');
  link.download = buildFilename(packages, 'png');
  link.href = dataUrl;
  link.click();
}

export function exportAsCsv(data: PackageChartData[], packages: string[]): void {
  const allDates = new Set<string>();
  data.forEach((pkg) => pkg.data.forEach((d) => allDates.add(d.weekStart)));
  const sorted = Array.from(allDates).sort();

  const header = ['Week', ...data.map((d) => d.packageName)].join(',');
  const rows = sorted.map((date) => {
    const values = data.map((pkg) => {
      const point = pkg.data.find((d) => d.weekStart === date);
      return point ? point.downloads : '';
    });
    return [date, ...values].join(',');
  });

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildFilename(packages, 'csv');
  link.click();
  URL.revokeObjectURL(url);
}

export function getShareUrl(state: UrlState): string {
  return `${SITE_URL}/${buildHash(state)}`;
}

export async function copyShareUrl(state: UrlState): Promise<void> {
  const url = getShareUrl(state);
  await navigator.clipboard.writeText(url);
}

export function getEmbedCode(state: UrlState): string {
  const hash = buildHash(state);
  return `<iframe style="width:100%;min-width:600px;height:800px;" src="${SITE_URL}/embed${hash}" frameBorder="0"></iframe>`;
}

export function getTwitterUrl(state: UrlState): string {
  const url = encodeURIComponent(getShareUrl(state));
  const text = encodeURIComponent(
    `npm download history for ${state.packages.join(', ')}`,
  );
  return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
}
