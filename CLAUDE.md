# CLAUDE.md

Quick guardrails for assistants working in this repo.

## Project
- Vite-powered React UI (`src/App.jsx`) plus a legacy static build (`legacy/`).
- CSV data lives in `public/data`; `latest.csv` is the default dataset with dated snapshots alongside.
- `src/utils/dataLoader.js` fetches tab-delimited CSV, normalizes it, and feeds the React views.

## UI Entry Points
- React table/heatmap views sit in `src/components/TableView.jsx` and `src/components/HeatmapView.jsx`.
- The plain DataTables implementation now lives under `legacy/`; touch only if you intend to keep the non-React path working.
- Shared formatters are in `src/utils/formatters.js`; reuse instead of inventing new ones.

## Workflow Notes
- Keep datasets tab-delimited and in sync with the column configs before pushing.
- When adjusting columns, update both React tables and any dependent formatters.
- Stay concise in replies; surface risks and trade-offs before proposing large refactors.
