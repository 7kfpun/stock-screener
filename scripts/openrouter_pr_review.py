#!/usr/bin/env python3
"""
OpenRouter PR Review Script
Replaces claude-code-action with OpenRouter API for automated PR reviews
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
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

    @staticmethod
    def clean_citations(text: str) -> str:
        """Remove citation tags from LLM response"""
        # Remove <cite index="...">...</cite> tags but keep the content
        text = re.sub(r'<cite[^>]*>(.*?)</cite>', r'\1', text)
        # Remove any remaining standalone cite tags
        text = re.sub(r'</?cite[^>]*>', '', text)
        return text.strip()

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
            "response_format": {
                "type": "json_object"
            },
            "plugins": [
                {
                    "id": "response-healing"
                }
            ]
        }

        try:
            response = requests.post(url, headers=headers, json=data, timeout=120)
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]
        except requests.exceptions.RequestException as e:
            print(f"Error calling OpenRouter API: {e}", file=sys.stderr)
            raise

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
                peg_idx = header.index('PEG')
                roe_idx = header.index('ROE')
                roic_idx = header.index('ROIC')
                profit_m_idx = header.index('Profit M')
                eps_this_y_idx = header.index('EPS This Y')
                eps_next_y_idx = header.index('EPS Next Y')
                eps_next_5y_idx = header.index('EPS Next 5Y')
                market_cap_idx = header.index('Market Cap')
                investor_score_idx = header.index('Investor_Score')
                sma50_idx = header.index('SMA50')
                sma200_idx = header.index('SMA200')
                high_52w_idx = header.index('52W High')
                low_52w_idx = header.index('52W Low')
            except ValueError as e:
                print(f"Error: Missing expected column in CSV header: {e}", file=sys.stderr)
                return None, []

            # Parse top 5 tickers (skip header)
            tickers = []
            for line in lines[1:6]:
                cols = line.strip().split('\t')
                if len(cols) > max(ticker_idx, company_idx, pe_idx, peg_idx, roe_idx,
                                   roic_idx, profit_m_idx, eps_this_y_idx, eps_next_y_idx,
                                   eps_next_5y_idx, market_cap_idx, investor_score_idx,
                                   sma50_idx, sma200_idx, high_52w_idx, low_52w_idx):
                    tickers.append({
                        'ticker': cols[ticker_idx].strip(),
                        'name': cols[company_idx].strip(),
                        'pe': cols[pe_idx].strip(),
                        'peg': cols[peg_idx].strip(),
                        'roe': cols[roe_idx].strip(),
                        'roic': cols[roic_idx].strip(),
                        'profit_margin': cols[profit_m_idx].strip(),
                        'eps_this_y': cols[eps_this_y_idx].strip(),
                        'eps_next_y': cols[eps_next_y_idx].strip(),
                        'eps_next_5y': cols[eps_next_5y_idx].strip(),
                        'market_cap': cols[market_cap_idx].strip(),
                        'investor_score': cols[investor_score_idx].strip(),
                        'sma50': cols[sma50_idx].strip(),
                        'sma200': cols[sma200_idx].strip(),
                        'high_52w': cols[high_52w_idx].strip(),
                        'low_52w': cols[low_52w_idx].strip(),
                    })

            return date, tickers
        except Exception as e:
            print(f"Error reading CSV: {e}", file=sys.stderr)
            return None, []

    def analyze_stock(self, ticker_data: Dict) -> Dict:
        """Analyze a single stock using OpenRouter with web search"""
        ticker = ticker_data['ticker']
        name = ticker_data['name']

        # Extract comprehensive metrics
        pe = ticker_data.get('pe', 'N/A')
        peg = ticker_data.get('peg', 'N/A')
        roe = ticker_data.get('roe', 'N/A')
        roic = ticker_data.get('roic', 'N/A')
        profit_margin = ticker_data.get('profit_margin', 'N/A')
        eps_this_y = ticker_data.get('eps_this_y', 'N/A')
        eps_next_y = ticker_data.get('eps_next_y', 'N/A')
        eps_next_5y = ticker_data.get('eps_next_5y', 'N/A')
        investor_score = ticker_data.get('investor_score', 'N/A')

        print(f"Analyzing {ticker}...", file=sys.stderr)

        # Get current date for latest information
        current_date = datetime.now().strftime("%Y-%m-%d")

        messages = [
            {
                "role": "user",
                "content": f"""Search the web and provide analysis of {ticker} ({name}) as of {current_date}.

