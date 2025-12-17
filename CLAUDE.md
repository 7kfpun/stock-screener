# CLAUDE.md

Guidelines for assistants collaborating on the Stock Screener project.

## Project Snapshot
- React 18 + Vite entry in `src/main.jsx` mounting `src/presentation/views/AppView.jsx`.
- Clean layering: domain rules in `src/domain/stock/`, persistence in `src/data/csvStockRepository.js`, coordination hooks in `src/application/useStockData.js`.
- Data ships as CSVs in `public/data` (`latest.csv` + dated snapshots); builds emit to `dist/` via `vite build`.

## High-Signal Paths
- UI widgets live under `src/presentation/components/` (Table, Heatmap, DatePickerPopover, StockDetailPanel, Tooltips) and feed the page-level view in `src/presentation/views/`.
- Shared helpers are in `src/shared/` (`formatters.js`, `analytics.js`); keep new logic centralized there when broadly useful.
- Tests use Vitest: component specs sit next to components (`*.test.jsx`), domain assertions in `src/domain/stock/Stock.test.js`, and shared utilities rely on `src/test/setup.js`.
- `Makefile` wraps install/dev/build/lint/format/check flows—use it for repeatable local automation.

## Workflow Notes
- Require Node 22+. Start work with `npm install` followed by `npm run dev` (or `make dev`).
- Before opening a PR, run `npm run lint`, `npm test -- --run`, and `npm run build`; the `PR Checks` workflow executes the same trio on pushes and pull requests to `main`.
- Update `README.md` and `AGENTS.md` if you change commands, structure, or contributor expectations to keep docs in sync.
- When modifying dataset schemas, update formatters, grid column definitions, and any CSV documentation in `README.md`.

## Response Style
- Think aloud but stay concise: outline a plan, describe the files you touch, and summarize risks or open questions before shipping a fix.
- Prefer concrete references (file paths, commands, component names) over abstract descriptions.
- Call out trade-offs (performance, DX, data accuracy) whenever proposing non-trivial changes or refactors.
