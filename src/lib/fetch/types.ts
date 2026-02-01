export interface DailyDownload {
  day: string;
  downloads: number;
}

export interface ChunkMeta {
  start: string;
  end: string;
  status: 'success' | 'failed';
}

/** Result of fetching all download chunks for a single package */
export interface FetchResult {
  packageName: string;
  downloads: DailyDownload[];
  chunks: ChunkMeta[];
  /** true only when every chunk succeeded */
  complete: boolean;
}

export class PackageNotFoundError extends Error {
  constructor(pkg: string) {
    super(`Package not found: ${pkg}`);
    this.name = 'PackageNotFoundError';
  }
}
