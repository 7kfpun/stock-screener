# CLAUDE.md

Quick guardrails for assistants working in this repo.

## Project
- Vite-powered React UI (`src/presentation/views/AppView.jsx`) plus a legacy static build (`legacy/`).
- CSV assets live under `public/data`; `latest.csv` is the default dataset with dated snapshots alongside.
- Domain/data/application layers now exist: `src/domain/stock/`, `src/data/csvStockRepository.js`, and `src/application/useStockData.js`.

## UI Entry Points
- Presentation components live in `src/presentation/components/` (Heatmap/Table/Tooltip).
- The plain DataTables implementation remains under `legacy/`; touch only if you intend to keep the non-React path working.
- Shared formatters sit in `src/shared/formatters.js`; reuse instead of inventing new ones.

## Workflow Notes
- Keep datasets tab-delimited and in sync with the column configs before pushing.
- When adjusting columns, update both React tables and any dependent formatters.
- Stay concise in replies; surface risks and trade-offs before proposing large refactors.
