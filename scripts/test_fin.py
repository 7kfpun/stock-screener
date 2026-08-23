import os
import sys

import pytest
import pandas as pd
import requests
from io import StringIO
from collections import namedtuple
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(__file__))
import fin


class TestStockScreener:
    """Tests for the stock screener script."""

    @pytest.fixture
    def sample_financial_data(self):
        """Create sample financial data for testing."""
        return pd.DataFrame({
            'Ticker': ['AAPL', 'GOOGL', 'MSFT'],
            'Market Cap': ['$3000000000000', '$2000000000000', '$2500000000000'],
            'Price': [175.0, 140.0, 375.0],
            'Change': [0.02, -0.01, 0.015],
            'Volume': [50000000, 25000000, 30000000],
            'P/E': [28.5, 25.3, 32.1],
            'Dividend': [0.0055, 0.0, 0.0075],
            'ROA': [0.25, 0.18, 0.22],
            'ROE': [1.5, 0.95, 1.2],
            'ROIC': [0.35, 0.28, 0.31],
            'Curr R': [1.1, 1.5, 2.0],
            'Quick R': [1.0, 1.3, 1.8],
            'LTDebt/Eq': [1.5, 0.8, 1.2],
            'Debt/Eq': [1.6, 0.9, 1.3],
            'Gross M': [0.42, 0.56, 0.68],
            'Oper M': [0.30, 0.28, 0.42],
            'Profit M': [0.25, 0.22, 0.35],
            'Earnings': ['Oct 31/a', 'Oct 24/a', 'Oct 25/a']
        })

    @pytest.fixture
    def sample_overview_data(self):
        """Create sample overview data for testing."""
        return pd.DataFrame({
            'Ticker': ['AAPL', 'GOOGL', 'MSFT'],
            'Market Cap': ['$3000000000000', '$2000000000000', '$2500000000000'],
            'Price': [175.0, 140.0, 375.0],
            'Change': [0.02, -0.01, 0.015],
            'Volume': [50000000, 25000000, 30000000],
            'Company': ['Apple Inc', 'Alphabet Inc', 'Microsoft Corp'],
            'Sector': ['Technology', 'Technology', 'Technology'],
            'Industry': ['Consumer Electronics', 'Internet Services', 'Software'],
            'Country': ['USA', 'USA', 'USA'],
            'Beta': [1.2, 1.1, 0.9],
            'ATR': [3.5, 4.2, 5.1]
        })

    @pytest.fixture
    def sample_technical_data(self):
        """Create sample technical data for testing."""
        return pd.DataFrame({
            'Ticker': ['AAPL', 'GOOGL', 'MSFT'],
            'Price': [175.0, 140.0, 375.0],
            'Change': [0.02, -0.01, 0.015],
            'Volume': [50000000, 25000000, 30000000],
            'SMA20': [0.05, 0.03, 0.07],
            'SMA50': [0.08, 0.05, 0.10],
            'SMA200': [0.15, 0.12, 0.18],
            '52W High': [-0.10, -0.15, -0.08],
            '52W Low': [0.45, 0.35, 0.50],
            'RSI': [65.0, 58.0, 62.0],
            'Change from Open': ['2.5%', '-1.2%', '1.8%'],
            'Gap': [0.01, -0.005, 0.008]
        })

    @pytest.fixture
    def sample_valuation_data(self):
        """Create sample valuation data for testing."""
        return pd.DataFrame({
            'Ticker': ['AAPL', 'GOOGL', 'MSFT'],
            'Market Cap': ['$3000000000000', '$2000000000000', '$2500000000000'],
            'Price': [175.0, 140.0, 375.0],
            'Change': [0.02, -0.01, 0.015],
            'Volume': [50000000, 25000000, 30000000],
            'P/E': [28.5, 25.3, 32.1],
            'Fwd P/E': [25.0, 22.0, 28.0],
            'PEG': [1.2, 0.95, 1.5],
            'P/S': [7.5, 6.2, 12.0],
            'P/B': [45.0, 7.5, 12.5],
            'P/C': [25.0, 20.0, 30.0],
            'P/FCF': [28.0, 24.0, 35.0],
            'EPS This Y': ['15%', '12%', '18%'],
            'EPS Next Y': ['10%', '14%', '12%'],
            'EPS Past 5Y': ['20%', '18%', '22%'],
            'EPS Next 5Y': ['12%', '15%', '14%'],
            'Sales Past 5Y': ['10%', '15%', '12%']
        })

    def test_calculate_investor_score(self):
        """Test the investor score calculation logic."""
        sample_row = pd.Series({
            'PEG': 0.8,  # Should score 30 (< 1)
            'ROE': 0.25,  # Should score 30 (> 0.2)
            'Profit M': 0.25,  # Should score 20 (> 0.2)
            'EPS Next 5Y': 0.35  # Should score 20 (> 0.3)
        })

        score = fin.calculate_investor_score(sample_row)
        assert score == 100, f"Expected score of 100, got {score}"

    def test_calculate_investor_score_with_nan(self):
        """Test investor score calculation with NaN values."""
        sample_row = pd.Series({
            'PEG': float('nan'),
            'ROE': 0.15,  # Should score 20
            'Profit M': float('nan'),
            'EPS Next 5Y': 0.25  # Should score 15
        })

        score = fin.calculate_investor_score(sample_row)
        assert score == 35, f"Expected score of 35, got {score}"

    def test_market_cap_conversion(self):
        """Test market cap string to float conversion."""
        df = pd.DataFrame({
            'Market Cap': ['$1,500,000,000', '$300,000,000', '$5,000,000,000']
        })

        df['Market Cap'] = df['Market Cap'].replace(r'[\$,]', '', regex=True).astype(float)

        assert df['Market Cap'].iloc[0] == 1500000000.0
        assert df['Market Cap'].iloc[1] == 300000000.0
        assert df['Market Cap'].iloc[2] == 5000000000.0

    def test_factor_filters(self):
        """Test the factor filter logic."""
        df = pd.DataFrame({
            'Price': [20.0, 10.0, 18.0],
            'Market Cap': [600000000.0, 400000000.0, 1000000000.0],
            'Volume': [150000, 50000, 200000],
            'SMA50': [0.05, -0.02, 0.10],
            'SMA200': [0.08, -0.05, 0.15],
            '52W Low': [0.35, 0.20, 0.50],
            '52W High': [-0.15, -0.25, -0.10]
        })

        # Apply factor filters
        df['Price_Over_15'] = df['Price'].apply(lambda x: 'True' if x >= 15 else 'False')
        df['Market_Cap_Over_500m'] = df['Market Cap'].apply(lambda x: 'True' if x >= 500000000 else 'False')
        df['Avg_Volume_Over_100k'] = df['Volume'].apply(lambda x: 'True' if x >= 100000 else 'False')
        df['Price_Above_SMA50'] = df['SMA50'].apply(lambda x: 'True' if x >= 0 else 'False')
        df['Price_Above_SMA200'] = df['SMA200'].apply(lambda x: 'True' if x >= 0 else 'False')
        df['Pct_Above_Low_Over_30%'] = df['52W Low'].apply(lambda x: 'True' if x >= 0.3 else 'False')
        df['Pct_Below_High_Under_20%'] = df['52W High'].apply(lambda x: 'True' if x >= -0.2 else 'False')

        # Check first row (should pass all filters)
        assert df['Price_Over_15'].iloc[0] == 'True'
        assert df['Market_Cap_Over_500m'].iloc[0] == 'True'
        assert df['Avg_Volume_Over_100k'].iloc[0] == 'True'
        assert df['Pct_Above_Low_Over_30%'].iloc[0] == 'True'
        assert df['Pct_Below_High_Under_20%'].iloc[0] == 'True'

        # Check second row (should fail multiple filters)
        assert df['Price_Over_15'].iloc[1] == 'False'
        assert df['Market_Cap_Over_500m'].iloc[1] == 'False'

    def test_csv_output_format(self):
        """Test that CSV output uses tab delimiter."""
        df = pd.DataFrame({
            'Ticker': ['AAPL', 'GOOGL'],
            'Price': [175.0, 140.0],
            'Volume': [50000000, 25000000]
        })

        output = StringIO()
        df.to_csv(output, sep='\t', index=False)
        csv_content = output.getvalue()

        # Check that tabs are used
        assert '\t' in csv_content
        # Check header
        assert 'Ticker\tPrice\tVolume' in csv_content
        # Check data
        assert 'AAPL\t175.0\t50000000' in csv_content

    def test_percentage_conversion(self):
        """Test conversion of percentage strings to floats."""
        df = pd.DataFrame({
            'EPS This Y': ['15%', '12%', '8%']
        })

        df['EPS This Y'] = df['EPS This Y'].astype(str).str.replace('%', '').astype(float) / 100

        assert df['EPS This Y'].iloc[0] == 0.15
        assert df['EPS This Y'].iloc[1] == 0.12
        assert df['EPS This Y'].iloc[2] == 0.08

    def test_data_merge(self, sample_financial_data, sample_overview_data, sample_technical_data, sample_valuation_data):
        """Test merging of different data tables."""
        merged = fin.merge_screener_views(
            sample_financial_data,
            sample_overview_data,
            sample_technical_data,
            sample_valuation_data,
        )

        # Check that all tickers are present
        assert len(merged) == 3
        assert set(merged['Ticker']) == {'AAPL', 'GOOGL', 'MSFT'}

        # Check that columns from all tables are present
        assert 'Company' in merged.columns  # from overview
        assert 'SMA50' in merged.columns  # from technical
        assert 'PEG' in merged.columns  # from valuation
        assert 'ROE' in merged.columns  # from financial

        # Check no duplicate columns
        assert merged.columns.tolist().count('Price') == 1
        assert merged.columns.tolist().count('Market Cap') == 1

        # No pandas merge-suffix leakage
        assert not [c for c in merged.columns if c.endswith(('_x', '_y'))]


