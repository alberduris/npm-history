import { API_BASE, MAX_CHUNK_DAYS, CHUNK_DELAY_MS, NPM_DOWNLOADS_EPOCH } from './constants';

export interface DailyDownload {
  day: string;
  downloads: number;
}

export interface PackageDownloads {
  package: string;
  downloads: DailyDownload[];
}

const cache = new Map<string, PackageDownloads>();

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function buildDateChunks(start: Date, end: Date): { start: string; end: string }[] {
  const chunks: { start: string; end: string }[] = [];
  const current = new Date(start);
  while (current < end) {
    const chunkEnd = new Date(current);
    chunkEnd.setDate(chunkEnd.getDate() + MAX_CHUNK_DAYS - 1);
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());
    chunks.push({ start: formatDate(current), end: formatDate(chunkEnd) });
    current.setTime(chunkEnd.getTime());
    current.setDate(current.getDate() + 1);
  }
  return chunks;
}

async function fetchWithRetry(
  url: string,
  retries = 3,
  signal?: AbortSignal,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal });
      if (res.status === 404) throw new PackageNotFoundError(url);
      if (res.ok) return res;
      if (attempt === retries) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (e instanceof PackageNotFoundError) throw e;
      if (signal?.aborted) throw e;
      if (attempt === retries) throw e;
    }
    await sleep(500 * Math.pow(2, attempt));
  }
  throw new Error('Unreachable');
}

export class PackageNotFoundError extends Error {
  constructor(pkg: string) {
    super(`Package not found: ${pkg}`);
    this.name = 'PackageNotFoundError';
  }
}

export async function fetchPackageDownloads(
  packageName: string,
  signal?: AbortSignal,
  onProgress?: (loaded: number, total: number) => void,
): Promise<PackageDownloads> {
  const cacheKey = packageName;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const end = new Date();
  const start = new Date(NPM_DOWNLOADS_EPOCH);

  const chunks = buildDateChunks(start, end);
  const allDownloads: DailyDownload[] = [];

  for (let i = 0; i < chunks.length; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const chunk = chunks[i];
    const url = `${API_BASE}/${chunk.start}:${chunk.end}/${encodeURIComponent(packageName)}`;
    try {
      const res = await fetchWithRetry(url, 3, signal);
      const data = await res.json();
      if (data.downloads) {
        allDownloads.push(...data.downloads);
      }
    } catch (e) {
      if (e instanceof PackageNotFoundError) throw e;
      if ((e as Error).name === 'AbortError') throw e;
      // Skip failed chunk, continue
    }
    onProgress?.(i + 1, chunks.length);
    if (i < chunks.length - 1) await sleep(CHUNK_DELAY_MS);
  }

  const result: PackageDownloads = {
    package: packageName,
    downloads: allDownloads,
  };
  cache.set(cacheKey, result);
  return result;
}
