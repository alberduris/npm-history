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

  async function handlePng() {
    if (!chartRef.current) return;
    await exportAsPng(chartRef.current);
  }

  function handleCsv() {
    exportAsCsv(data);
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
    'px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={handlePng} className={btnClass}>
        PNG
      </button>
      <button onClick={handleCsv} className={btnClass}>
        CSV
      </button>
      <button onClick={handleLink} className={btnClass}>
        {copied === 'Link' ? 'Copied!' : 'Link'}
      </button>
      <button onClick={handleEmbed} className={btnClass}>
        {copied === 'Embed' ? 'Copied!' : 'Embed'}
      </button>
      <button onClick={handleTwitter} className={btnClass}>
        Share on 𝕏
      </button>
    </div>
  );
}