class TestFinvizColumnRename:
    """Regression tests for the Aug 2026 outage.

    finviz renamed the screener column "Change" to "Change %". The pipeline
    merges four screener views that each repeat it, so the rename first
    surfaced as `KeyError: "['Change'] not found in axis"` and then, once the
    drops were made tolerant, as `MergeError: Passing 'suffixes' which cause
    duplicate columns {'Change %_x'} is not allowed`.
    """

    # Column sets as finviz serves them today, taken from the header of a real
    # public/data/*.csv snapshot, with "Change" renamed to "Change %".
    FINANCIAL = ["Ticker", "Market Cap", "Dividend", "ROA", "ROE", "ROIC", "Curr R",
                 "Quick R", "LTDebt/Eq", "Debt/Eq", "Gross M", "Oper M", "Profit M",
                 "Earnings", "Price", "Change %", "Volume"]
    OVERVIEW = ["Ticker", "Company", "Sector", "Industry", "Country", "Market Cap",
                "P/E", "Price", "Change %", "Volume"]
    TECHNICAL = ["Ticker", "Beta", "ATR", "SMA20", "SMA50", "SMA200", "52W High",
                 "52W Low", "RSI", "Price", "Change from Open", "Gap", "Change %",
                 "Volume"]
    VALUATION = ["Ticker", "Market Cap", "P/E", "Forward P/E", "PEG", "P/S", "P/B",
                 "P/C", "P/FCF", "EPS This Y", "EPS Next Y", "EPS Past 5Y",
                 "EPS Next 5Y", "Sales Past 5Y", "Price", "Change %", "Volume"]

    def _views(self, change_column="Change %"):
        def frame(columns):
            renamed = [change_column if c == "Change %" else c for c in columns]
            return pd.DataFrame({c: [1, 2] for c in renamed} | {"Ticker": ["AAPL", "MSFT"]})
        return [frame(c) for c in
                (self.FINANCIAL, self.OVERVIEW, self.TECHNICAL, self.VALUATION)]

    def _merge(self, change_column="Change %"):
        views = [fin.normalize_columns(v) for v in self._views(change_column)]
        return fin.merge_screener_views(*views)

    def test_renamed_change_column_is_normalized(self):
        """'Change %' is mapped back to the canonical 'Change'."""
        merged = self._merge("Change %")
        assert "Change" in merged.columns
        assert "Change %" not in merged.columns

    def test_merge_does_not_raise_on_renamed_column(self):
        """The merge no longer dies on the duplicate-suffix collision."""
        merged = self._merge("Change %")
        assert not [c for c in merged.columns if c.endswith(("_x", "_y"))]

    def test_original_hardcoded_drop_would_have_failed(self):
        """Guards the fix: the old hardcoded drop list still breaks on rename.

        Reproduces the first CI failure --
        `KeyError: "['Change'] not found in axis"`. If this ever stops raising,
        finviz has reverted the rename and the alias entry can be revisited.
        """
        financial, overview, _technical, _valuation = self._views("Change %")
        with pytest.raises(KeyError, match="not found in axis"):
            financial.merge(
                overview.drop(columns=["Market Cap", "Price", "Change", "Volume"]),
                on="Ticker", how="left",
            )

    def test_tolerant_drop_would_have_collided_on_suffixes(self):
        """Guards the fix: errors='ignore' alone reintroduces the outage.

        Reproduces the second CI failure -- once the drops were made tolerant,
        the un-dropped duplicate collided during merge suffixing with
        `Passing 'suffixes' which cause duplicate columns {'Change %_x'}`.
        """
        financial, overview, technical, valuation = self._views("Change %")
        with pytest.raises(pd.errors.MergeError, match=r"Change %_x"):
            (
                financial.merge(
                    overview.drop(
                        columns=["Market Cap", "Price", "Change", "Volume"],
                        errors="ignore",
                    ),
                    on="Ticker", how="left",
                )
                .merge(
                    technical.drop(
                        columns=["Price", "Change", "Volume"], errors="ignore"
                    ),
                    on="Ticker", how="left",
                )
                .merge(
                    valuation.drop(
                        columns=["Market Cap", "Price", "Change", "Volume", "P/E"],
                        errors="ignore",
                    ),
                    on="Ticker", how="left",
                )
            )

    def test_pipeline_still_works_if_finviz_reverts(self):
        """A revert to 'Change' must keep working -- the alias is a no-op."""
        merged = self._merge("Change")
        assert "Change" in merged.columns
        assert not [c for c in merged.columns if c.endswith(("_x", "_y"))]

    def test_merged_schema_matches_required_columns(self):
        """Everything the frontend needs survives the merge."""
        merged = self._merge("Change %")
        merged["Investor_Score"] = 0  # computed downstream, before the check
        assert fin.missing_required_columns(merged) == []

    def test_guard_detects_genuinely_missing_column(self):
        """A column finviz drops outright is caught, not silently omitted."""
        merged = self._merge("Change %")
        merged["Investor_Score"] = 0
        assert fin.missing_required_columns(merged.drop(columns=["Change"])) == ["Change"]

    def test_merge_is_order_independent_of_alias_map(self):
        """Secondary views never overwrite financial_data's columns."""
        financial, overview, technical, valuation = (
            fin.normalize_columns(v) for v in self._views("Change %")
        )
        merged = fin.merge_screener_views(financial, overview, technical, valuation)
        for column in ("Price", "Change", "Volume", "Market Cap"):
            assert merged.columns.tolist().count(column) == 1


