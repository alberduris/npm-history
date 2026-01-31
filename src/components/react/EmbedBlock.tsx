import { useState } from 'react';
import { SITE_URL } from '../../lib/constants';
import { buildHash } from '../../lib/url-state';
import type { UrlState } from '../../lib/url-state';

interface Props {
  urlState: UrlState;
  hasData: boolean;
}

function getSvgUrl(packages: string[], theme?: 'dark'): string {
  const params = new URLSearchParams();
  params.set('packages', packages.join(','));
  params.set('type', 'date');
  if (theme) params.set('theme', theme);
  return `${SITE_URL}/api/svg?${params.toString()}`;
}

function getSiteUrl(state: UrlState): string {
  return `${SITE_URL}/${buildHash(state)}`;
}

function getMarkdownSimple(packages: string[], state: UrlState): string {
  const svgUrl = getSvgUrl(packages);
  const siteUrl = getSiteUrl(state);
  return `## npm History\n\n[![npm History Chart](${svgUrl})](${siteUrl})`;
}

function getMarkdownDark(packages: string[], state: UrlState): string {
  const lightUrl = getSvgUrl(packages);
  const darkUrl = getSvgUrl(packages, 'dark');
  const siteUrl = getSiteUrl(state);
  return `## npm History

<a href="${siteUrl}">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="${darkUrl}" />
   <source media="(prefers-color-scheme: light)" srcset="${lightUrl}" />
   <img alt="npm History Chart" src="${lightUrl}" />
 </picture>
</a>`;
}

export default function EmbedBlock({ urlState, hasData }: Props) {
  const [copied, setCopied] = useState(false);

  if (!hasData) return null;

  const { packages } = urlState;
  const markdownSimple = getMarkdownSimple(packages, urlState);
  const markdownDark = getMarkdownDark(packages, urlState);

  const introText = packages.length === 1
    ? `📈 Show download history for ${packages[0]} on your README.md with the following code`
    : '📈 Show download history on your repository\'s README.md with the following code';

  async function handleCopyLight() {
    await navigator.clipboard.writeText(markdownSimple);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopyDark() {
    await navigator.clipboard.writeText(markdownDark);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="w-full flex flex-col justify-start items-center">
      <p className="leading-8 mb-3">
        {introText} (
        <a
          className="font-mono underline text-blue-500 hover:opacity-80"
          href="https://github.com/alberduris/npm-history?tab=readme-ov-file"
          target="_blank"
          rel="noopener noreferrer"
        >
          example
        </a>
        ):
      </p>
      <div className="w-full bg-gray-100 text-gray-800 rounded-md shadow">
        <pre className="w-full p-4 font-mono break-all whitespace-pre-wrap text-sm">
          {markdownSimple}
        </pre>
        <div className="flex">
          <button
            className="text-center py-4 bg-green-600 text-white font-mono rounded-bl-md cursor-pointer hover:bg-green-700"
            style={{ width: '70%' }}
            onClick={handleCopyLight}
          >
            {copied ? 'Copied!' : 'Copy to GitHub README.md'}
          </button>
          <div className="bg-gray-100" style={{ width: '1px' }} />
          <button
            className="text-center py-4 bg-gray-200 text-gray-800 font-mono rounded-br-md cursor-pointer hover:bg-gray-300"
            style={{ width: '30%', minWidth: 'max-content' }}
            onClick={handleCopyDark}
          >
            (dark theme supported)
          </button>
        </div>
      </div>
    </div>
  );
}
