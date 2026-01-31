export interface UrlState {
  packages: string[];
  logScale: boolean;
  alignTimeline: boolean;
}

export function parseHash(hash: string): UrlState {
  const raw = hash.replace(/^#/, '');
  if (!raw) return { packages: [], logScale: false, alignTimeline: false };

  const parts = raw.split('!');
  const packagesPart = parts[0];
  const optionsParts = parts.slice(1);

  const packages = packagesPart
    .split('&')
    .map((s) => decodeURIComponent(s.trim()))
    .filter(Boolean);

  return {
    packages,
    logScale: optionsParts.includes('log'),
    alignTimeline: optionsParts.includes('align'),
  };
}

export function buildHash(state: UrlState): string {
  if (state.packages.length === 0) return '';
  const parts: string[] = [];
  parts.push(state.packages.map((p) => encodeURIComponent(p)).join('&'));
  if (state.logScale) parts.push('log');
  if (state.alignTimeline) parts.push('align');
  return '#' + parts.join('!');
}

export function subscribeToHashChange(callback: (state: UrlState) => void): () => void {
  const handler = () => callback(parseHash(window.location.hash));
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}
