import { useState } from 'react';
import type { PackageChartData } from '../../lib/data-transform';
import type { UrlState } from '../../lib/url-state';
import { exportAsPng, exportAsCsv, copyShareUrl, getEmbedCode, getTwitterUrl } from '../../lib/export';

interface Props {
  chartRef: React.RefObject<HTMLDivElement | null>;
  data: PackageChartData[];
  urlState: UrlState;
  hasData: boolean;
}

export default function ExportBar({ chartRef, data, urlState, hasData }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!hasData) return null;

  function showCopied(label: string) {
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  const packages = data.map((d) => d.packageName);

  async function handlePng() {
    if (!chartRef.current) return;
    await exportAsPng(chartRef.current, packages);
  }

  function handleCsv() {
    exportAsCsv(data, packages);
  }

  async function handleLink() {
    await copyShareUrl(urlState);
    showCopied('Link');
  }

  async function handleEmbed() {
    const code = getEmbedCode(urlState);
    await navigator.clipboard.writeText(code);
    showCopied('Embed');
  }

  function handleTwitter() {
    window.open(getTwitterUrl(urlState), '_blank');
  }

  const btnClass =
    'ml-2 mb-2 rounded-[.25rem] leading-9 text-sm px-3 cursor-pointer border border-gray-300 text-gray-800 bg-gray-100 hover:bg-gray-200';

  return (
    <div className="flex flex-row flex-wrap justify-end items-center mt-8 mb-2">
      <button onClick={handlePng} className={btnClass}>
        <svg className="inline -mt-px mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Image
      </button>
      <button onClick={handleCsv} className={btnClass}>
        <svg className="inline -mt-px mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        CSV
      </button>
      <button onClick={handleEmbed} className={btnClass}>
        <svg className="inline -mt-px mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        {copied === 'Embed' ? 'Copied!' : 'Embed'}
      </button>
      <button onClick={handleLink} className={btnClass}>
        <svg className="inline -mt-px mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        {copied === 'Link' ? 'Copied!' : 'Link'}
      </button>
      <button onClick={handleTwitter} className={btnClass}>
        <svg className="inline -mt-px mr-1" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        Share on X
      </button>
    </div>
  );
}
