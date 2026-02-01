import type { APIRoute } from 'astro';
import { fetchAndPreparePackages, renderChart } from '../../lib/svg-render';

export const prerender = false;

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
  const logScale = url.searchParams.get('log') === 'true';
  const alignTimeline = url.searchParams.get('align') === 'true';

  try {
    const validResults = await fetchAndPreparePackages(packageNames);
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
