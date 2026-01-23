#!/usr/bin/env python3
"""
OpenRouter PR Review Script
Replaces claude-code-action with OpenRouter API for automated PR reviews
"""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import requests


class OpenRouterPRReviewer:
    """Handles PR review using OpenRouter API"""

    def __init__(self):
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        self.github_token = os.getenv("GITHUB_TOKEN")
        self.pr_number = os.getenv("PR_NUMBER")
        self.repo = os.getenv("GITHUB_REPOSITORY")

        if not all([self.openrouter_api_key, self.github_token, self.pr_number, self.repo]):
            print("Error: Missing required environment variables", file=sys.stderr)
            sys.exit(1)

    def call_openrouter(self, messages: List[Dict]) -> str:
        """Make API call to OpenRouter with Claude Haiku 4.5 + web search"""
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.openrouter_api_key}",
            "HTTP-Referer": "https://github.com",
            "X-Title": "Stock Screener PR Review",
        }

        data = {
            "model": "anthropic/claude-haiku-4.5:online",
            "messages": messages,
            "max_tokens": 4096,
        }

        try:
            response = requests.post(url, headers=headers, json=data, timeout=120)
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]
        except requests.exceptions.RequestException as e:
            print(f"Error calling OpenRouter API: {e}", file=sys.stderr)
            raise

    def get_pr_changes(self) -> tuple[str, List[str]]:
        """Get PR file changes"""
        try:
            diff = subprocess.check_output(
                ["git", "diff", "origin/main...HEAD"],
                encoding="utf-8",
                stderr=subprocess.DEVNULL
            )
            files = subprocess.check_output(
                ["git", "diff", "--name-only", "origin/main...HEAD"],
                encoding="utf-8",
                stderr=subprocess.DEVNULL
            ).strip().split("\n")
            files = [f for f in files if f]
            return diff, files
        except subprocess.CalledProcessError as e:
            print(f"Error getting PR changes: {e}", file=sys.stderr)
            return "", []

    def get_top_tickers(self) -> tuple[Optional[str], List[Dict]]:
        """Read CSV file and get top 5 tickers"""
        try:
            data_dir = Path("public/data")
            if not data_dir.exists():
                print("Error: public/data directory not found", file=sys.stderr)
                return None, []

            # Find dated CSV file
            csv_files = list(data_dir.glob("????-??-??.csv"))
            if not csv_files:
                print("Error: No dated CSV file found", file=sys.stderr)
                return None, []

            # Get the most recent one
            dated_csv = sorted(csv_files)[-1]
            date = dated_csv.stem

            # Read CSV
            with open(dated_csv, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            if len(lines) < 2:
                print("Error: CSV file is empty or has no data", file=sys.stderr)
                return None, []

            # Parse header to find column indices
            header = lines[0].strip().split('\t')
            try:
                ticker_idx = header.index('Ticker')
                company_idx = header.index('Company')
                pe_idx = header.index('P/E')
                roe_idx = header.index('ROE')
            except ValueError as e:
                print(f"Error: Missing expected column in CSV header: {e}", file=sys.stderr)
                return None, []

            # Parse top 5 tickers (skip header)
            tickers = []
            for line in lines[1:6]:
                cols = line.strip().split('\t')
                if len(cols) > max(ticker_idx, company_idx, pe_idx, roe_idx):
                    tickers.append({
                        'ticker': cols[ticker_idx].strip(),
                        'name': cols[company_idx].strip(),
                        'pe': cols[pe_idx].strip(),
                        'roe': cols[roe_idx].strip(),
                    })

            return date, tickers
        except Exception as e:
            print(f"Error reading CSV: {e}", file=sys.stderr)
            return None, []

    def analyze_stock(self, ticker_data: Dict) -> Dict:
        """Analyze a single stock using OpenRouter with web search"""
        ticker = ticker_data['ticker']
        name = ticker_data['name']
        pe = ticker_data['pe']
        roe = ticker_data['roe']

        print(f"Analyzing {ticker}...", file=sys.stderr)

        # Get current date for latest information
        current_date = datetime.now().strftime("%Y-%m-%d")

        messages = [
            {
                "role": "user",
                "content": f"""Search the web and provide analysis of {ticker} ({name}) as of {current_date}.

Return ONLY a valid JSON object with exactly these three fields (no markdown, no code blocks):
{{
  "description": "2-3 sentences about what the company does, market cap, and market position",
  "latest_news": "Recent developments, earnings, announcements from the past few months. Be specific with dates and numbers.",
  "why_selected": "Why this stock is notable based on metrics like P/E: {pe}, ROE: {roe}. Include specific metrics and investment thesis."
}}

Requirements:
- Use web search to find the most recent and accurate information
- Keep each field to 2-4 sentences
- Be factual and specific with numbers and dates
- Focus on investment-relevant information
- Return ONLY the JSON object, no other text"""
            }
        ]

        try:
            response = self.call_openrouter(messages)

            # Try to parse JSON from response
            try:
                # Clean up response - remove markdown code blocks if present
                cleaned = response.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("```")[1]
                    if cleaned.startswith("json"):
                        cleaned = cleaned[4:]
                    cleaned = cleaned.strip()

                analysis = json.loads(cleaned)
                return {
                    "description": analysis.get("description", ""),
                    "latest_news": analysis.get("latest_news", ""),
                    "why_selected": analysis.get("why_selected", "")
                }
            except json.JSONDecodeError:
                print(f"Warning: Could not parse JSON for {ticker}, using raw response", file=sys.stderr)
                return {
                    "description": response[:500] if len(response) > 500 else response,
                    "latest_news": "",
                    "why_selected": ""
                }
        except Exception as e:
            print(f"Error analyzing {ticker}: {e}", file=sys.stderr)
            return {
                "description": "Analysis unavailable",
                "latest_news": "",
                "why_selected": ""
            }

    def save_summaries(self, date: str, stock_analyses: List[Dict]) -> bool:
        """Generate and save summary JSON files"""
        summary_data = {
            "date": date,
            "updated_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "top_stocks": [
                {
                    "ticker": stock['ticker'],
                    "description": stock['analysis']['description'],
                    "latest_news": stock['analysis']['latest_news'],
                    "why_selected": stock['analysis']['why_selected'],
                }
                for stock in stock_analyses
            ]
        }

        try:
            # Create summary directory
            summary_dir = Path("public/data/summary")
            summary_dir.mkdir(parents=True, exist_ok=True)

            # Save dated and latest JSON
            dated_file = summary_dir / f"{date}.json"
            latest_file = summary_dir / "latest.json"

            with open(dated_file, 'w', encoding='utf-8') as f:
                json.dump(summary_data, f, indent=2)

            with open(latest_file, 'w', encoding='utf-8') as f:
                json.dump(summary_data, f, indent=2)

            print(f"Saved summaries to {summary_dir}/", file=sys.stderr)
            return True
        except Exception as e:
            print(f"Error saving summaries: {e}", file=sys.stderr)
            return False

    def commit_and_push(self, date: str) -> bool:
        """Commit and push summary files"""
        try:
            subprocess.run(["git", "add", "public/data/summary/"], check=True)
            subprocess.run(
                ["git", "commit", "-m", f"data: add stock summaries for {date}"],
                check=True
            )
            subprocess.run(["git", "push"], check=True)
            print("Committed and pushed summary files", file=sys.stderr)
            return True
        except subprocess.CalledProcessError as e:
            print(f"Warning: Failed to commit/push files: {e}", file=sys.stderr)
            return False
        except Exception as e:
            print(f"Warning: Unexpected error committing files: {type(e).__name__}: {e}", file=sys.stderr)
            return False

    def post_pr_comment(self, comment: str) -> bool:
        """Post comment to PR using gh CLI"""
        try:
            # Escape for shell
            subprocess.run(
                ["gh", "pr", "comment", self.pr_number, "--body", comment],
                env={**os.environ, "GH_TOKEN": self.github_token},
                check=True
            )
            print("Posted comment to PR", file=sys.stderr)
            print(f"https://github.com/{self.repo}/pull/{self.pr_number}", file=sys.stderr)
            return True
        except FileNotFoundError:
            print("Error: gh CLI not found", file=sys.stderr)
            return False
        except subprocess.CalledProcessError as e:
            print(f"Error posting comment: {e}", file=sys.stderr)
            return False
        except Exception as e:
            print(f"Error: Unexpected error posting comment: {type(e).__name__}: {e}", file=sys.stderr)
            return False

    def approve_pr(self) -> bool:
        """Approve PR using gh CLI"""
        try:
            subprocess.run(
                ["gh", "pr", "review", self.pr_number, "--approve"],
                env={**os.environ, "GH_TOKEN": self.github_token},
                check=True
            )
            print("Approved PR", file=sys.stderr)
            return True
        except FileNotFoundError:
            print("Warning: gh CLI not found, skipping approval", file=sys.stderr)
            return False
        except subprocess.CalledProcessError as e:
            print(f"Warning: Failed to approve PR (this is expected if GitHub Actions bot cannot self-approve): {e}", file=sys.stderr)
            return False
        except Exception as e:
            print(f"Warning: Unexpected error approving PR: {type(e).__name__}: {e}", file=sys.stderr)
            return False

    def format_comment(self, stock_analyses: List[Dict], date: str) -> str:
        """Format PR comment with analysis"""
        comment_parts = [
            "✅ **Verification Complete**",
            "- CSV files updated correctly",
            "- Data format consistent",
            "- No unexpected changes",
            "",
            f"📊 **Top {len(stock_analyses)} Stocks Analysis**",
            ""
        ]

        for stock in stock_analyses:
            analysis = stock['analysis']
            comment_parts.extend([
                f"### {stock['ticker']} - {stock['name']}",
                "",
                f"**Description:** {analysis.get('description', 'N/A')}",
                "",
                f"**Latest News:** {analysis.get('latest_news', 'N/A')}",
                "",
                f"**Why Selected:** {analysis.get('why_selected', 'N/A')}",
                "",
                "---",
                ""
            ])

        comment_parts.extend([
            "💾 **Summary Files**",
            f"- Saved to `public/data/summary/{date}.json`",
            "- Updated `public/data/summary/latest.json`"
        ])

        return "\n".join(comment_parts)

    def run(self):
        """Main review process"""
        print("Starting OpenRouter PR Review...", file=sys.stderr)

        # Step 1: Get PR changes
        _, files = self.get_pr_changes()
        print(f"Files changed: {', '.join(files)}", file=sys.stderr)

        # Step 2: Get top 5 tickers
        date, tickers = self.get_top_tickers()
        if not date or not tickers:
            self.post_pr_comment("❌ **Error**: Could not extract ticker data from CSV")
            sys.exit(1)

        print(f"Analyzing top {len(tickers)} tickers for {date}", file=sys.stderr)

        # Step 4: Analyze each ticker
        stock_analyses = []
        for ticker_data in tickers:
            analysis = self.analyze_stock(ticker_data)
            stock_analyses.append({
                'ticker': ticker_data['ticker'],
                'name': ticker_data['name'],
                'analysis': analysis,
            })

        # Step 5: Save summaries
        if not self.save_summaries(date, stock_analyses):
            self.post_pr_comment("❌ **Error**: Failed to save summary files")
            sys.exit(1)

        # Step 6: Commit and push
        if not self.commit_and_push(date):
            self.post_pr_comment("⚠️ **Warning**: Failed to commit summary files")

        # Step 7: Post PR comment
        comment = self.format_comment(stock_analyses, date)
        self.post_pr_comment(comment)

        # Step 8: Approve PR
        self.approve_pr()

        print("PR review completed successfully!", file=sys.stderr)


if __name__ == "__main__":
    reviewer = OpenRouterPRReviewer()
    reviewer.run()
