# setTimeout race condition in log DOM hack

**File**: `src/components/react/DownloadChart.tsx`

If user toggles log→normal within 350ms, the scheduled `formatLogYAxisLabels` fires on a non-log chart and corrupts Y-axis labels (`parseFloat("2M") = 2`, replaces "2M" with "2").

**Fix**: Store `timeoutId` in a ref, `clearTimeout` at start of each useEffect run.