class TestFetchRetries:
    """A transient network error must not cost a whole trading day.

    finviz's screener has no history endpoint, so a fetch lost to a blip is
    gone for good -- there is nothing to backfill it from later.
    """

    def _screener(self, side_effect):
        """A screener class whose screener_view() follows `side_effect`."""
        screener = MagicMock()
        screener.screener_view.side_effect = side_effect
        return MagicMock(return_value=screener), screener

    def test_transient_error_is_retried_then_succeeds(self):
        frame = pd.DataFrame({"Ticker": ["AAPL"]})
        cls, screener = self._screener(
            [requests.exceptions.ConnectionError("boom"), frame]
        )
        views = {}
        with patch.object(fin.time, "sleep") as sleep:
            result = fin.fetch_view("technical", cls, {}, views)
        assert screener.screener_view.call_count == 2
        assert result is frame
        assert views["technical"] is frame
        sleep.assert_called_once_with(fin.FETCH_BACKOFF_SECONDS)

    def test_backoff_is_exponential(self):
        frame = pd.DataFrame({"Ticker": ["AAPL"]})
        cls, _ = self._screener(
            [requests.exceptions.Timeout("t1"), requests.exceptions.Timeout("t2"), frame]
        )
        with patch.object(fin.time, "sleep") as sleep:
            fin.fetch_view("technical", cls, {}, {})
        assert [c.args[0] for c in sleep.call_args_list] == [
            fin.FETCH_BACKOFF_SECONDS,
            fin.FETCH_BACKOFF_SECONDS * 2,
        ]

    def test_persistent_error_raises_after_budget(self):
        cls, screener = self._screener(requests.exceptions.ConnectionError("down"))
        with patch.object(fin.time, "sleep"):
            with pytest.raises(requests.exceptions.ConnectionError):
                fin.fetch_view("technical", cls, {}, {}, max_attempts=3)
        assert screener.screener_view.call_count == 3

    def test_non_network_error_is_not_retried(self):
        """A reshaped page or bad filter fails identically every time."""
        cls, screener = self._screener(ValueError("Invalid filter"))
        with patch.object(fin.time, "sleep") as sleep:
            with pytest.raises(ValueError):
                fin.fetch_view("technical", cls, {}, {})
        assert screener.screener_view.call_count == 1
        sleep.assert_not_called()

    def test_failed_view_is_absent_from_diagnostics(self):
        """views records only what was actually fetched."""
        cls, _ = self._screener(requests.exceptions.ConnectionError("down"))
        views = {}
        with patch.object(fin.time, "sleep"):
            with pytest.raises(requests.exceptions.ConnectionError):
                fin.fetch_view("technical", cls, {}, views)
        assert views == {}


