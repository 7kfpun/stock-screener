#!/usr/bin/env python3
"""
OpenRouter PR Review Script
Replaces claude-code-action with OpenRouter API for automated PR reviews

Environment variables:
  OPENROUTER_API_KEY   (required) OpenRouter API key
  OPENROUTER_MODEL     Model slug. A ":batch" suffix (e.g.
                       "google/gemini-3.7-flash:batch") routes the request
                       through OpenRouter's async Batch API at roughly half
                       the per-token price instead of chat/completions.
  OPENROUTER_BATCH_POLL_INTERVAL  Seconds between batch status polls (default 15)
  OPENROUTER_BATCH_MAX_WAIT       Seconds to wait for a batch (default 900)
  OPENROUTER_BATCH_FALLBACK       "false" to fail instead of retrying the
                                  non-batch model when a batch times out
"""

import json
import os
import re
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd
import requests


class OpenRouterPRReviewer:
    """Handles PR review using OpenRouter API"""

    # API Configuration
    # The Batch API references endpoints by path, the sync client by URL, so
    # both are derived from one host + one path rather than spelled out twice.
    API_HOST = "https://openrouter.ai"
    CHAT_COMPLETIONS_PATH = "/api/v1/chat/completions"
    API_URL = f"{API_HOST}{CHAT_COMPLETIONS_PATH}"
    DEFAULT_MODEL_NAME = "anthropic/claude-haiku-4.5:online"
    MAX_TOKENS = 4096
    REQUEST_TIMEOUT = 120

    # Batch API Configuration
    # Models suffixed with ":batch" (e.g. "google/gemini-3.7-flash:batch") are
    # ~50% cheaper but are only served by the async Batch API, never by
    # chat/completions. We submit a single-request batch and poll until it
    # reaches a terminal status.
    BATCH_API_URL = f"{API_HOST}/api/beta/batches"
    BATCH_MODEL_SUFFIX = ":batch"
    BATCH_COMPLETION_WINDOW = "24h"
    BATCH_POLL_INTERVAL = 15   # seconds between status polls
    BATCH_MAX_WAIT = 900       # give up after 15 min (CI job budget, not the 24h window)
    BATCH_TERMINAL_STATUSES = {"completed", "failed", "expired", "cancelled", "canceled"}

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

        self.batch_mode = self.is_batch_model(self.model_name)
        self.batch_poll_interval = self.env_int("OPENROUTER_BATCH_POLL_INTERVAL", self.BATCH_POLL_INTERVAL)
        self.batch_max_wait = self.env_int("OPENROUTER_BATCH_MAX_WAIT", self.BATCH_MAX_WAIT)
        self.batch_fallback = os.getenv("OPENROUTER_BATCH_FALLBACK", "true").strip().lower() not in (
            "0", "false", "no", "off"
        )

        if not all([self.openrouter_api_key, self.github_token, self.pr_number, self.repo]):
            print("Error: Missing required environment variables", file=sys.stderr)
            sys.exit(1)

        print(f"Using OpenRouter model: {self.model_name}", file=sys.stderr)
        if self.batch_mode:
            print(
                f"Batch mode enabled: submitting via {self.BATCH_API_URL} "
                f"(poll every {self.batch_poll_interval}s, wait up to {self.batch_max_wait}s"
                f"{', then fall back to ' + self.strip_batch_suffix(self.model_name) if self.batch_fallback else ''})",
                file=sys.stderr,
            )
            # The Batch API does not run plugins, so a ":online"-style web
            # search is unavailable here — analyses come from model knowledge.
            print(
                "Note: web search is not available on the Batch API; "
                "'latest_news' will rely on the model's own knowledge.",
                file=sys.stderr,
            )

    @staticmethod
    def env_int(name: str, default: int) -> int:
        """Read a positive int from the environment, falling back on bad input"""
        raw = os.getenv(name)
        if raw is None or not raw.strip():
            return default
        try:
            value = int(raw)
        except ValueError:
            print(f"Warning: {name}={raw!r} is not an integer, using {default}", file=sys.stderr)
            return default
        if value <= 0:
            print(f"Warning: {name}={value} must be positive, using {default}", file=sys.stderr)
            return default
        return value

    @classmethod
    def is_batch_model(cls, model_name: str) -> bool:
        """True when the model slug requests the async Batch API (":batch")"""
        return model_name.strip().lower().endswith(cls.BATCH_MODEL_SUFFIX)

    @classmethod
    def strip_batch_suffix(cls, model_name: str) -> str:
        """Drop the ":batch" suffix to get the synchronous variant of a model"""
        if cls.is_batch_model(model_name):
            return model_name.strip()[: -len(cls.BATCH_MODEL_SUFFIX)]
        return model_name.strip()

    def build_headers(self) -> Dict[str, str]:
        """Common headers for every OpenRouter request"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.openrouter_api_key}",
            "HTTP-Referer": "https://github.com",
            "X-Title": "Stock Screener PR Review",
        }

    @staticmethod
    def clean_citations(text: str) -> str:
        """Remove citation tags from LLM response"""
        # Remove <cite index="...">...</cite> tags but keep the content
        text = re.sub(r'<cite[^>]*>(.*?)</cite>', r'\1', text)
        # Remove any remaining standalone cite tags
        text = re.sub(r'</?cite[^>]*>', '', text)
        return text.strip()

    @staticmethod
    def extract_json_from_response(response: str) -> dict:
        """Extract JSON object from response, handling markdown code blocks and extra text.

        Tries multiple strategies in order:
        1. Direct JSON parse (response is already clean JSON)
        2. Strip ```json ... ``` or ``` ... ``` markdown code fences
        3. Locate the outermost { ... } braces and parse that substring
        """
        # Strategy 1: direct parse
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass

        # Strategy 2: strip markdown code fences
        code_fence = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', response)
        if code_fence:
            try:
                return json.loads(code_fence.group(1))
            except json.JSONDecodeError:
                pass

        # Strategy 3: find outermost { ... } braces
        first_brace = response.find('{')
        last_brace = response.rfind('}')
        if first_brace != -1 and last_brace > first_brace:
            try:
                return json.loads(response[first_brace:last_brace + 1])
            except json.JSONDecodeError:
                pass

        raise json.JSONDecodeError("Could not extract valid JSON from response", response, 0)

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

    def call_openrouter(self, messages: List[Dict], max_retries: int = 3) -> str:
        """Send a prompt to OpenRouter and return the assistant message content.

        Routes through the async Batch API when the configured model carries a
        ":batch" suffix (roughly half price, minutes instead of seconds), and
        through chat/completions otherwise.
        """
        if not self.batch_mode:
            return self.call_chat_completions(messages, self.model_name, max_retries)

        try:
            return self.call_batch_api(messages)
        except Exception as e:
            if not self.batch_fallback:
                raise
            sync_model = self.strip_batch_suffix(self.model_name)
            print(f"Batch request failed ({type(e).__name__}: {e})", file=sys.stderr)
            print(f"Falling back to synchronous model: {sync_model}", file=sys.stderr)
            return self.call_chat_completions(messages, sync_model, max_retries)

    def call_chat_completions(self, messages: List[Dict], model: str, max_retries: int = 3) -> str:
        """Make a synchronous chat/completions call with retry logic"""
        data = {
            "model": model,
            "messages": messages,
            "max_tokens": self.MAX_TOKENS,
        }

        for attempt in range(max_retries):
            try:
                response = requests.post(
                    self.API_URL,
                    headers=self.build_headers(),
                    json=data,
                    timeout=self.REQUEST_TIMEOUT
                )
                response.raise_for_status()
                result = response.json()
                return result["choices"][0]["message"]["content"]
            except requests.exceptions.RequestException as e:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                    print(f"API call failed (attempt {attempt + 1}/{max_retries}): {e}", file=sys.stderr)
                    print(f"Retrying in {wait_time}s...", file=sys.stderr)
                    time.sleep(wait_time)
                else:
                    print(f"Error calling OpenRouter API after {max_retries} attempts: {e}", file=sys.stderr)
                    raise

    # ------------------------------------------------------------------
    # Batch API (":batch" models)
    # ------------------------------------------------------------------

    def call_batch_api(self, messages: List[Dict]) -> str:
        """Submit a one-request batch, wait for it, and return its content"""
        custom_id = f"pr-review-{uuid.uuid4().hex[:8]}"
        batch_id = self.submit_batch(messages, custom_id)
        batch = self.poll_batch(batch_id)
        return self.extract_batch_content(batch, custom_id)

    def build_batch_payload(self, messages: List[Dict], custom_id: str) -> Dict:
        """Build the create-batch request body.

        Key order matters: OpenRouter stream-parses this body so that huge
        "requests" arrays never have to be buffered, and rejects the request
        with a 400 if "requests" is serialized before "endpoint"/"model".
        Python dicts preserve insertion order, so keep these keys as-is.
        """
        return {
            "endpoint": self.CHAT_COMPLETIONS_PATH,
            "model": self.model_name,
            "completion_window": self.BATCH_COMPLETION_WINDOW,
            "requests": [
                {
                    "custom_id": custom_id,
                    "method": "POST",
                    "url": self.CHAT_COMPLETIONS_PATH,
                    # "model" is omitted so the request inherits the
                    # batch-level model; a mismatch here is rejected.
                    "body": {
                        "messages": messages,
                        "max_tokens": self.MAX_TOKENS,
                    },
                }
            ],
        }

    @staticmethod
    def raise_for_status_verbose(response, action: str) -> None:
        """raise_for_status, but log the response body first — the Batch API
        explains rejections (bad model, key order, unsupported options) there."""
        if response.status_code >= 400:
            body = getattr(response, "text", "")
            print(f"{action} failed with HTTP {response.status_code}: {body}", file=sys.stderr)
        response.raise_for_status()

    def submit_batch(self, messages: List[Dict], custom_id: str) -> str:
        """Create a batch and return its id"""
        response = requests.post(
            self.BATCH_API_URL,
            headers=self.build_headers(),
            json=self.build_batch_payload(messages, custom_id),
            timeout=self.REQUEST_TIMEOUT,
        )
        self.raise_for_status_verbose(response, "Batch submission")
        batch = response.json()

        batch_id = batch.get("id")
        if not batch_id:
            raise RuntimeError(f"Batch submission returned no id: {batch}")

        print(f"Submitted batch {batch_id} (status: {batch.get('status', 'unknown')})", file=sys.stderr)
        return batch_id

    def get_batch(self, batch_id: str) -> Dict:
        """Fetch the current state of a batch"""
        response = requests.get(
            f"{self.BATCH_API_URL}/{batch_id}",
            headers=self.build_headers(),
            timeout=self.REQUEST_TIMEOUT,
        )
        self.raise_for_status_verbose(response, f"Batch status poll for {batch_id}")
        return response.json()

    def poll_batch(self, batch_id: str) -> Dict:
        """Poll a batch until it reaches a terminal status or we run out of time"""
        deadline = time.monotonic() + self.batch_max_wait

        while True:
            batch = self.get_batch(batch_id)
            status = batch.get("status", "unknown")

            if status in self.BATCH_TERMINAL_STATUSES:
                print(f"Batch {batch_id} finished with status: {status}", file=sys.stderr)
                return batch

            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError(
                    f"Batch {batch_id} still '{status}' after {self.batch_max_wait}s"
                )

            counts = batch.get("request_counts") or {}
            print(
                f"Batch {batch_id} status: {status} {counts} "
                f"— polling again in {self.batch_poll_interval}s "
                f"({int(remaining)}s left)",
                file=sys.stderr,
            )
            time.sleep(min(self.batch_poll_interval, remaining))

    def extract_batch_content(self, batch: Dict, custom_id: str) -> str:
        """Pull the assistant message content out of a completed batch"""
        status = batch.get("status", "unknown")
        if status != "completed":
            raise RuntimeError(f"Batch ended with status '{status}': {batch.get('error')}")

        results = batch.get("results") or []
        if not results:
            raise RuntimeError("Completed batch returned no results")

        matches = [item for item in results if item.get("custom_id") == custom_id]
        if not matches and len(results) == 1:
            # Single-request batch: trust the only result even if the id differs
            matches = results
        if not matches:
            raise RuntimeError(f"No batch result for custom_id {custom_id}")

        item = matches[0]
        if item.get("error"):
            raise RuntimeError(f"Batch request failed: {item['error']}")

        response = item.get("response") or {}
        status_code = response.get("status_code")
        if status_code is not None and status_code != 200:
            raise RuntimeError(f"Batch request returned HTTP {status_code}: {response.get('body')}")

        choices = (response.get("body") or {}).get("choices") or []
        if not choices:
            raise RuntimeError(f"Batch result had no choices: {item}")

        return choices[0]["message"]["content"]

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

    def build_batch_analysis_prompt(self, tickers_data: List[Dict[str, str]], current_date: str) -> str:
        """Build batched analysis prompt for all stocks in one request"""
        stocks_info = []
        for ticker_data in tickers_data:
            ticker = ticker_data['ticker']
            name = ticker_data['name']
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
            stocks_info.append(f"""
{ticker} ({name}):
- P/E: {metrics['pe']}, PEG: {metrics['peg']}
- ROE: {metrics['roe']}%, ROIC: {metrics['roic']}%, Profit Margin: {metrics['profit_margin']}%
- EPS Growth: This Y: {metrics['eps_this_y']}%, Next Y: {metrics['eps_next_y']}%, Next 5Y: {metrics['eps_next_5y']}%
- Investor Score: {metrics['investor_score']}/100""")

        stocks_section = "\n".join(stocks_info)

        tickers_list = ", ".join(td['ticker'] for td in tickers_data)

        # The Batch API does not run plugins, so ":batch" models have no web
        # search — ask for grounded recall instead of pretending otherwise.
        if self.batch_mode:
            research_line = (
                f"You are a financial analyst. Analyze the following {len(tickers_data)} stocks "
                "using your own knowledge and the screener metrics below, and return a structured JSON analysis."
            )
            data_rule = (
                "- Use only facts you are confident about — include specific numbers and dates, "
                "and say \"no recent update available\" rather than inventing news"
            )
        else:
            research_line = (
                f"You are a financial analyst. Use web search to research the following {len(tickers_data)} stocks "
                "and return a structured JSON analysis."
            )
            data_rule = "- Use actual data from web search — include specific numbers, dates, and facts"

        return f"""{research_line}

