# No chart.xkcd instance cleanup

**File**: `src/components/react/DownloadChart.tsx`

`svg.innerHTML = ''` destroys the DOM but doesn't clean up D3 transitions, event listeners, or timers from the previous chart.xkcd instance. Potential memory leak on rapid option toggling. chart.xkcd exposes no `.destroy()` method.