class TestPercentSuffixRename:
    """Regression tests for the Aug 20 2026 outage.

    Two weeks after finviz renamed "Change" to "Change %", it renamed
    "Change from Open" the same way, and the pipeline died on
    `KeyError: 'Change from Open'` (run 32439240995). The alias map only knew
    the one literal, so the second rename cost another red run. These tests
    pin the generalized behaviour instead of the next literal.
    """

    def test_suffixed_column_is_unsuffixed(self):
        """Any " %"-suffixed column is canonicalized, not just "Change %"."""
        df = pd.DataFrame({"Ticker": ["AAPL"], "Change from Open %": ["2.5%"]})
        normalized = fin.normalize_columns(df)
        assert "Change from Open" in normalized.columns
        assert "Change from Open %" not in normalized.columns

    def test_change_alias_still_covered(self):
        """The #227 rename keeps working under the generalized rule."""
        df = pd.DataFrame({"Ticker": ["AAPL"], "Change %": [0.02]})
        assert "Change" in fin.normalize_columns(df).columns

    def test_unsuffixed_columns_are_untouched(self):
        """Columns without the suffix pass through unchanged."""
        columns = ["Ticker", "Price", "SMA50", "Pct_Above_Low_Over_30%"]
        df = pd.DataFrame({c: [1] for c in columns})
        assert list(fin.normalize_columns(df).columns) == columns

    def test_no_rename_when_canonical_name_is_taken(self):
        """A collision must not be manufactured.

        If finviz ever serves "Change" and "Change %" as genuinely distinct
        columns, unsuffixing would produce a duplicate that breaks the merge
        instead of fixing it. Leave the suffixed one alone.
        """
        df = pd.DataFrame({"Ticker": ["AAPL"], "Change": [0.02], "Change %": [2.0]})
        normalized = fin.normalize_columns(df)
        assert list(normalized.columns) == ["Ticker", "Change", "Change %"]

    def test_two_suffixed_columns_cannot_collapse_together(self):
        """Only the first of two columns sharing a canonical name is renamed."""
        df = pd.DataFrame({"Ticker": ["AAPL"], "Gap %": [1.0], "Gap  %": [2.0]})
        normalized = fin.normalize_columns(df)
        assert normalized.columns.tolist().count("Gap") == 1

    def test_merge_survives_the_aug_20_shape(self):
        """The exact rename that broke run 32439240995 now merges cleanly."""
        technical = pd.DataFrame({
            "Ticker": ["AAPL", "MSFT"],
            "SMA50": [0.08, 0.10],
            "Change from Open %": ["2.5%", "1.8%"],
            "Change %": [0.02, 0.015],
        })
        financial = pd.DataFrame({"Ticker": ["AAPL", "MSFT"], "ROE": [1.5, 1.2]})
        merged = fin.merge_screener_views(
            fin.normalize_columns(financial), fin.normalize_columns(technical)
        )
        assert "Change from Open" in merged.columns
        assert not [c for c in merged.columns if c.endswith(("_x", "_y"))]


