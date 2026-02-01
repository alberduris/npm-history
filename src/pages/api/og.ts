import type { APIRoute } from 'astro';
import { ImageResponse } from '@vercel/og';

export const prerender = false;

const DEFAULT_PACKAGES = 'react,vue,svelte';
const COLORS = ['#e74c3c', '#3498db', '#f5a623', '#2ecc71', '#9b59b6', '#ff6b9d', '#00bcd4', '#ff9800'];

async function fetchChartSvg(baseUrl: string, packages: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    const res = await fetch(`${baseUrl}/api/svg?packages=${packages}&theme=dark`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const packagesParam = url.searchParams.get('packages');
  const packages = packagesParam
    ? packagesParam.split(',').map((p) => p.trim()).filter(Boolean).slice(0, 8)
    : [];

  const chartPackages = packages.length > 0 ? packages.join(',') : DEFAULT_PACKAGES;
  const displayPackages = packages.length > 0 ? packages : DEFAULT_PACKAGES.split(',');

  // Self-fetch the SVG chart
  const baseUrl = url.origin;
  const svgText = await fetchChartSvg(baseUrl, chartPackages);
  const svgDataUri = svgText
    ? `data:image/svg+xml;base64,${Buffer.from(svgText).toString('base64')}`
    : null;

  const html = {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0d1117',
        fontFamily: 'system-ui, sans-serif',
        padding: '0',
      },
      children: [
        // Top bar with branding
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 40px',
              backgroundColor: '#363636',
            },
            children: [
              // Logo + name
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          width: '36px',
                          height: '36px',
                          backgroundColor: '#1a1a1a',
                          borderRadius: '6px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          fontFamily: 'monospace',
                        },
                        children: 'npm',
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: '28px',
                          fontWeight: 'bold',
                          color: 'white',
                          letterSpacing: '-0.5px',
                        },
                        children: 'npm-history',
                      },
                    },
                  ],
                },
              },
              // Package pills
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    gap: '10px',
                  },
                  children: displayPackages.map((pkg: string, i: number) => ({
                    type: 'div',
                    props: {
                      style: {
                        padding: '4px 16px',
                        borderRadius: '999px',
                        border: `2px solid ${COLORS[i % 8]}`,
                        color: COLORS[i % 8],
                        fontSize: '16px',
                        fontFamily: 'monospace',
                        fontWeight: '600',
                      },
                      children: pkg,
                    },
                  })),
                },
              },
            ],
          },
        },
        // Chart area
        svgDataUri
          ? {
              type: 'img',
              props: {
                src: svgDataUri,
                width: 1200,
                height: 540,
                style: {
                  width: '100%',
                  flex: '1',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                },
              },
            }
          : {
              type: 'div',
              props: {
                style: {
                  flex: '1',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#737373',
                  fontSize: '24px',
                },
                children: 'npm-history.com',
              },
            },
      ],
    },
  };

  return new ImageResponse(html, {
    width: 1200,
    height: 630,
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
};
