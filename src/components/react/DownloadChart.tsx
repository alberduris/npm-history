import { useEffect, useRef, useState } from 'react';
import type { PackageChartData } from '../../lib/data-transform';
import { transformForChart, formatLogYAxisLabels, styleXAxisLabels, injectWatermark } from '../../lib/chart-transform';

// @ts-expect-error chart.xkcd has no types
import chartXkcd from 'chart.xkcd';

interface ChartOptions {
  logScale: boolean;
  alignTimeline: boolean;
}

interface Props {
  data: PackageChartData[];
  options: ChartOptions;
  onOptionsChange: (options: ChartOptions) => void;
  chartRef?: React.RefObject<HTMLDivElement | null>;
}

const CHART_ASPECT = '3/2'; // matches chart.xkcd: height = width * 2/3
const RESIZE_DEBOUNCE = 300;

type LegendPosition = 'upLeft' | 'downRight';

export default function DownloadChart({ data, options, onOptionsChange, chartRef }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [legendPosition, setLegendPosition] = useState<LegendPosition>('upLeft');
  const hasData = data.length > 0;

  // Responsive: track container width changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setContainerWidth(container.clientWidth);
      }, RESIZE_DEBOUNCE);
    });

    observer.observe(container);
    setContainerWidth(container.clientWidth);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  // Render chart
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !hasData || containerWidth === 0) return;

    svg.innerHTML = '';

    const { chartData, yTickCount, tickPositions, tickDisplayTexts } = transformForChart(data, options);

    if (chartData.labels.length === 0) return;

    new chartXkcd.Line(svg, {
      title: 'npm history',
      xLabel: options.alignTimeline ? 'Timeline' : 'Date',
      yLabel: options.logScale ? 'Weekly Downloads (log)' : 'Weekly Downloads',
      data: chartData,
      options: {
        yTickCount,
        xTickCount: 6,
        legendPosition: chartXkcd.config.positionType[legendPosition],
        dataColors: data.map((d) => d.color),
        showLegend: true,
      },
    });

    // Style x-axis labels immediately (text content exists synchronously):
    // reformat tick labels to short display format, hide the rest.
    // Log Y-axis hack must wait for D3 transitions (~350ms).
    styleXAxisLabels(svg, tickPositions, tickDisplayTexts);
    injectWatermark(svg);

    if (options.logScale) {
      setTimeout(() => {
        if (svgRef.current) formatLogYAxisLabels(svgRef.current);
      }, 350);
    }
  }, [data, options, containerWidth, hasData, legendPosition]);

  return (
    <div ref={chartRef} className="bg-white rounded-lg">
      {hasData && (
        <div className="flex items-center justify-between px-1 pb-1">
          <div className="flex flex-row items-center rounded leading-8 text-sm px-3 text-gray-600 select-none">
            <span className="mr-2">Legend</span>
            <label className="mr-2 cursor-pointer hover:opacity-80 flex items-center">
              <input
                className="mr-1 accent-gray-800"
                type="radio"
                name="legendPosition"
                checked={legendPosition === 'upLeft'}
                onChange={() => setLegendPosition('upLeft')}
              />
              Top left
            </label>
            <label className="cursor-pointer hover:opacity-80 flex items-center">
              <input
                className="mr-1 accent-gray-800"
                type="radio"
                name="legendPosition"
                checked={legendPosition === 'downRight'}
                onChange={() => setLegendPosition('downRight')}
              />
              Bottom right
            </label>
          </div>
          <div className="flex flex-row">
            <div
              className="flex flex-row items-center rounded leading-8 text-sm px-3 cursor-pointer text-gray-600 select-none hover:bg-gray-100"
              onClick={() => onOptionsChange({ ...options, logScale: !options.logScale })}
            >
              <input className="mr-2 accent-gray-800" type="checkbox" checked={options.logScale} readOnly />
              Log scale
            </div>
            <div
              className="flex flex-row items-center rounded leading-8 text-sm px-3 cursor-pointer text-gray-600 select-none hover:bg-gray-100"
              onClick={() => onOptionsChange({ ...options, alignTimeline: !options.alignTimeline })}
            >
              <input className="mr-2 accent-gray-800" type="checkbox" checked={options.alignTimeline} readOnly />
              Align timeline
            </div>
          </div>
        </div>
      )}
      <div ref={containerRef} className="relative">
        {hasData ? (
          <svg ref={svgRef} />
        ) : (
          <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg" style={{ aspectRatio: CHART_ASPECT, maxHeight: '100vh' }}>
            <p className="text-gray-400 text-lg font-mono">
              Enter a package name to view download history
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
