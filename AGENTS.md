# Repository Guidelines

This guide summarizes the expectations for contributing to the Stock Screener React + Vite project. Follow these practices to keep pull requests small, reviewable, and production-ready.

## Project Structure & Module Organization
- `src/application` wires domain use cases to presentation-specific hooks, while `src/domain` captures pure business logic and calculable rules.
- UI layers live under `src/presentation` with views, widgets, and theming helpers; share cross-cutting utilities through `src/shared`.
- Data mocks and CSV helpers sit in `src/data`, and scenario-focused specs live inside `src/test` (co-located component specs may also use `*.test.jsx`).
- Static assets belong in `public/`; built artifacts publish to `dist/` after `vite build`. Tooling lives in `vite.config.js` and `vitest.config.js`.

## Build, Test, and Development Commands
- `npm install` or `make install`: install dependencies (Node 22+ required).
- `npm run dev` / `make dev`: start the Vite dev server on port 8000.
- `npm run build` or `make build`: produce an optimized bundle in `dist/`.
- `npm run preview`: serve the production bundle locally for smoke tests.
- `npm run lint` and `npm run lint:fix`: run ESLint on `src/` (JS/JSX) and optionally auto-fix safe issues.
- `npm test`, `npm run test:coverage`, or `npm run test -- --run`: execute Vitest suites, optionally collecting coverage or running in CI mode.

## Coding Style & Naming Conventions
- Use modern ES modules, React function components, and two-space indentation (see `src/main.jsx`).
- Components and hooks follow `PascalCase` and `useCamelCase`; utilities/functions use `camelCase`; constants are `UPPER_SNAKE_CASE`.
- Prefer declarative React patterns, Emotion/MUI styling, and avoid inline CSS except for dynamic tweaks.
- ESLint (with React, Hooks, Refresh plugins) is the source of truth; run `npm run lint` before submitting code.

## Testing Guidelines
- Vitest with React Testing Library provides DOM assertions; keep specs deterministic, mocking network/data-grid calls via fixtures in `src/test`.
- Name files `ComponentName.test.jsx` or `domainRule.test.js` near the code under test when practical.
- New features should include coverage for critical branches and edge cases; rely on `npm run test:coverage` to ensure regressions are caught.

## Commit & Pull Request Guidelines
- Follow short, prefixed commit subjects modeled after the history (`feat:`, `fix:`, `docs:`, `upt:`). Use imperative mood and keep body lines wrapped at ~72 chars when extra context is needed.
- Every PR requires: summary of changes, linked issues (`Fixes #123`), validation notes (`npm run lint`, `npm test`, `npm run build`), and UI screenshots/GIFs when altering visuals.
- GitHub Action `PR Checks` runs lint, tests, and build for both PRs and pushes to `main`; ensure the same commands pass locally before requesting review.

## Local Quality Checklist
- Run `npm run lint`, `npm test -- --run`, and `npm run build` (or the available `make lint` / `make build` shortcuts) before marking a task complete.
- Use `make check` when unsure about required files—it validates critical project paths and datasets.
- Apply `npm run lint:fix` followed by `make format` if you touch large JSX trees; prettier covers `src/**/*.{js,jsx}`.

## Security & Configuration Tips
- Never commit secrets; reference environment variables via `.env.local` loaded by Vite. Document new env keys in README when adding them.
- Validate third-party data before rendering grid rows or charts to avoid runtime errors and untrusted HTML injection.