Return ONLY a valid JSON object with exactly these three fields (no markdown, no code blocks, no citation tags):
{{
  "description": "Brief overview in 2-3 bullet points:\n• What the company does and its industry\n• Market cap and size classification\n• Market position or competitive advantage",
  "latest_news": "Recent developments in bullet points (2-4 items):\n• Specific events with dates and numbers\n• Earnings results or financial updates\n• Strategic announcements or operational changes",
  "why_selected": "Investment thesis in bullet points based on quality growth investing:\n• Valuation: Comment on P/E ({pe}), PEG ({peg}) - is valuation reasonable?\n• Profitability: Analyze ROE ({roe}%), ROIC ({roic}%), Profit Margin ({profit_margin}%) - are margins strong?\n• Growth: Evaluate EPS growth rates (This Y: {eps_this_y}%, Next Y: {eps_next_y}%, Next 5Y: {eps_next_5y}%) - is growth accelerating?\n• Quality: Overall assessment with Investor Score ({investor_score}/100) and momentum indicators"
}}

CRITICAL Requirements:
- DO NOT include any <cite> tags, citation markers, or source references in the output
- Use bullet points (•) for better readability
- Use web search to find the most recent and accurate information
- Be factual and specific with numbers and dates
- Focus on investment-relevant information based on quality growth investing principles
- Return ONLY the JSON object, no other text"""
            }
        ]

        try:
            response = self.call_openrouter(messages)

            # Parse JSON response (response-healing ensures valid JSON)
            try:
                analysis = json.loads(response)
                # Clean citation tags from all fields
                return {
                    "description": self.clean_citations(analysis.get("description", "")),
                    "latest_news": self.clean_citations(analysis.get("latest_news", "")),
                    "why_selected": self.clean_citations(analysis.get("why_selected", ""))
                }
            except json.JSONDecodeError as e:
                print(f"Warning: Could not parse JSON for {ticker}: {e}", file=sys.stderr)
                print(f"Response was: {response[:200]}", file=sys.stderr)
                return {
                    "description": "Analysis unavailable - JSON parse error",
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
            "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
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

        # Step 1: Get top 5 tickers
        date, tickers = self.get_top_tickers()
        if not date or not tickers:
            self.post_pr_comment("❌ **Error**: Could not extract ticker data from CSV")
            sys.exit(1)

        print(f"Analyzing top {len(tickers)} tickers for {date}", file=sys.stderr)

        # Step 2: Analyze each ticker
        stock_analyses = []
        for ticker_data in tickers:
            analysis = self.analyze_stock(ticker_data)
            stock_analyses.append({
                'ticker': ticker_data['ticker'],
                'name': ticker_data['name'],
                'analysis': analysis,
            })

        # Step 3: Save summaries
        if not self.save_summaries(date, stock_analyses):
            self.post_pr_comment("❌ **Error**: Failed to save summary files")
            sys.exit(1)

        # Step 4: Commit and push
        if not self.commit_and_push(date):
            self.post_pr_comment("⚠️ **Warning**: Failed to commit summary files")

        # Step 5: Post PR comment
        comment = self.format_comment(stock_analyses, date)
        self.post_pr_comment(comment)

        # Step 6: Approve PR
        self.approve_pr()

        print("PR review completed successfully!", file=sys.stderr)


if __name__ == "__main__":
    reviewer = OpenRouterPRReviewer()
    reviewer.run()
