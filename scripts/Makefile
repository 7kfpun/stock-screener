.PHONY: help install test run clean

help:
	@echo "Available commands:"
	@echo "  make install    - Install Python dependencies"
	@echo "  make test       - Run tests"
	@echo "  make run        - Run stock screener and save to today's CSV"
	@echo "  make clean      - Remove Python cache files"

install:
	pip install -r requirements.txt

test:
	pytest test_fin.py -v

run:
	@TODAY=$$(date -u +%Y-%m-%d); \
	python3 fin.py > ../public/data/$$TODAY.csv && \
	cp ../public/data/$$TODAY.csv ../public/data/latest.csv && \
	echo "Stock data saved to public/data/$$TODAY.csv and public/data/latest.csv"

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf .pytest_cache 2>/dev/null || true
