"""Unit tests for OpenRouterAnalyzer parsing and transport helpers.

Covers:
  - clean_citations strips tags before JSON parsing
  - extract_json_from_response handles all three extraction strategies
  - analyze_stocks_batch wires clean_citations → extract_json correctly
  - ":batch" models route through the async Batch API (submit → poll → extract)
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

# ---------------------------------------------------------------------------
# Minimal requests stub for the same reason (the real package wins when present)
# ---------------------------------------------------------------------------
requests_stub = types.ModuleType("requests")
requests_stub.exceptions = types.SimpleNamespace(RequestException=type("RequestException", (Exception,), {}))
requests_stub.post = MagicMock()
requests_stub.get = MagicMock()
sys.modules.setdefault("requests", requests_stub)

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
        analyzer.model_name = "test-model"
        analyzer.batch_mode = False

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


class TestBatchModelDetection(unittest.TestCase):
    def test_detects_batch_suffix(self):
        assert OpenRouterAnalyzer.is_batch_model("google/gemini-3.7-flash:batch")

    def test_detects_batch_suffix_with_whitespace_and_case(self):
        assert OpenRouterAnalyzer.is_batch_model("  google/gemini-3.7-flash:BATCH  ")

    def test_online_model_is_not_batch(self):
        assert not OpenRouterAnalyzer.is_batch_model("anthropic/claude-haiku-4.5:online")

    def test_plain_model_is_not_batch(self):
        assert not OpenRouterAnalyzer.is_batch_model("google/gemini-3.7-flash")

    def test_batchy_name_without_suffix_is_not_batch(self):
        assert not OpenRouterAnalyzer.is_batch_model("some/batch-model")

    def test_strip_suffix(self):
        assert OpenRouterAnalyzer.strip_batch_suffix("google/gemini-3.7-flash:batch") == "google/gemini-3.7-flash"

    def test_strip_suffix_is_noop_for_sync_models(self):
        assert OpenRouterAnalyzer.strip_batch_suffix("openai/gpt-5:online") == "openai/gpt-5:online"


def _fake_response(payload, status_code=200):
    """Stand-in for a requests.Response"""
    response = MagicMock()
    response.status_code = status_code
    response.json.return_value = payload
    response.raise_for_status.return_value = None
    return response


def _completed_batch(custom_id, content, batch_id="batch_1"):
    return {
        "id": batch_id,
        "status": "completed",
        "results": [
            {
                "id": "res_1",
                "custom_id": custom_id,
                "response": {
                    "status_code": 200,
                    "request_id": "req_1",
                    "body": {"choices": [{"message": {"role": "assistant", "content": content}}]},
                },
                "error": None,
            }
        ],
    }


class BatchTestCase(unittest.TestCase):
    """Shared setup: an analyzer configured for a ':batch' model"""

    MODEL = "google/gemini-3.7-flash:batch"

    def _analyzer(self, fallback=True, max_wait=60, poll_interval=0):
        with patch.object(OpenRouterAnalyzer, "__init__", lambda s: None):
            a = OpenRouterAnalyzer.__new__(OpenRouterAnalyzer)
        a.openrouter_api_key = "test-key"
        a.model_name = self.MODEL
        a.batch_mode = True
        a.batch_fallback = fallback
        a.batch_max_wait = max_wait
        a.batch_poll_interval = poll_interval
        return a


class TestBatchPayload(BatchTestCase):
    def test_endpoint_and_model_serialize_before_requests(self):
        """OpenRouter stream-parses the body and 400s if 'requests' comes first."""
        analyzer = self._analyzer()
        payload = analyzer.build_batch_payload([{"role": "user", "content": "hi"}], "cid-1")

        keys = list(payload.keys())
        assert keys.index("endpoint") < keys.index("requests")
        assert keys.index("model") < keys.index("requests")
        # Serialization order must survive json.dumps too
        serialized = json.dumps(payload)
        assert serialized.index('"endpoint"') < serialized.index('"requests"')
        assert serialized.index('"model"') < serialized.index('"requests"')

    def test_payload_shape(self):
        analyzer = self._analyzer()
        messages = [{"role": "user", "content": "hi"}]
        payload = analyzer.build_batch_payload(messages, "cid-1")

        assert payload["model"] == self.MODEL
        assert payload["endpoint"] == OpenRouterAnalyzer.CHAT_COMPLETIONS_PATH
        assert payload["completion_window"] == OpenRouterAnalyzer.BATCH_COMPLETION_WINDOW
        assert len(payload["requests"]) == 1

        request = payload["requests"][0]
        assert request["custom_id"] == "cid-1"
        assert request["method"] == "POST"
        assert request["url"] == OpenRouterAnalyzer.CHAT_COMPLETIONS_PATH
        assert request["body"]["messages"] == messages
        assert request["body"]["max_tokens"] == OpenRouterAnalyzer.MAX_TOKENS
        # model must be inherited from the batch, never duplicated per request
        assert "model" not in request["body"]


class TestBatchRoundTrip(BatchTestCase):
    def test_batch_model_uses_batch_endpoint_not_chat_completions(self):
        analyzer = self._analyzer()
        content = '{"AAPL": {}}'
        submitted = {}

        def fake_post(url, **kwargs):
            submitted["url"] = url
            submitted["payload"] = kwargs["json"]
            return _fake_response({"id": "batch_1", "status": "validating"})

        def fake_get(url, **kwargs):
            submitted["get_url"] = url
            custom_id = submitted["payload"]["requests"][0]["custom_id"]
            return _fake_response(_completed_batch(custom_id, content))

        with patch("openrouter_pr_review.requests") as req:
            req.post.side_effect = fake_post
            req.get.side_effect = fake_get
            result = analyzer.call_openrouter([{"role": "user", "content": "hi"}])

        assert result == content
        assert submitted["url"] == OpenRouterAnalyzer.BATCH_API_URL
        assert submitted["get_url"] == f"{OpenRouterAnalyzer.BATCH_API_URL}/batch_1"
        assert submitted["payload"]["model"] == self.MODEL
        assert req.post.call_count == 1

    def test_polls_until_terminal_status(self):
        analyzer = self._analyzer()
        content = "done"

        with patch("openrouter_pr_review.requests") as req, \
                patch("openrouter_pr_review.time.sleep") as sleep:
            req.post.return_value = _fake_response({"id": "batch_1", "status": "validating"})
            req.get.side_effect = [
                _fake_response({"id": "batch_1", "status": "validating"}),
                _fake_response({"id": "batch_1", "status": "in_progress",
                                "request_counts": {"total": 1, "completed": 0}}),
                _fake_response(_completed_batch("cid-1", content)),
            ]
            batch = analyzer.poll_batch("batch_1")

        assert batch["status"] == "completed"
        assert req.get.call_count == 3
        assert sleep.call_count == 2

    def test_poll_times_out(self):
        analyzer = self._analyzer(max_wait=0)

        with patch("openrouter_pr_review.requests") as req:
            req.get.return_value = _fake_response({"id": "batch_1", "status": "in_progress"})
            with self.assertRaises(TimeoutError):
                analyzer.poll_batch("batch_1")

    def test_sync_model_never_touches_batch_endpoint(self):
        analyzer = self._analyzer()
        analyzer.model_name = "google/gemini-3.7-flash"
        analyzer.batch_mode = False

        with patch("openrouter_pr_review.requests") as req:
            req.exceptions.RequestException = Exception
            req.post.return_value = _fake_response(
                {"choices": [{"message": {"content": "sync"}}]}
            )
            result = analyzer.call_openrouter([{"role": "user", "content": "hi"}])

        assert result == "sync"
        assert req.post.call_args.args[0] == OpenRouterAnalyzer.API_URL


class TestBatchContentExtraction(BatchTestCase):
    def test_extracts_matching_custom_id(self):
        analyzer = self._analyzer()
        batch = _completed_batch("cid-1", "hello")
        batch["results"].insert(0, {
            "custom_id": "other",
            "response": {"status_code": 200, "body": {"choices": [{"message": {"content": "wrong"}}]}},
        })
        assert analyzer.extract_batch_content(batch, "cid-1") == "hello"

    def test_falls_back_to_sole_result_on_id_mismatch(self):
        analyzer = self._analyzer()
        batch = _completed_batch("unexpected-id", "hello")
        assert analyzer.extract_batch_content(batch, "cid-1") == "hello"

    def test_raises_on_failed_batch(self):
        analyzer = self._analyzer()
        with self.assertRaises(RuntimeError):
            analyzer.extract_batch_content({"id": "b", "status": "failed", "results": None}, "cid-1")

    def test_raises_on_per_request_error(self):
        analyzer = self._analyzer()
        batch = {
            "id": "b",
            "status": "completed",
            "results": [{"custom_id": "cid-1", "response": None, "error": {"message": "boom"}}],
        }
        with self.assertRaises(RuntimeError):
            analyzer.extract_batch_content(batch, "cid-1")

    def test_raises_on_non_200_result(self):
        analyzer = self._analyzer()
        batch = {
            "id": "b",
            "status": "completed",
            "results": [{"custom_id": "cid-1", "response": {"status_code": 429, "body": {}}}],
        }
        with self.assertRaises(RuntimeError):
            analyzer.extract_batch_content(batch, "cid-1")


class TestBatchFallback(BatchTestCase):
    def test_falls_back_to_sync_model_on_timeout(self):
        analyzer = self._analyzer(fallback=True)
        analyzer.call_batch_api = MagicMock(side_effect=TimeoutError("too slow"))
        analyzer.call_chat_completions = MagicMock(return_value="sync result")

        result = analyzer.call_openrouter([{"role": "user", "content": "hi"}])

        assert result == "sync result"
        # The ":batch" suffix must be dropped — chat/completions rejects it
        assert analyzer.call_chat_completions.call_args.args[1] == "google/gemini-3.7-flash"

    def test_raises_when_fallback_disabled(self):
        analyzer = self._analyzer(fallback=False)
        analyzer.call_batch_api = MagicMock(side_effect=TimeoutError("too slow"))
        analyzer.call_chat_completions = MagicMock(return_value="sync result")

        with self.assertRaises(TimeoutError):
            analyzer.call_openrouter([{"role": "user", "content": "hi"}])
        analyzer.call_chat_completions.assert_not_called()


class TestPromptAdaptsToTransport(BatchTestCase):
    TICKERS = [{"ticker": "AAPL", "name": "Apple", "pe": "30"}]

    def test_batch_prompt_does_not_promise_web_search(self):
        analyzer = self._analyzer()
        prompt = analyzer.build_batch_analysis_prompt(self.TICKERS, "2026-08-25")
        assert "web search" not in prompt.lower()
        assert "AAPL" in prompt

    def test_sync_prompt_still_asks_for_web_search(self):
        analyzer = self._analyzer()
        analyzer.batch_mode = False
        prompt = analyzer.build_batch_analysis_prompt(self.TICKERS, "2026-08-25")
        assert "web search" in prompt.lower()


class TestEnvInt(unittest.TestCase):
    def test_reads_valid_int(self):
        with patch.dict("os.environ", {"X": "42"}):
            assert OpenRouterAnalyzer.env_int("X", 15) == 42

    def test_defaults_when_unset(self):
        with patch.dict("os.environ", {}, clear=True):
            assert OpenRouterAnalyzer.env_int("X", 15) == 15

    def test_defaults_on_garbage(self):
        with patch.dict("os.environ", {"X": "soon"}):
            assert OpenRouterAnalyzer.env_int("X", 15) == 15

    def test_defaults_on_non_positive(self):
        with patch.dict("os.environ", {"X": "0"}):
            assert OpenRouterAnalyzer.env_int("X", 15) == 15


if __name__ == "__main__":
    unittest.main()
