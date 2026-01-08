#!/usr/bin/env python3
"""Generate a summary of the first 5 tickers using Claude."""
import csv
import os
import sys
from anthropic import Anthropic

def main():
    if len(sys.argv) < 2:
        print("Usage: generate_ticker_summary.py <csv_file>", file=sys.stderr)
        sys.exit(1)

    csv_file = sys.argv[1]
    api_key = os.environ.get('ANTHROPIC_API_KEY')

    if not api_key:
        print("Error: ANTHROPIC_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

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
                    'market_cap': row['Market Cap']
                })
    except Exception as e:
        print(f"Error reading CSV: {e}", file=sys.stderr)
        sys.exit(1)

    if not tickers:
        print("No tickers found in CSV", file=sys.stderr)
        sys.exit(1)

    # Build ticker info string
    ticker_info = "\n".join([
        f"- {t['ticker']} ({t['company']}) - {t['sector']}, {t['country']}, P/E: {t['pe']}"
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

Format your response as:
- **TICKER**: Brief description here
- **TICKER**: Brief description here

Keep it concise and informative."""
            }]
        )

        # Extract text content
        description = message.content[0].text.strip()
        print(description)

    except Exception as e:
        print(f"Error calling Claude API: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