class TestOptionalColumns:
    """An optional column must never take the daily update down.

    "Change from Open" is not in REQUIRED_COLUMNS and no frontend code reads
    it, yet its unconditional conversion is what failed the Aug 20 run.
    """

    def test_optional_columns_are_not_required(self):
        """The two contracts must not overlap, or the tolerance is a lie."""
        assert not set(fin.OPTIONAL_PERCENT_COLUMNS) & set(fin.REQUIRED_COLUMNS)

    def test_to_fraction_converts_percentages(self):
        df = pd.DataFrame({"Change from Open": ["2.5%", "-1.2%"]})
        fin.to_fraction(df, "Change from Open")
        assert df["Change from Open"].iloc[0] == pytest.approx(0.025)
        assert df["Change from Open"].iloc[1] == pytest.approx(-0.012)


# Both streams of one mocked pipeline run: the CSV on stdout, the notes and
# diagnostics on stderr.
Run = namedtuple("Run", ["csv", "stderr"])


class TestMainPipeline:
    """End-to-end runs of main() with the screener views mocked out."""

    FINANCIAL = {"Market Cap": ["$3000000000000", "$2500000000000"],
                 "Dividend": [0.0055, 0.0075], "ROA": [0.25, 0.22],
                 "ROE": [1.5, 1.2], "ROIC": [0.35, 0.31], "Gross M": [0.42, 0.68],
                 "Profit M": [0.25, 0.35], "Price": [175.0, 375.0],
                 "Change %": [0.02, 0.015], "Volume": [50000000, 30000000]}
    OVERVIEW = {"Company": ["Apple Inc", "Microsoft Corp"],
                "Sector": ["Technology", "Technology"],
                "Industry": ["Consumer Electronics", "Software"],
                "Country": ["USA", "USA"], "Beta": [1.2, 0.9],
                "Price": [175.0, 375.0], "Change %": [0.02, 0.015],
                "Volume": [50000000, 30000000]}
    VALUATION = {"P/E": [28.5, 32.1], "Forward P/E": [25.0, 28.0],
                 "PEG": [0.8, 1.5], "P/S": [7.5, 12.0], "P/B": [45.0, 12.5],
                 "EPS This Y": ["15%", "18%"], "EPS Next Y": ["10%", "12%"],
                 "EPS Past 5Y": ["20%", "22%"], "EPS Next 5Y": ["35%", "14%"],
                 "Sales Past 5Y": ["10%", "12%"], "Price": [175.0, 375.0],
                 "Change %": [0.02, 0.015], "Volume": [50000000, 30000000]}
    TECHNICAL = {"SMA20": [0.05, 0.07], "SMA50": [0.08, 0.10],
                 "SMA200": [0.15, 0.18], "52W High": [-0.10, -0.08],
                 "52W Low": [0.45, 0.50], "RSI": [65.0, 62.0],
                 "Gap": [0.01, 0.008], "Price": [175.0, 375.0],
                 "Change %": [0.02, 0.015], "Volume": [50000000, 30000000]}

    def _run(self, capsys, technical_extra=None, drop_from_valuation=None):
        """Run main() with mocked screeners; return the parsed CSV."""
        def view(payload):
            frame = pd.DataFrame({"Ticker": ["AAPL", "MSFT"], **payload})
            screener = MagicMock()
            screener.screener_view.return_value = frame
            return MagicMock(return_value=screener)

        technical = {**self.TECHNICAL, **(technical_extra or {})}
        valuation = {k: v for k, v in self.VALUATION.items()
                     if k != drop_from_valuation}
        with patch.object(fin, "Financial", view(self.FINANCIAL)), \
             patch.object(fin, "Overview", view(self.OVERVIEW)), \
             patch.object(fin, "Valuation", view(valuation)), \
             patch.object(fin, "Technical", view(technical)):
            fin.main()
        # readouterr() drains the buffers, so capture both streams once here
        # rather than leaving a second caller with an empty string.
        captured = capsys.readouterr()
        return Run(pd.read_csv(StringIO(captured.out), sep="\t"), captured.err)

    RENAMED = {"Change from Open %": ["2.5%", "1.8%"]}

    def test_aug_20_rename_no_longer_fails_the_run(self, capsys):
        """`KeyError: 'Change from Open'` -- the outage, end to end."""
        result = self._run(capsys, technical_extra=self.RENAMED).csv
        assert fin.missing_required_columns(result) == []
        assert result["Change from Open"].iloc[0] == pytest.approx(0.025)
        # The canonical "Change" survives the rename too.
        assert "Change %" not in result.columns
        assert "Change" in result.columns

    def test_run_survives_a_dropped_optional_column(self, capsys):
        """finviz retiring the column outright is also non-fatal."""
        result = self._run(capsys).csv
        assert fin.missing_required_columns(result) == []
        assert "Change from Open" not in result.columns

    def test_dropped_optional_column_is_announced(self, capsys):
        """Skipping it silently would hide a schema change from the CI log."""
        assert "optional column 'Change from Open'" in self._run(capsys).stderr

    def test_missing_required_column_still_fails_loudly(self, capsys):
        """Tolerance is scoped to optional columns; the contract still bites."""
        with pytest.raises(SystemExit) as exc:
            self._run(capsys, technical_extra=self.RENAMED,
                      drop_from_valuation="PEG")
        assert exc.value.code == 1

    def test_failure_dump_reports_the_fetched_columns(self, capsys):
        """The diagnostic that stayed silent on Aug 20 now names the columns.

        It read globals(), which never sees frames local to main(), so the CI
        log carried the bare KeyError and nothing else.
        """
        with pytest.raises(SystemExit):
            self._run(capsys, technical_extra=self.RENAMED,
                      drop_from_valuation="PEG")
        err = capsys.readouterr().err
        assert "financial:" in err and "technical:" in err
        # The raw, un-normalized finviz headers are what diagnose the next break.
        assert "Change from Open %" in err


