import { useState, useRef } from 'react';
import { MAX_PACKAGES, COLORS } from '../../lib/constants';

interface Props {
  packages: string[];
  loading: Set<string>;
  errors: Map<string, string>;
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  onRetry: (name: string) => void;
}

function extractPackageName(raw: string): string {
  const s = raw.trim().toLowerCase();
  // Match npmjs.com URLs: https://www.npmjs.com/package/react or npmjs.com/package/@scope/name
  const match = s.match(/(?:https?:\/\/)?(?:www\.)?npmjs\.com\/package\/((?:@[^/]+\/)?[^/?#]+)/);
  if (match) return match[1];
  return s;
}

export default function PackageInput({ packages, loading, errors, onAdd, onRemove, onRetry }: Props) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = extractPackageName(input);
    if (!name || packages.includes(name) || packages.length >= MAX_PACKAGES) return;
    onAdd(name);
    setInput('');
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={packages.length > 0 ? "...add next package" : "react or npmjs.com/package/react or https://www.npmjs.com/package/react"}
          className="flex-1 px-4 py-2.5 border-2 border-gray-800 rounded-lg font-mono text-sm
                     focus:outline-none focus:border-blue-500 bg-white"
        />
        <button
          type="submit"
          disabled={!input.trim() || packages.length >= MAX_PACKAGES}
          className="px-5 py-2.5 bg-gray-900 text-white rounded-lg font-semibold text-sm
                     hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          View download history
        </button>
      </form>

      {packages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {packages.map((pkg, i) => (
            <span
              key={pkg}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border-2"
              style={{
                borderColor: COLORS[i % COLORS.length],
                color: COLORS[i % COLORS.length],
              }}
            >
              {loading.has(pkg) && (
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              {pkg}
              {errors.has(pkg) && (
                <button
                  onClick={() => onRetry(pkg)}
                  title={`${errors.get(pkg)} \u2014 click to retry`}
                  className="text-red-500 hover:text-red-700 cursor-pointer transition-colors"
                  aria-label={`Retry ${pkg}`}
                >
                  !
                </button>
              )}
              <button
                onClick={() => onRemove(pkg)}
                className="ml-0.5 hover:opacity-60 cursor-pointer"
                aria-label={`Remove ${pkg}`}
              >
                &times;
              </button>
            </span>
          ))}
          {packages.length > 1 && (
            <button
              onClick={() => packages.forEach(onRemove)}
              className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
