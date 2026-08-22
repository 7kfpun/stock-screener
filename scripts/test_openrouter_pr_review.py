"""Unit tests for OpenRouterAnalyzer parsing helpers.

Covers the three scenarios that matter most now that response_format and
response-healing have been removed:
  - clean_citations strips tags before JSON parsing
  - extract_json_from_response handles all three extraction strategies
  - analyze_stocks_batch wires clean_citations → extract_json correctly
"""

import json
import sys
import types
import unittest
from unittest.mock import MagicMock, patch

# ---------------------------------------------------------------------------
# Minimal pandas stub so the module can be imported without the real package
# ---------------------------------------------------------------------------
pd_stub = types.ModuleType("pandas")
pd_stub.notna = lambda v: v == v  # NaN != NaN
pd_stub.read_csv = MagicMock()
pd_stub.DataFrame = MagicMock()
pd_stub.Series = MagicMock()
sys.modules.setdefault("pandas", pd_stub)

from openrouter_pr_review import OpenRouterPRReviewer as OpenRouterAnalyzer  # noqa: E402


class TestCleanCitations(unittest.TestCase):
    def test_removes_inline_cite_tag(self):
        raw = '<cite index="1">Apple Inc</cite> is a tech company'
        assert OpenRouterAnalyzer.clean_citations(raw) == "Apple Inc is a tech company"

    def test_removes_multiple_cite_tags(self):
        raw = '<cite index="1">First</cite> and <cite index="2">Second</cite>'
        assert OpenRouterAnalyzer.clean_citations(raw) == "First and Second"

    def test_removes_standalone_close_tag(self):
        raw = "text </cite> more"
        assert OpenRouterAnalyzer.clean_citations(raw) == "text  more"

    def test_passthrough_on_clean_text(self):
        raw = "No citations here."
        assert OpenRouterAnalyzer.clean_citations(raw) == "No citations here."

    def test_strips_whitespace(self):
        raw = "  clean  "
        assert OpenRouterAnalyzer.clean_citations(raw) == "clean"


class TestExtractJsonFromResponse(unittest.TestCase):
    PAYLOAD = {"AAPL": {"description": "d", "latest_news": "n", "why_selected": "w"}}

    def _raw(self):
        return json.dumps(self.PAYLOAD)

    # Strategy 1 – already valid JSON
    def test_strategy1_clean_json(self):
        result = OpenRouterAnalyzer.extract_json_from_response(self._raw())
        assert result == self.PAYLOAD

    # Strategy 2 – wrapped in ```json ... ```
    def test_strategy2_json_code_fence(self):
        wrapped = f"```json\n{self._raw()}\n```"
        assert OpenRouterAnalyzer.extract_json_from_response(wrapped) == self.PAYLOAD

    def test_strategy2_plain_code_fence(self):
        wrapped = f"```\n{self._raw()}\n```"
        assert OpenRouterAnalyzer.extract_json_from_response(wrapped) == self.PAYLOAD

    # Strategy 3 – JSON embedded in prose
    def test_strategy3_json_in_prose(self):
        prose = f"Here is the analysis:\n{self._raw()}\nHope that helps!"
        assert OpenRouterAnalyzer.extract_json_from_response(prose) == self.PAYLOAD

    def test_raises_on_totally_invalid(self):
        with self.assertRaises(json.JSONDecodeError):
            OpenRouterAnalyzer.extract_json_from_response("no json here at all")


