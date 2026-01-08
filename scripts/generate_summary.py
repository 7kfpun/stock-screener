#!/usr/bin/env python3
"""Generate a summary of the first 5 tickers and save to public/data/summary.json"""
import csv
import json
import os
import sys
from datetime import datetime
from anthropic import Anthropic

def main():
    if len(sys.argv) < 2:
        print("Usage: generate_summary.py <csv_file>", file=sys.stderr)
        sys.exit(1)

    csv_file = sys.argv[1]
    api_key = os.environ.get('ANTHROPIC_API_KEY') or os.environ.get('CLAUDE_CODE_OAUTH_TOKEN')

    if not api_key:
        print("Error: ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN environment variable not set", file=sys.stderr)
        sys.exit(1)

    # Extract date from CSV filename (e.g., "public/data/2026-01-07.csv" -> "2026-01-07")
    csv_basename = os.path.basename(csv_file)
    file_date = csv_basename.replace('.csv', '')

    # Read first 5 tickers from CSV
    tickers = []
    try:
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f, delimiter='\t')
            for i, row in enumerate(reader):
                if i >= 5:
                    break
                tickers.append({
                    'ticker': row['Ticker'],
                    'company': row['Company'],
                    'sector': row['Sector'],
                    'country': row['Country'],
                    'pe': row['P/E'],
                    'market_cap': row['Market Cap'],
                    'price': row['Price'],
                    'change': row['Change']
                })
    except Exception as e:
        print(f"Error reading CSV: {e}", file=sys.stderr)
        sys.exit(1)

    if not tickers:
        print("No tickers found in CSV", file=sys.stderr)
        sys.exit(1)

    # Build ticker info string
    ticker_info = "\n".join([
        f"- {t['ticker']} ({t['company']}) - {t['sector']}, {t['country']}, P/E: {t['pe']}, Price: {t['price']}"
        for t in tickers
    ])

    # Call Claude API
    try:
        client = Anthropic(api_key=api_key)

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": f"""Provide a 1-sentence description (max 15 words) for each of these stocks. Focus on what makes them notable or their primary business.

{ticker_info}

Return ONLY a JSON array with this exact format (no other text):
[
  {{"ticker": "TICKER", "description": "Brief description here"}},
  ...
]"""
            }]
        )

        # Extract text content and parse JSON
        response_text = message.content[0].text.strip()

        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            lines = response_text.split('\n')
            response_text = '\n'.join(lines[1:-1])

        descriptions = json.loads(response_text)

        # Build final summary
        summary = {
            'date': file_date,
            'updated_at': datetime.now().isoformat(),
            'top_stocks': [
                {
                    **tickers[i],
                    'description': desc['description']
                }
                for i, desc in enumerate(descriptions[:5])
            ]
        }

        # Save to dated file and latest file
        os.makedirs('public/data/summary', exist_ok=True)

        # Save dated summary
        dated_file = f'public/data/summary/{file_date}.json'
        with open(dated_file, 'w') as f:
            json.dump(summary, f, indent=2)
        print(f"Dated summary saved to {dated_file}")

        # Save as latest summary
        latest_file = 'public/data/summary/latest.json'
        with open(latest_file, 'w') as f:
            json.dump(summary, f, indent=2)
        print(f"Latest summary saved to {latest_file}")

    except Exception as e:
        print(f"Error calling Claude API or saving file: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
