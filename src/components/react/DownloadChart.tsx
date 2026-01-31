import { useEffect, useRef, useState } from 'react';
import type { PackageChartData } from '../../lib/data-transform';
import { transformForChart, formatLogYAxisLabels, styleXAxisLabels } from '../../lib/chart-transform';

// @ts-expect-error chart.xkcd has no types
import chartXkcd from 'chart.xkcd';

interface Props {
  data: PackageChartData[];
  options: {
    logScale: boolean;
    alignTimeline: boolean;
  };
  chartRef?: React.RefObject<HTMLDivElement | null>;
}

const EMPTY_STATE_HEIGHT = 320;
const RESIZE_DEBOUNCE = 300;

export default function DownloadChart({ data, options, chartRef }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
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
        legendPosition: chartXkcd.config.positionType.upLeft,
        dataColors: data.map((d) => d.color),
        showLegend: true,
      },
    });

    // Style x-axis labels immediately (text content exists synchronously):
    // reformat tick labels to short display format, hide the rest.
    // Log Y-axis hack must wait for D3 transitions (~350ms).
    styleXAxisLabels(svg, tickPositions, tickDisplayTexts);

    if (options.logScale) {
      setTimeout(() => {
        if (svgRef.current) formatLogYAxisLabels(svgRef.current);
      }, 350);
    }
  }, [data, options, containerWidth, hasData]);

  return (
    <div ref={chartRef} className="bg-white rounded-lg">
      <div ref={containerRef} className="relative">
        {hasData ? (
          <svg ref={svgRef} />
        ) : (
          <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg" style={{ height: EMPTY_STATE_HEIGHT }}>
            <p className="text-gray-400 text-lg font-mono">
              Enter a package name to view download history
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