class TestAnalysisFailureDoesNotBlockMerge(unittest.TestCase):
    """The daily data PR must merge even when OpenRouter is unusable.

    An exhausted account balance returns HTTP 402, which requests raises as an
    HTTPError. Previously that was swallowed into per-ticker placeholder
    analyses, which were then written over the real summary/latest.json and
    published. Now a wholesale failure returns None so run() can leave the
    existing summaries alone and still exit 0.
    """

    def _analyzer(self):
        with patch.object(OpenRouterAnalyzer, "__init__", lambda s: None):
            a = OpenRouterAnalyzer.__new__(OpenRouterAnalyzer)
        a.model_name = "test-model"
        return a

    TICKERS = [{"ticker": "AAPL", "name": "Apple Inc"},
               {"ticker": "MSFT", "name": "Microsoft Corp"}]

    def test_api_error_returns_none(self):
        """Out of credits: the 402 propagates and the batch reports failure."""
        import requests
        analyzer = self._analyzer()
        with patch.object(OpenRouterAnalyzer, "call_openrouter",
                          side_effect=requests.exceptions.HTTPError("402 Payment Required")):
            assert analyzer.analyze_stocks_batch(self.TICKERS) is None

    def test_unparseable_response_returns_none(self):
        """A response with no JSON in it is a failure, not empty content."""
        analyzer = self._analyzer()
        with patch.object(OpenRouterAnalyzer, "call_openrouter",
                          return_value="I cannot help with that."):
            assert analyzer.analyze_stocks_batch(self.TICKERS) is None

    def test_partial_response_keeps_real_content(self):
        """A parseable response missing one ticker keeps the other's content."""
        analyzer = self._analyzer()
        payload = {"AAPL": {"description": "d", "latest_news": "n", "why_selected": "w"}}
        with patch.object(OpenRouterAnalyzer, "call_openrouter",
                          return_value=json.dumps(payload)):
            result = analyzer.analyze_stocks_batch(self.TICKERS)
        assert result is not None
        assert result["AAPL"]["description"] == "d"
        assert "MSFT" in result  # placeholder, not a dropped ticker

    def _run_with_failed_analysis(self):
        """Drive run() with the analysis failing; return the mocked collaborators."""
        analyzer = self._analyzer()
        analyzer.pr_number = "1"
        with patch.object(OpenRouterAnalyzer, "get_top_tickers",
                          return_value=("2026-08-20", self.TICKERS)), \
             patch.object(OpenRouterAnalyzer, "analyze_stocks_batch", return_value=None), \
             patch.object(OpenRouterAnalyzer, "save_summaries") as save, \
             patch.object(OpenRouterAnalyzer, "commit_and_push") as commit, \
             patch.object(OpenRouterAnalyzer, "approve_pr") as approve, \
             patch.object(OpenRouterAnalyzer, "post_pr_comment") as comment:
            analyzer.run()
        return save, commit, approve, comment

    def test_run_exits_cleanly_so_the_pr_can_merge(self):
        """run() must return normally -- a SystemExit would fail the step."""
        self._run_with_failed_analysis()  # no SystemExit raised

    def test_run_does_not_overwrite_existing_summaries(self):
        """The real regression: placeholders must not reach summary/latest.json."""
        save, commit, _approve, _comment = self._run_with_failed_analysis()
        save.assert_not_called()
        commit.assert_not_called()

    def test_run_reports_the_skip_on_the_pr(self):
        """Silently skipping would hide a broken integration indefinitely."""
        _save, _commit, _approve, comment = self._run_with_failed_analysis()
        comment.assert_called_once()
        body = comment.call_args[0][0]
        assert "summaries skipped" in body.lower()
        assert "/review" in body  # tells the maintainer how to retry


class TestCitationsBeforeJsonParsing(unittest.TestCase):
    """Key regression: <cite> tags embedded in JSON values must be stripped
    before extract_json_from_response is called, not after."""

    def _analyzer(self):
        with patch.object(OpenRouterAnalyzer, "__init__", lambda s: None):
            a = OpenRouterAnalyzer.__new__(OpenRouterAnalyzer)
        return a

    def test_cite_inside_json_string_still_parses(self):
        """Simulate what the :online model returns when citations appear
        inside a JSON field value."""
        payload = {
            "AAPL": {
                "description": '<cite index="1">Apple</cite> makes iPhones',
                "latest_news": "nothing",
                "why_selected": "growth",
            }
        }
        raw = json.dumps(payload)
        # clean_citations first, then parse
        cleaned = OpenRouterAnalyzer.clean_citations(raw)
        result = OpenRouterAnalyzer.extract_json_from_response(cleaned)
        assert result["AAPL"]["description"] == "Apple makes iPhones"

    def test_cite_tag_straddling_prose_wrapper(self):
        """Citations in surrounding prose (strategy 3 path) don't corrupt
        the brace-extraction logic."""
        payload = {"MSFT": {"description": "d", "latest_news": "n", "why_selected": "w"}}
        raw = f'See <cite index="1">source</cite>: {json.dumps(payload)} Done.'
        cleaned = OpenRouterAnalyzer.clean_citations(raw)
        result = OpenRouterAnalyzer.extract_json_from_response(cleaned)
        assert result == payload

    def test_analyze_stocks_batch_applies_clean_before_parse(self):
        """analyze_stocks_batch must strip citations from raw response before
        JSON extraction — patch call_openrouter to return a response with cite
        tags embedded in a JSON value and verify the field is clean."""
        analyzer = self._analyzer()
        analyzer.model = "test-model"

        payload = {
            "TSLA": {
                "description": '<cite index="1">Tesla</cite> makes EVs',
                "latest_news": "news",
                "why_selected": "momentum",
            }
        }
        analyzer.call_openrouter = MagicMock(return_value=json.dumps(payload))

        result = analyzer.analyze_stocks_batch([{"ticker": "TSLA", "name": "Tesla"}])

        assert "TSLA" in result
        assert result["TSLA"]["description"] == "Tesla makes EVs"
        assert "<cite" not in result["TSLA"]["description"]


if __name__ == "__main__":
    unittest.main()
