# Charting library decision

**Decision:** Forma Analytics renders its charts with its own dependency-free SVG components in `src/charts/`. Highcharts is not included.

## Why not Highcharts

Highcharts is the preferred library in the project brief, but it is not free for every use. Its free tier covers personal, educational and non-profit use, and anything else needs a commercial licence. This is a public repository and a public GitHub Pages deployment that doubles as a professional portfolio piece. Permission for that exact use has not been confirmed, and public availability or an educational motivation is not a licence. Until written confirmation exists, no Highcharts code or assets are distributed in this repository or in the deployed build.

## What was built instead

- Typed components that take normalized data: `LineChart`, `AreaChart`, `ColumnChart`, `BarChart`, `DonutChart` and `FinancialTrendChart`. All of them except `BarChart` and `DonutChart` are thin wrappers over `CartesianChart`.
- Business logic lives in `src/finance/` and never touches chart configuration. The chart components know nothing about transactions or budgets.
- Charts respond to theme changes (they use the `--c1`..`--c8` CSS tokens), data changes, filters and resizing (`ResizeObserver`).
- Accessibility is built in. Series differ by marker shape, dash style and fill pattern as well as colour. There is a keyboard-operable tooltip (arrow keys), a live-region readout, and every chart card has a data table alternative and a text summary.
- No library means no extra bundle weight: the whole chart layer is a few kilobytes.

## Switching to Highcharts later

If a licence is confirmed, reimplement the exported components in `src/charts/index.tsx` and `CartesianChart.tsx` against Highcharts, keeping the prop types in `src/charts/types.ts`. Load Highcharts with a dynamic `import()` so it stays out of the initial bundle. No page needs to change.
