# Chart robustness testing

Untested data scenarios from the original spec. Each needs manual verification.

## Package count extremes
- **Single package**: 1 line, legend with 1 entry. All features should work.
- **8 packages (max)**: 8 lines, 8 legend entries, 8 colors. Legend must not overflow chart area.
- **8 packages, all similar values**: overlapping lines, only tooltip distinguishes them.

## Time range extremes
- **Zero date overlap**: e.g. package A 2015-2018, package B 2023-2026. Line drops to 0 between ranges.
- **Very disparate ranges**: lodash (2015) + brand-new package (2 weeks). Align mode is where this matters.
- **Brand new package**: 1-2 data points only. Chart should render a dot/short segment.

## Scale extremes
- **Giant vs tiny**: react (40M/week) + my-lib (50/week). Linear: tiny is flat at bottom. Log: both visible.
- **Zero to hero**: package goes from 10/week to 5M/week. Log scale useful here.

## Option combinations
All 4 combos of `{logScale, alignTimeline}` need verification — especially log + align together.

## Export
- **PNG export** via html-to-image: untested. Font embedding, DOM-hacked labels, colors.
- **CSV export**: untested but likely works (operates on raw data, not chart).
