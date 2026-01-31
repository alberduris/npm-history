import { useState, useEffect, useRef, useCallback } from 'react';
import PackageInput from './PackageInput';
import DownloadChart from './DownloadChart';
import ExportBar from './ExportBar';
import EmbedBlock from './EmbedBlock';
import SponsorBanner from './SponsorBanner';
import LoadingState from './LoadingState';
import { fetchPackageDownloads, PackageNotFoundError } from '../../lib/npm-api';
import { aggregateWeekly } from '../../lib/data-transform';
import type { PackageChartData } from '../../lib/data-transform';
import { COLORS } from '../../lib/constants';
import { parseHash, buildHash, subscribeToHashChange } from '../../lib/url-state';

export default function ChartApp() {
  const [packages, setPackages] = useState<string[]>([]);
  const [chartData, setChartData] = useState<Map<string, PackageChartData>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [options, setOptions] = useState({ logScale: false, alignTimeline: false });
  const [fetchProgress, setFetchProgress] = useState<{ pkg: string; loaded: number; total: number } | null>(null);

  const chartRef = useRef<HTMLDivElement>(null);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Initialize from URL hash
  useEffect(() => {
    const state = parseHash(window.location.hash);
    if (state.packages.length > 0) {
      setPackages(state.packages);
      setOptions({ logScale: state.logScale, alignTimeline: state.alignTimeline });
    }
    return subscribeToHashChange((state) => {
      setPackages(state.packages);
      setOptions({ logScale: state.logScale, alignTimeline: state.alignTimeline });
    });
  }, []);

  // Update URL hash when state changes
  useEffect(() => {
    const hash = buildHash({ packages, ...options });
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash || window.location.pathname);
    }
  }, [packages, options]);

  // Fetch data when packages change
  const fetchPackage = useCallback(async (name: string, colorIndex: number) => {
    // Abort any existing fetch
    abortControllers.current.get(name)?.abort();
    const controller = new AbortController();
    abortControllers.current.set(name, controller);

    setLoading((prev) => new Set(prev).add(name));
    setErrors((prev) => { const n = new Map(prev); n.delete(name); return n; });

    try {
      const result = await fetchPackageDownloads(name, controller.signal, (loaded, total) => {
        setFetchProgress({ pkg: name, loaded, total });
      });
      const weekly = aggregateWeekly(result.downloads);
      const color = COLORS[colorIndex % COLORS.length];
      setChartData((prev) => new Map(prev).set(name, { packageName: name, color, data: weekly }));
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      const msg = e instanceof PackageNotFoundError ? 'Package not found' : 'Failed to fetch';
      setErrors((prev) => new Map(prev).set(name, msg));
    } finally {
      setLoading((prev) => { const n = new Set(prev); n.delete(name); return n; });
      abortControllers.current.delete(name);
    }
  }, []);

  // Trigger fetches for packages without data
  useEffect(() => {
    packages.forEach((pkg, i) => {
      if (!chartData.has(pkg) && !loading.has(pkg)) {
        fetchPackage(pkg, i);
      }
    });
    // Clean up data for removed packages
    setChartData((prev) => {
      const next = new Map(prev);
      for (const key of next.keys()) {
        if (!packages.includes(key)) next.delete(key);
      }
      return next;
    });
  }, [packages, fetchPackage]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAdd(name: string) {
    setPackages((prev) => [...prev, name]);
  }

  function handleRemove(name: string) {
    abortControllers.current.get(name)?.abort();
    setPackages((prev) => prev.filter((p) => p !== name));
  }

  const visibleData = Array.from(chartData.values()).filter((d) => packages.includes(d.packageName));
  // Re-assign colors based on current order
  const orderedData = visibleData.map((d) => ({
    ...d,
    color: COLORS[packages.indexOf(d.packageName) % COLORS.length],
  }));

  const urlState = { packages, logScale: options.logScale, alignTimeline: options.alignTimeline };

  return (
    <div className="space-y-4">
      <PackageInput
        packages={packages}
        loading={loading}
        errors={errors}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />

      {loading.size > 0 && fetchProgress && (
        <LoadingState
          loaded={fetchProgress.loaded}
          total={fetchProgress.total}
          packageName={fetchProgress.pkg}
        />
      )}

      <DownloadChart data={orderedData} options={options} onOptionsChange={setOptions} chartRef={chartRef} />

      <ExportBar chartRef={chartRef} data={orderedData} urlState={urlState} hasData={orderedData.length > 0} />

      <EmbedBlock urlState={urlState} hasData={orderedData.length > 0} />

      {orderedData.length > 0 && <SponsorBanner />}
    </div>
  );
}