Date: {current_date}
Stocks to analyze: {tickers_list}

Stock metrics from our screener:
{stocks_section}

Your response MUST be a single JSON object — nothing else. No markdown fences, no prose before or after, no citation tags.
Start your response with {{ and end with }}.

Required JSON structure (replace TICKER with actual ticker symbols, e.g. AAPL, MSFT):
{{
  "{tickers_data[0]['ticker']}": {{
    "description": "• What the company does and its industry\\n• Market cap and size classification\\n• Key competitive advantage or market position",
    "latest_news": "• [Date] Specific recent event or announcement\\n• [Date] Earnings result or financial update\\n• [Date] Strategic or operational development",
    "why_selected": "• Valuation: P/E={tickers_data[0].get('pe','N/A')}, PEG={tickers_data[0].get('peg','N/A')} — is this reasonable?\\n• Profitability: ROE={tickers_data[0].get('roe','N/A')}%, Profit Margin={tickers_data[0].get('profit_margin','N/A')}% — are margins strong?\\n• Growth: EPS next 5Y={tickers_data[0].get('eps_next_5y','N/A')}% — is growth outlook positive?\\n• Quality: Investor Score={tickers_data[0].get('investor_score','N/A')}/100 — overall quality assessment"
  }},
  "NEXT_TICKER": {{ "description": "...", "latest_news": "...", "why_selected": "..." }},
  ...repeat for all {len(tickers_data)} tickers...
}}