class TestExtractJsonFromResponse:
    """Tests for OpenRouterPRReviewer.extract_json_from_response"""

    def _extract(self, text):
        """Import and call the static method under test"""
        import sys, os
        sys.path.insert(0, os.path.dirname(__file__))
        from openrouter_pr_review import OpenRouterPRReviewer
        return OpenRouterPRReviewer.extract_json_from_response(text)

    def test_plain_json(self):
        """Clean JSON string parses directly"""
        response = '{"AGI": {"description": "test", "latest_news": "", "why_selected": ""}}'
        result = self._extract(response)
        assert result["AGI"]["description"] == "test"

    def test_json_fenced_with_backticks(self):
        """JSON wrapped in ```json ... ``` fences is extracted correctly"""
        response = '```json\n{"AGI": {"description": "test", "latest_news": "", "why_selected": ""}}\n```'
        result = self._extract(response)
        assert result["AGI"]["description"] == "test"

    def test_json_fenced_without_language_tag(self):
        """JSON wrapped in bare ``` ... ``` fences is extracted correctly"""
        response = '```\n{"AGI": {"description": "test", "latest_news": "", "why_selected": ""}}\n```'
        result = self._extract(response)
        assert result["AGI"]["description"] == "test"

    def test_json_with_leading_text(self):
        """JSON preceded by prose text is extracted via brace detection"""
        response = 'Here is the analysis:\n{"AGI": {"description": "test", "latest_news": "", "why_selected": ""}}'
        result = self._extract(response)
        assert result["AGI"]["description"] == "test"

    def test_json_with_trailing_text(self):
        """JSON followed by trailing text is extracted via brace detection"""
        response = '{"AGI": {"description": "test", "latest_news": "", "why_selected": ""}}\nSome trailing note.'
        result = self._extract(response)
        assert result["AGI"]["description"] == "test"

    def test_multiple_tickers(self):
        """Multiple tickers in plain JSON parse correctly"""
        response = '{"AGI": {"description": "a", "latest_news": "b", "why_selected": "c"}, "NVDA": {"description": "d", "latest_news": "e", "why_selected": "f"}}'
        result = self._extract(response)
        assert result["AGI"]["description"] == "a"
        assert result["NVDA"]["description"] == "d"

    def test_raises_on_unparseable_response(self):
        """Completely unparseable input raises JSONDecodeError"""
        import json
        with pytest.raises(json.JSONDecodeError):
            self._extract("This is not JSON at all and has no braces")


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
