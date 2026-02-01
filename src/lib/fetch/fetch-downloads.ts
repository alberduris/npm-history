import { API_BASE, MAX_CHUNK_DAYS, CHUNK_DELAY_MS, NPM_DOWNLOADS_EPOCH } from '../constants';
import type { DailyDownload, ChunkMeta, FetchResult } from './types';
import { PackageNotFoundError } from './types';

// --- Helpers ---

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Chunking ---

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

// --- Retry with exponential backoff ---

async function fetchWithRetry(
  url: string,
  retries = 5,
  signal?: AbortSignal,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, signal ? { signal } : undefined);
      if (res.status === 404) throw new PackageNotFoundError(url);
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        if (attempt === retries) throw new Error(`HTTP ${res.status} after ${retries} retries`);
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }
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

// --- Main orchestrator ---

export async function fetchAllChunks(
  packageName: string,
  options?: {
    signal?: AbortSignal;
    onProgress?: (loaded: number, total: number) => void;
  },
): Promise<FetchResult> {
  const end = new Date();
  const start = new Date(NPM_DOWNLOADS_EPOCH);
  const chunks = buildDateChunks(start, end);
  const allDownloads: DailyDownload[] = [];
  const chunkMetas: ChunkMeta[] = [];

  for (let i = 0; i < chunks.length; i++) {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const chunk = chunks[i];
    const url = `${API_BASE}/${chunk.start}:${chunk.end}/${encodeURIComponent(packageName)}`;

    try {
      const res = await fetchWithRetry(url, 5, options?.signal);
      const data = await res.json();
      if (data.downloads) {
        allDownloads.push(...data.downloads);
      }
      chunkMetas.push({ start: chunk.start, end: chunk.end, status: 'success' });
    } catch (e) {
      if (e instanceof PackageNotFoundError) throw e;
      if ((e as Error).name === 'AbortError') throw e;
      chunkMetas.push({ start: chunk.start, end: chunk.end, status: 'failed' });
    }

    options?.onProgress?.(i + 1, chunks.length);
    if (i < chunks.length - 1) await sleep(CHUNK_DELAY_MS);
  }

  const complete = chunkMetas.every((c) => c.status === 'success');

  return {
    packageName,
    downloads: allDownloads,
    chunks: chunkMetas,
    complete,
  };
}