Rules:
- ALL {len(tickers_data)} tickers must appear in the JSON: {tickers_list}
- Every ticker must have non-empty "description", "latest_news", and "why_selected" strings
{data_rule}
- Do NOT include <cite>, citation markers, URLs, or source references anywhere in the values
- Each field should use bullet points starting with •
- Output the raw JSON object only — no text outside the braces"""

    def analyze_stocks_batch(self, tickers_data: List[Dict[str, str]]) -> Dict[str, Dict[str, str]]:
        """Analyze all stocks in a single batched API call using OpenRouter with web search"""
        tickers_list = [td['ticker'] for td in tickers_data]
        print(f"Analyzing {len(tickers_list)} stocks in batch: {', '.join(tickers_list)}...", file=sys.stderr)

        current_date = datetime.now().strftime("%Y-%m-%d")
        prompt = self.build_batch_analysis_prompt(tickers_data, current_date)
        messages = [{"role": "user", "content": prompt}]

        try:
            response = self.call_openrouter(messages)

            # Strip citation tags from the raw response BEFORE JSON parsing —
            # the :online model can embed <cite> tags inside JSON strings,
            # making them unparseable. clean_citations is also applied per-field
            # below for any residual tags.
            response = self.clean_citations(response)
            print(f"Raw response preview: {response[:500]}", file=sys.stderr)

            # Parse JSON response - use robust extraction to handle markdown-wrapped responses
            try:
                all_analyses = self.extract_json_from_response(response)

                # Process and clean each stock's analysis
                result = {}
                for ticker_data in tickers_data:
                    ticker = ticker_data['ticker']

                    if ticker in all_analyses:
                        analysis = all_analyses[ticker]
                        # Clean citation tags from all fields
                        result[ticker] = {
                            key: self.clean_citations(analysis.get(key, ""))
                            for key in ["description", "latest_news", "why_selected"]
                        }
                    else:
                        print(f"Warning: No analysis found for {ticker} in response", file=sys.stderr)
                        result[ticker] = self.create_error_analysis(f"Analysis not returned for {ticker}")

                return result

            except json.JSONDecodeError as e:
                print(f"Warning: Could not parse JSON response: {e}", file=sys.stderr)
                print(f"Response was: {response[:1000]}", file=sys.stderr)
                # Return error analysis for all tickers
                return {
                    td['ticker']: self.create_error_analysis("Analysis unavailable - JSON parse error")
                    for td in tickers_data
                }
        except Exception as e:
            print(f"Error in batch analysis: {e}", file=sys.stderr)
            # Return error analysis for all tickers
            return {
                td['ticker']: self.create_error_analysis()
                for td in tickers_data
            }

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

        # Step 2: Analyze all tickers in a single batched API call
        batch_analyses = self.analyze_stocks_batch(tickers)

        # Convert to the expected format
        stock_analyses = []
        for ticker_data in tickers:
            ticker = ticker_data['ticker']
            analysis = batch_analyses.get(ticker, self.create_error_analysis())
            stock_analyses.append({
                'ticker': ticker,
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
