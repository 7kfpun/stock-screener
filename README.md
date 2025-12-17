# Stock Screener

React + Vite UI for viewing daily stock snapshots with powerful filtering and visualization.

## Features

- 📊 **Dual Views**: Table view for detailed data, Heatmap view for visual analysis
- 📅 **Date Picker**: Calendar-based date selection with clickable month/year navigation
- 🎨 **Theme Support**: Auto-detect system theme (dark/light) or manual toggle
- 🔍 **Search**: Real-time filtering across all stock data
- 📈 **Rich Metrics**: Market cap, P/E, ROE, growth rates, and custom investor scores
- 🌍 **Country Flags**: Visual country indicators for international stocks
- 📱 **Responsive Design**: Mobile-friendly Material-UI components

## Quick Start

### Prerequisites
- Node.js >= 22.0.0
- npm (comes with Node.js)

### Development
```bash
npm install
npm run dev
```
Open `http://localhost:8000/stock-screener/` to explore the app.

### Production Build
```bash
npm run build
npm run preview
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production bundle
- `npm run preview` - Preview production build
- `npm test` - Run unit tests with Vitest
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate test coverage report
- `npm run lint` - Lint code with ESLint
- `npm run lint:fix` - Auto-fix linting issues

## Makefile Shortcuts

Use the provided `Makefile` for repeatable workflows:

- `make install` - Run `npm install`
- `make dev` / `make serve` - Launch the Vite dev server on port 8000
- `make build` - Build for production
- `make preview` - Preview the `dist/` output
- `make lint` - Lint JavaScript/JSX sources
- `make format` - Format `src/**/*.{js,jsx}` with Prettier (if installed)
- `make check` - Validate required files, datasets, and directories exist
- `make clean` - Remove build artifacts and cached assets

## Project Structure

```
src/
├── domain/          # Business logic and models
│   └── stock/       # Stock domain entities
├── data/            # Data access layer
├── application/     # Application services & hooks
├── presentation/    # React components & views
│   ├── components/  # Reusable UI components
│   └── views/       # Page-level views
├── shared/          # Utilities and shared code
└── test/            # Test setup and utilities
```

## Data

CSV assets live under `public/data`:
- `latest.csv` - Most recent stock data
- `YYYY-MM-DD.csv` - Historical snapshots

## Development

### Code Quality
- **Linting**: ESLint with React hooks and refresh plugins
- **Pre-commit**: Husky + lint-staged for automatic linting
- **Testing**: Vitest + React Testing Library
- **Guides**: See `AGENTS.md` for contributor workflow expectations and `CLAUDE.md` for assistant-specific guardrails.
- **CI/CD**: `PR Checks` (`.github/workflows/pr-checks.yml`) runs lint, tests, and build on every PR and push to `main`.

### Git Hooks
Pre-commit hooks automatically:
- Lint and auto-fix staged files
- Ensure code quality before commits

## Contributing
- Review [`AGENTS.md`](./AGENTS.md) before opening a pull request and update it when workflows, commands, or structure change.
- Assistants collaborating via LLM tooling should read [`CLAUDE.md`](./CLAUDE.md) to match the expected tone and triage process.
- Validate changes locally with `npm run lint`, `npm test -- --run`, and `npm run build` (or the equivalent Make targets) so the `PR Checks` workflow passes on the first try.
- Keep `public/data`, grid columns, and formatters in sync whenever you adjust CSV schemas or add derived metrics; document notable data changes in this README.
- Include UI screenshots or short clips plus linked issues (e.g., `Fixes #123`) in every pull request description.

## Deployment

Automatically deployed to GitHub Pages on push to `main` branch.

## Tech Stack

- **Framework**: React 18 + Vite 5
- **UI Library**: Material-UI (MUI) v7
- **Date Handling**: Day.js + MUI Date Pickers
- **Testing**: Vitest + Testing Library
- **Linting**: ESLint
- **Analytics**: Google Analytics integration
