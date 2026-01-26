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

import pandas as pd
import requests


class OpenRouterPRReviewer:
    """Handles PR review using OpenRouter API"""

    # API Configuration
    API_URL = "https://openrouter.ai/api/v1/chat/completions"
    DEFAULT_MODEL_NAME = "anthropic/claude-haiku-4.5:online"
    MAX_TOKENS = 4096
    REQUEST_TIMEOUT = 120

    # CSV Column Configuration
    REQUIRED_COLUMNS = [
        'Ticker', 'Company', 'P/E', 'PEG', 'ROE', 'ROIC',
        'Profit M', 'EPS This Y', 'EPS Next Y', 'EPS Next 5Y',
        'Market Cap', 'Investor_Score', 'SMA50', 'SMA200',
        '52W High', '52W Low'
    ]

    # Mapping from CSV columns to dict keys
    COLUMN_MAPPING = {
        'Ticker': 'ticker',
        'Company': 'name',
        'P/E': 'pe',
        'PEG': 'peg',
        'ROE': 'roe',
        'ROIC': 'roic',
        'Profit M': 'profit_margin',
        'EPS This Y': 'eps_this_y',
        'EPS Next Y': 'eps_next_y',
        'EPS Next 5Y': 'eps_next_5y',
        'Market Cap': 'market_cap',
        'Investor_Score': 'investor_score',
        'SMA50': 'sma50',
        'SMA200': 'sma200',
        '52W High': 'high_52w',
        '52W Low': 'low_52w',
    }

    def __init__(self):
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        self.github_token = os.getenv("GITHUB_TOKEN")
        self.pr_number = os.getenv("PR_NUMBER")
        self.repo = os.getenv("GITHUB_REPOSITORY")
        self.model_name = os.getenv("OPENROUTER_MODEL", self.DEFAULT_MODEL_NAME)

        if not all([self.openrouter_api_key, self.github_token, self.pr_number, self.repo]):
            print("Error: Missing required environment variables", file=sys.stderr)
            sys.exit(1)

        print(f"Using OpenRouter model: {self.model_name}", file=sys.stderr)

    @staticmethod
    def clean_citations(text: str) -> str:
        """Remove citation tags from LLM response"""
        # Remove <cite index="...">...</cite> tags but keep the content
        text = re.sub(r'<cite[^>]*>(.*?)</cite>', r'\1', text)
        # Remove any remaining standalone cite tags
        text = re.sub(r'</?cite[^>]*>', '', text)
        return text.strip()

    @staticmethod
    def safe_str(value, default: str = 'N/A') -> str:
        """Safely convert value to string, handling NaN values"""
        return str(value) if pd.notna(value) else default

    def row_to_dict(self, row: pd.Series) -> Dict[str, str]:
        """Convert pandas row to dict using column mapping"""
        return {
            dict_key: self.safe_str(row[csv_col], default='' if csv_col in ['Ticker', 'Company'] else 'N/A')
            for csv_col, dict_key in self.COLUMN_MAPPING.items()
        }

    @staticmethod
    def create_error_analysis(message: str = "Analysis unavailable") -> Dict[str, str]:
        """Create error response for failed analysis"""
        return {
            "description": message,
            "latest_news": "",
            "why_selected": ""
        }

    def call_openrouter(self, messages: List[Dict]) -> str:
        """Make API call to OpenRouter with configured model + web search"""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.openrouter_api_key}",
            "HTTP-Referer": "https://github.com",
            "X-Title": "Stock Screener PR Review",
        }

        data = {
            "model": self.model_name,
            "messages": messages,
            "max_tokens": self.MAX_TOKENS,
            "response_format": {"type": "json_object"},
            "plugins": [{"id": "response-healing"}]
        }

        try:
            response = requests.post(
                self.API_URL,
                headers=headers,
                json=data,
                timeout=self.REQUEST_TIMEOUT
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]
        except requests.exceptions.RequestException as e:
            print(f"Error calling OpenRouter API: {e}", file=sys.stderr)
            raise

    def get_top_tickers(self) -> tuple[Optional[str], List[Dict]]:
        """Read CSV file and get top 5 tickers using pandas"""
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

            # Read CSV with pandas
            df = pd.read_csv(dated_csv, sep='\t')

            if df.empty:
                print("Error: CSV file is empty", file=sys.stderr)
                return None, []

            # Validate required columns exist
            missing_cols = set(self.REQUIRED_COLUMNS) - set(df.columns)
            if missing_cols:
                print(f"Error: Missing required columns: {missing_cols}", file=sys.stderr)
                return None, []

            # Get top 5 rows and convert to list of dicts
            tickers = [self.row_to_dict(row) for _, row in df.head(5).iterrows()]

            return date, tickers
        except Exception as e:
            print(f"Error reading CSV: {e}", file=sys.stderr)
            return None, []

    def build_analysis_prompt(self, ticker: str, name: str, metrics: Dict[str, str], current_date: str) -> str:
        """Build analysis prompt for OpenRouter"""
        return f"""Search the web and provide analysis of {ticker} ({name}) as of {current_date}.

Return ONLY a valid JSON object with exactly these three fields (no markdown, no code blocks, no citation tags):
{{
  "description": "Brief overview in 2-3 bullet points:\\n• What the company does and its industry\\n• Market cap and size classification\\n• Market position or competitive advantage",
  "latest_news": "Recent developments in bullet points (2-4 items):\\n• Specific events with dates and numbers\\n• Earnings results or financial updates\\n• Strategic announcements or operational changes",
  "why_selected": "Investment thesis in bullet points based on quality growth investing:\\n• Valuation: Comment on P/E ({metrics['pe']}), PEG ({metrics['peg']}) - is valuation reasonable?\\n• Profitability: Analyze ROE ({metrics['roe']}%), ROIC ({metrics['roic']}%), Profit Margin ({metrics['profit_margin']}%) - are margins strong?\\n• Growth: Evaluate EPS growth rates (This Y: {metrics['eps_this_y']}%, Next Y: {metrics['eps_next_y']}%, Next 5Y: {metrics['eps_next_5y']}%) - is growth accelerating?\\n• Quality: Overall assessment with Investor Score ({metrics['investor_score']}/100) and momentum indicators"
}}

CRITICAL Requirements:
- DO NOT include any <cite> tags, citation markers, or source references in the output
- Use bullet points (•) for better readability
- Use web search to find the most recent and accurate information
- Be factual and specific with numbers and dates
- Focus on investment-relevant information based on quality growth investing principles
- Return ONLY the JSON object, no other text"""

    def analyze_stock(self, ticker_data: Dict[str, str]) -> Dict[str, str]:
        """Analyze a single stock using OpenRouter with web search"""
        ticker = ticker_data['ticker']
        name = ticker_data['name']

        print(f"Analyzing {ticker}...", file=sys.stderr)

        # Extract metrics for analysis
        metrics = {
            'pe': ticker_data.get('pe', 'N/A'),
            'peg': ticker_data.get('peg', 'N/A'),
            'roe': ticker_data.get('roe', 'N/A'),
            'roic': ticker_data.get('roic', 'N/A'),
            'profit_margin': ticker_data.get('profit_margin', 'N/A'),
            'eps_this_y': ticker_data.get('eps_this_y', 'N/A'),
            'eps_next_y': ticker_data.get('eps_next_y', 'N/A'),
            'eps_next_5y': ticker_data.get('eps_next_5y', 'N/A'),
            'investor_score': ticker_data.get('investor_score', 'N/A'),
        }

        current_date = datetime.now().strftime("%Y-%m-%d")
        prompt = self.build_analysis_prompt(ticker, name, metrics, current_date)
        messages = [{"role": "user", "content": prompt}]

        try:
            response = self.call_openrouter(messages)

            # Parse JSON response (response-healing ensures valid JSON)
            try:
                analysis = json.loads(response)
                # Clean citation tags from all fields
                return {
                    key: self.clean_citations(analysis.get(key, ""))
                    for key in ["description", "latest_news", "why_selected"]
                }
            except json.JSONDecodeError as e:
                print(f"Warning: Could not parse JSON for {ticker}: {e}", file=sys.stderr)
                print(f"Response was: {response[:200]}", file=sys.stderr)
                return self.create_error_analysis("Analysis unavailable - JSON parse error")
        except Exception as e:
            print(f"Error analyzing {ticker}: {e}", file=sys.stderr)
            return self.create_error_analysis()

    def save_summaries(self, date: str, stock_analyses: List[Dict]) -> bool:
        """Generate and save summary JSON files"""
        summary_data = {
            "date": date,
            "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "top_stocks": [
                {"ticker": stock['ticker'], **stock['analysis']}
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
