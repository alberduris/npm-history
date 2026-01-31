# SVG position heuristics for DOM hacks are fragile

**File**: `src/lib/chart-transform.ts`

Y-axis detection uses `relX < svgRect.width * 0.15 && relY < svgRect.height * 0.9`. X-axis detection uses `relY > svgRect.height * 0.9`. These ratios work for current SVG dimensions (~928x619) but could fail if chart.xkcd generates different proportions. A more robust approach would inspect actual D3 scale objects or axis group classes.
