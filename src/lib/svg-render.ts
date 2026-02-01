import { JSDOM } from 'jsdom';
import { API_BASE, MAX_CHUNK_DAYS, NPM_DOWNLOADS_EPOCH, COLORS } from './constants';
import { aggregateWeekly } from './data-transform';
import type { PackageChartData } from './data-transform';
import type { DailyDownload } from './npm-api';
import { transformForChart, styleXAxisLabelsServer, formatLogYAxisLabelsServer, injectWatermarkServer } from './chart-transform';

// --- Dark theme colors ---
export const DARK_BG = '#0d1117';
export const DARK_STROKE = '#e6edf3';
export const DARK_COLORS = ['#ff7b72', '#79c0ff', '#ffa657', '#7ee787', '#d2a8ff', '#ff9bce', '#76e4f7', '#ffc658'];

// --- npm API helpers (server-side, no cache) ---

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

async function fetchWithRetry(url: string, retries = 5): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) throw new Error(`404: ${url}`);
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        if (attempt === retries) throw new Error(`HTTP ${res.status} after ${retries} retries`);
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }
      if (attempt === retries) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (attempt === retries) throw e;
    }
    await sleep(500 * Math.pow(2, attempt));
  }
  throw new Error('Unreachable');
}

export async function fetchPackageServer(packageName: string): Promise<DailyDownload[]> {
  const end = new Date();
  const start = new Date(NPM_DOWNLOADS_EPOCH);
  const chunks = buildDateChunks(start, end);
  const allDownloads: DailyDownload[] = [];
  let failedChunks = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const url = `${API_BASE}/${chunk.start}:${chunk.end}/${encodeURIComponent(packageName)}`;
    try {
      const res = await fetchWithRetry(url);
      const data = await res.json();
      if (data.downloads) {
        allDownloads.push(...data.downloads);
      }
    } catch (e) {
      failedChunks++;
      console.error(`[svg-api] chunk ${i + 1}/${chunks.length} failed for ${packageName} (${chunk.start}:${chunk.end}): ${(e as Error).message}`);
    }
    if (i < chunks.length - 1) await sleep(250);
  }

  if (failedChunks > 0) {
    console.warn(`[svg-api] ${packageName}: ${failedChunks}/${chunks.length} chunks failed`);
  }

  return allDownloads;
}

// --- Fetch + aggregate multiple packages ---

export async function fetchAndPreparePackages(packageNames: string[]): Promise<PackageChartData[]> {
  const results = await Promise.all(
    packageNames.map(async (name, i) => {
      const daily = await fetchPackageServer(name);
      const weekly = aggregateWeekly(daily);
      return {
        packageName: name,
        color: COLORS[i % COLORS.length],
        data: weekly,
      } as PackageChartData;
    }),
  );
  return results.filter((r) => r.data.length > 0);
}

// --- SVG rendering with JSDOM + chart.xkcd ---

export async function renderChart(
  seriesData: PackageChartData[],
  options: { logScale: boolean; alignTimeline: boolean },
  theme: 'light' | 'dark',
  legendPosition: string,
  { showLegend = true }: { showLegend?: boolean } = {},
): Promise<string> {
  const { chartData, yTickCount, tickPositions, tickDisplayTexts } = transformForChart(seriesData, options);
  if (chartData.labels.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="440"><text x="360" y="220" text-anchor="middle" fill="#888">No data available</text></svg>';
  }

  const WIDTH = 800;
  const HEIGHT = 500;

  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="wrap"><svg class="chart"></svg></div></body></html>', {
    pretendToBeVisual: true,
  });
  const { document, SVGElement, HTMLElement: JSDOMHTMLElement } = dom.window;
  const svg = document.querySelector('svg')!;
  const wrap = document.getElementById('wrap')!;

  Object.defineProperty(wrap, 'clientWidth', { get: () => WIDTH });
  Object.defineProperty(wrap, 'clientHeight', { get: () => HEIGHT });

  if (!SVGElement.prototype.getComputedTextLength) {
    SVGElement.prototype.getComputedTextLength = function () {
      return (this.textContent?.length || 0) * 7;
    };
  }
  if (!SVGElement.prototype.getBBox) {
    SVGElement.prototype.getBBox = function () {
      return { x: 0, y: 0, width: (this.textContent?.length || 10) * 7, height: 16 };
    };
  }
  if (!SVGElement.prototype.createSVGPoint) {
    SVGElement.prototype.createSVGPoint = function () {
      return { x: 0, y: 0, matrixTransform: () => ({ x: 0, y: 0 }) };
    };
  }

  const origDoc = (globalThis as any).document;
  const origWin = (globalThis as any).window;
  (globalThis as any).document = document;
  (globalThis as any).window = dom.window;

  try {
    // @ts-expect-error chart.xkcd has no types
    const chartXkcd = (await import('chart.xkcd')).default;

    const isDark = theme === 'dark';
    const colors = isDark ? DARK_COLORS : COLORS;

    new chartXkcd.Line(svg, {
      title: 'npm history',
      xLabel: options.alignTimeline ? 'Timeline' : 'Date',
      yLabel: options.logScale ? 'Weekly Downloads (log)' : 'Weekly Downloads',
      data: chartData,
      options: {
        yTickCount,
        xTickCount: 6,
        legendPosition: chartXkcd.config.positionType[legendPosition] ?? chartXkcd.config.positionType.upLeft,
        dataColors: seriesData.map((_, i) => colors[i % colors.length]),
        showLegend,
        backgroundColor: isDark ? DARK_BG : 'white',
        strokeColor: isDark ? DARK_STROKE : 'black',
      },
    });

    styleXAxisLabelsServer(svg, tickPositions, tickDisplayTexts);
    if (options.logScale) {
      formatLogYAxisLabelsServer(svg);
    }
    injectWatermarkServer(svg, document, theme);

    let svgStr = svg.outerHTML;
    if (!svgStr.includes('xmlns=')) {
      svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    return svgStr;
  } finally {
    (globalThis as any).document = origDoc;
    (globalThis as any).window = origWin;
    dom.window.close();
  }
}
