.PHONY: serve dev build preview install help clean lint format check test-scripts run-screener install-scripts

help:
	@echo "Stock Screener (React + Vite) - Available commands:"
	@echo ""
	@echo "Frontend:"
	@echo "  make install        - Install npm dependencies"
	@echo "  make dev            - Start development server (alias: make serve)"
	@echo "  make serve          - Start development server on port 8000"
	@echo "  make build          - Build for production"
	@echo "  make preview        - Preview production build"
	@echo "  make lint           - Lint JavaScript/JSX files"
	@echo "  make format         - Format code (requires prettier)"
	@echo "  make check          - Check for common issues"
	@echo "  make clean          - Remove temporary files and build artifacts"
	@echo ""
	@echo "Python Scripts:"
	@echo "  make install-scripts - Install Python dependencies"
	@echo "  make test-scripts    - Run Python tests"
	@echo "  make run-screener    - Run stock screener and save data"

install:
	@echo "Installing npm dependencies..."
	@npm install

dev:
	@echo "Starting Vite development server at http://localhost:8000"
	@echo "Press Ctrl+C to stop"
	@npm run dev

serve: dev

build:
	@echo "Building for production..."
	@npm run build

preview:
	@echo "Previewing production build..."
	@npm run preview

lint:
	@echo "Linting JavaScript/JSX files..."
	@npm run lint

format:
	@if command -v npx >/dev/null 2>&1; then \
		echo "Formatting code..."; \
		npx prettier --write "src/**/*.{js,jsx}" || echo "prettier not configured, skipping"; \
	else \
		echo "npx not found. Install Node.js to enable formatting."; \
	fi

check:
	@echo "Checking project files..."
	@test -f package.json && echo "✓ package.json exists" || echo "✗ package.json missing"
	@test -f vite.config.js && echo "✓ vite.config.js exists" || echo "✗ vite.config.js missing"
	@test -f index.html && echo "✓ index.html exists" || echo "✗ index.html missing"
	@test -d src && echo "✓ src directory exists" || echo "✗ src directory missing"
	@test -f src/App.jsx && echo "✓ src/App.jsx exists" || echo "✗ src/App.jsx missing"
	@test -f src/main.jsx && echo "✓ src/main.jsx exists" || echo "✗ src/main.jsx missing"
	@test -d src/components && echo "✓ src/components directory exists" || echo "✗ src/components missing"
	@test -d src/utils && echo "✓ src/utils directory exists" || echo "✗ src/utils missing"
	@test -d public/data && echo "✓ public/data directory exists" || echo "✗ public/data directory missing"
	@test -f public/data/latest.csv && echo "✓ public/data/latest.csv exists" || echo "✗ public/data/latest.csv missing"
	@test -d node_modules && echo "✓ node_modules installed" || echo "✗ node_modules missing (run: make install)"
	@echo "Check complete!"

clean:
	@echo "Cleaning temporary files and build artifacts..."
	@find . -name ".DS_Store" -type f -delete
	@rm -rf dist
	@rm -rf node_modules/.vite
	@find scripts -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find scripts -type f -name "*.pyc" -delete 2>/dev/null || true
	@rm -rf scripts/.pytest_cache 2>/dev/null || true
	@echo "Clean complete!"

install-scripts:
	@echo "Installing Python dependencies..."
	@pip install -r scripts/requirements.txt

test-scripts:
	@echo "Running Python tests..."
	@cd scripts && pytest test_fin.py -v

run-screener:
	@echo "Running stock screener..."
	@TODAY=$$(date -u +%Y-%m-%d); \
	python3 scripts/fin.py > public/data/$$TODAY.csv && \
	cp public/data/$$TODAY.csv public/data/latest.csv && \
	(grep -q "^$$TODAY$$" public/data/dates.csv || echo "$$TODAY" >> public/data/dates.csv) && \
	echo "✓ Stock data saved to public/data/$$TODAY.csv and public/data/latest.csv"
