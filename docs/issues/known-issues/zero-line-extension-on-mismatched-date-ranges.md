# Zero-line extension when comparing packages with different start dates

## Symptom

When comparing two packages where one has data from 2015 and another is more recent (e.g. released in 2020), the newer package's line extends back to 2015 as a flat line at y=0. This is visually misleading — it suggests the package existed but had zero downloads, when in reality it didn't exist yet.

## Root cause

`buildUnifiedTimeline()` in `src/lib/chart/transform.ts` creates a shared x-axis spanning the full date range of ALL packages. For weeks before a package's first data point, it fills with `0`. chart.xkcd renders these zeros as a visible line segment along the x-axis.

## Why NaN doesn't work

Attempted replacing `0` with `NaN` for pre-data and post-data gaps. Result: chart.xkcd breaks the entire path (not just the gap segment) and renders literal "NaN" in tooltips. chart.xkcd doesn't use D3's `line.defined()` internally, so there's no built-in sparse data support.

## Constraint

chart.xkcd requires all datasets to have the same length as the labels array. No null/undefined/NaN support. Dense rectangular data matrix required.

## Explored options

1. **Post-process SVG** — DOM-hack the rendered paths to clip zero-prefix segments. Project already has `dom-client.ts` / `dom-server.ts` for post-render hacks. Feasible but non-trivial (need to identify which path points correspond to the zero-fill region).
2. **Monkey-patch chart.xkcd's D3 line generator** — inject `.defined(d => !isNaN(d))` before render, then use NaN. Fragile, depends on chart.xkcd internals.
3. **Trim timeline to latest package's start** — loses early data from the older package.
4. **Accept as-is** — current state.
