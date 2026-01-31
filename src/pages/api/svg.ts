import type { APIRoute } from 'astro';
import { JSDOM } from 'jsdom';
import { API_BASE, MAX_CHUNK_DAYS, NPM_DOWNLOADS_EPOCH, COLORS } from '../../lib/constants';
import { aggregateWeekly } from '../../lib/data-transform';
import type { PackageChartData } from '../../lib/data-transform';
import type { DailyDownload } from '../../lib/npm-api';
import { transformForChart, styleXAxisLabelsServer, formatLogYAxisLabelsServer, injectWatermarkServer } from '../../lib/chart-transform';

export const prerender = false;

// --- Dark theme colors ---
const DARK_BG = '#0d1117';
const DARK_STROKE = '#e6edf3';
const DARK_COLORS = ['#ff7b72', '#79c0ff', '#ffa657', '#7ee787', '#d2a8ff', '#ff9bce', '#76e4f7', '#ffc658'];

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
        // Rate limited or server error — always retry
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

async function fetchPackageServer(packageName: string): Promise<DailyDownload[]> {
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

// --- SVG rendering with JSDOM + chart.xkcd ---

async function renderChart(
  seriesData: PackageChartData[],
  options: { logScale: boolean; alignTimeline: boolean },
  theme: 'light' | 'dark',
  legendPosition: string,
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

  // Mock clientWidth/clientHeight on the wrapper — chart.xkcd reads parentNode.clientWidth
  Object.defineProperty(wrap, 'clientWidth', { get: () => WIDTH });
  Object.defineProperty(wrap, 'clientHeight', { get: () => HEIGHT });

  // Polyfill SVG layout APIs that JSDOM doesn't implement
  // chart.xkcd + D3 need these for text measurement and element positioning
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

  // chart.xkcd needs a global document/window context
  const origDoc = (globalThis as any).document;
  const origWin = (globalThis as any).window;
  (globalThis as any).document = document;
  (globalThis as any).window = dom.window;

  try {
    // Dynamic import to ensure it picks up our globals
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
        showLegend: true,
        backgroundColor: isDark ? DARK_BG : 'white',
        strokeColor: isDark ? DARK_STROKE : 'black',
      },
    });

    // Apply the same DOM hacks as the client (server-safe versions)
    styleXAxisLabelsServer(svg, tickPositions, tickDisplayTexts);
    if (options.logScale) {
      formatLogYAxisLabelsServer(svg);
    }
    injectWatermarkServer(svg, document, theme);

    // Extract SVG and add xmlns
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

// --- API Route ---

export const GET: APIRoute = async ({ url }) => {
  const packagesParam = url.searchParams.get('packages');
  if (!packagesParam) {
    return new Response('Missing "packages" query parameter', { status: 400 });
  }

  const packageNames = packagesParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 8);
  if (packageNames.length === 0) {
    return new Response('No valid package names provided', { status: 400 });
  }

  const theme = (url.searchParams.get('theme') === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
  const legendPosition = url.searchParams.get('legend') ?? 'upLeft';

  // Parse options from type param (to mirror star-history URL style)
  const logScale = url.searchParams.get('log') === 'true';
  const alignTimeline = url.searchParams.get('align') === 'true';

  try {
    // Fetch all packages in parallel
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

    const validResults = results.filter((r) => r.data.length > 0);
    if (validResults.length === 0) {
      return new Response('No download data found for the specified packages', { status: 404 });
    }

    const svgString = await renderChart(
      validResults,
      { logScale, alignTimeline },
      theme,
      legendPosition,
    );

    return new Response(svgString, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    return new Response(message, { status: 500 });
  }
};
