import { JSDOM } from 'jsdom';
import { COLORS } from './constants';
import { aggregateWeekly } from './data-transform';
import type { PackageChartData } from './data-transform';
import { fetchAllChunks } from './fetch';
import { transformForChart, styleXAxisLabelsServer, formatLogYAxisLabelsServer, injectWatermarkServer } from './chart-transform';

// --- Dark theme colors ---
export const DARK_BG = '#0d1117';
export const DARK_STROKE = '#e6edf3';
export const DARK_COLORS = ['#ff7b72', '#79c0ff', '#ffa657', '#7ee787', '#d2a8ff', '#ff9bce', '#76e4f7', '#ffc658'];

// --- Fetch + aggregate multiple packages ---

export async function fetchAndPreparePackages(
  packageNames: string[],
): Promise<{ data: PackageChartData[]; allComplete: boolean }> {
  let allComplete = true;

  const results = await Promise.all(
    packageNames.map(async (name, i) => {
      const result = await fetchAllChunks(name);

      if (!result.complete) {
        allComplete = false;
        const failed = result.chunks.filter((c) => c.status === 'failed').length;
        console.warn(`[svg-api] ${name}: ${failed}/${result.chunks.length} chunks failed`);
        return null;
      }

      const weekly = aggregateWeekly(result.downloads);
      return {
        packageName: name,
        color: COLORS[i % COLORS.length],
        data: weekly,
      } as PackageChartData;
    }),
  );

  const data = results.filter((r): r is PackageChartData => r !== null && r.data.length > 0);
  return { data, allComplete };
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
  const HEIGHT = 530;

  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="wrap"><svg class="chart"></svg></div></body></html>', {
    pretendToBeVisual: true,
  });
  const { document, SVGElement } = dom.window;
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
