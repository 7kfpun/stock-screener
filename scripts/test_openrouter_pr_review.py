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
