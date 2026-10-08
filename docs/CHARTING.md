# Charts and the Highcharts licence

Charts use **Highcharts**, behind a typed abstraction in `src/charts/`.

## Licence

Highcharts is not free for every use. Its terms (https://www.highcharts.com/license) split into:

- **Non-commercial use**, governed by the Highsoft End-User License Agreement (https://www.highcharts.com/license-eula). This covers personal, educational and non-profit use.
- **Commercial use**, which needs a paid Highsoft licence.

Forma Analytics is a personal, non-commercial portfolio project, and it is used on that basis. The project owner chose to use Highcharts and is responsible for confirming that this use matches the licence terms. This repository does not contain a commercial Highcharts licence, and the MIT licence of the project code does not cover Highcharts. **If the app is ever used commercially or offered as a service, a commercial licence is required, or the chart layer must be swapped out as described below.**

The default "Highcharts.com" credits link is kept visible on every chart.

## How it is integrated

- `highcharts.ts` loads Highcharts, its accessibility, pattern-fill and heatmap modules with a dynamic `import()` on first use. Pages without charts never download it, and it is a separate lazy chunk (about 103 KB gzipped).
- `options.ts` turns normalized, typed props into Highcharts options. Business logic lives in `src/finance/` and never touches chart configuration.
- `HighchartsChart.tsx` creates the chart once, then calls `chart.update()` on data, filter, period or theme changes so charts animate between datasets instead of being recreated. A `ResizeObserver` reflows it on resize. Height is reserved up front, so loading causes no layout shift.
- `chartTheme.ts` reads the active theme's CSS custom properties (`--c1`..`--c8`, text and border tokens), so charts follow all six themes.
- Reduced motion turns Highcharts animation off.

## Accessibility

Series are distinguished by marker shape, dash style and stripe patterns as well as color. The Highcharts accessibility module provides keyboard navigation and screen reader descriptions (formatted with our currency and locale). Every chart sits in a card with a text summary and a data table alternative. Highcharts' hidden title heading is rendered as a plain element so heading order stays valid.

Charts use gradient columns, smooth spline and area-spline lines with ringed markers, a rounded interactive donut and a category-by-month heatmap with per-cell contrast-checked labels. The KPI sparklines are small dependency-free SVGs, since they are decorative.

`BarChart` (budget versus actual, goals) is a plain HTML/CSS component with visible numbers, which needs no charting library.

## Swapping Highcharts out

Only `HighchartsChart.tsx`, `options.ts`, `highcharts.ts`, `chartTheme.ts` and the donut in `index.tsx` know about Highcharts. Reimplement those against another library, keeping the prop types in `types.ts`, and no page needs to change.
