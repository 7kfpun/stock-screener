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
- **CI/CD**: GitHub Actions for PR checks and deployment

### Git Hooks
Pre-commit hooks automatically:
- Lint and auto-fix staged files
- Ensure code quality before commits

## Deployment

Automatically deployed to GitHub Pages on push to `main` branch.

## Tech Stack

- **Framework**: React 18 + Vite 5
- **UI Library**: Material-UI (MUI) v7
- **Date Handling**: Day.js + MUI Date Pickers
- **Testing**: Vitest + Testing Library
- **Linting**: ESLint
- **Analytics**: Google Analytics integration
