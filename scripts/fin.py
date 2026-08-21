import pandas as pd
import json
import sys
import warnings
import os
from finvizfinance.screener.financial import Financial
from finvizfinance.screener.overview import Overview
from finvizfinance.screener.valuation import Valuation
from finvizfinance.screener.technical import Technical
from datetime import datetime
from zoneinfo import ZoneInfo

# Suppress warnings and logs from finvizfinance
warnings.filterwarnings("ignore")

# Save original stdout for later
original_stdout = sys.stdout

# finviz renames screener columns from time to time -- it moved "Change" to
# "Change %" in Aug 2026, which broke the pipeline. Map known aliases back to
# the canonical names the frontend and every historical public/data/*.csv
# already use, so a cosmetic upstream rename doesn't change our output schema.
COLUMN_ALIASES = {
    "Change %": "Change",
}

# Columns the frontend depends on, mirroring STOCK_NUMERIC_FIELDS in
# src/domain/stock/stock.js plus the identifier columns. "Forward P/E" is the
# name the pipeline actually emits (the frontend's "Fwd P/E" has never matched).
REQUIRED_COLUMNS = [
    "Ticker",
    "Company",
    "Sector",
    "Industry",
    "Country",
    "Investor_Score",
    "Price",
    "Change",
    "Market Cap",
    "Volume",
    "P/E",
    "Forward P/E",
    "PEG",
    "P/S",
    "P/B",
    "ROE",
    "ROA",
    "ROIC",
    "Profit M",
    "Gross M",
    "EPS This Y",
    "EPS Next Y",
    "EPS Next 5Y",
    "Sales Past 5Y",
    "Beta",
    "SMA50",
    "SMA200",
    "52W High",
    "52W Low",
    "RSI",
]


def normalize_columns(df):
    """Rename known finviz column aliases to the canonical pipeline names."""
    return df.rename(columns=COLUMN_ALIASES)


def merge_screener_views(financial_data, *secondary_views):
    """Merge the screener views onto financial_data, keyed on Ticker.

    Each secondary view repeats columns financial_data already carries (Price,
    Change, Volume, ...), so the overlap is dropped before merging. The overlap
    is computed rather than hardcoded: a fixed drop list silently rots when
    finviz renames a column, and the surviving duplicate then collides during
    merge suffixing ("duplicate columns {'Change %_x'} is not allowed").
    """
    merged = financial_data
    for view in secondary_views:
        redundant = [c for c in view.columns if c != "Ticker" and c in merged.columns]
        merged = merged.merge(view.drop(columns=redundant), on="Ticker", how="left")
    return merged


def missing_required_columns(df):
    """Return the REQUIRED_COLUMNS absent from df, in declaration order."""
    return [c for c in REQUIRED_COLUMNS if c not in df.columns]


def calculate_investor_score(row):
    """Score a stock 0-100 on value, profitability, margin and growth."""
    score = 0

    # PEG ratio score (lower is better)
    if not pd.isna(row["PEG"]):
        if row["PEG"] > 0 and row["PEG"] < 1:
            score += 30
        elif row["PEG"] >= 1 and row["PEG"] < 2:
            score += 20
        elif row["PEG"] >= 2:
            score += 10

    # ROE score (higher is better)
    if not pd.isna(row["ROE"]):
        if row["ROE"] > 0.2:  # Over 20%
            score += 30
        elif row["ROE"] > 0.1:  # Over 10%
            score += 20
        elif row["ROE"] > 0:  # Positive
            score += 10

    # Profit margin score (higher is better)
    if not pd.isna(row["Profit M"]):
        if row["Profit M"] > 0.2:  # Over 20%
            score += 20
        elif row["Profit M"] > 0.1:  # Over 10%
            score += 15
        elif row["Profit M"] > 0:  # Positive
            score += 10

    # Future growth score (higher is better)
    if not pd.isna(row["EPS Next 5Y"]):
        if row["EPS Next 5Y"] > 0.3:  # Over 30%
            score += 20
        elif row["EPS Next 5Y"] > 0.2:  # Over 20%
            score += 15
        elif row["EPS Next 5Y"] > 0.1:  # Over 10%
            score += 10

    return score


def main():
    try:
        # Apply custom filters
        filters = {
            "Market Cap.": "+Small (over $300mln)",
            "Average Volume": "Over 100K",
            "Price": "Over $15",
            "50-Day Simple Moving Average": "Price above SMA50",
            "200-Day Simple Moving Average": "Price above SMA200",
            "InstitutionalOwnership": "Over 20%",
            "EPS growththis year": "Positive (>0%)",
            "EPS growthnext year": "Positive (>0%)",
            "EPS growthpast 5 years": "Positive (>0%)",
            "EPS growthnext 5 years": "Positive (>0%)",
            "EPS growthqtr over qtr": "High (>25%)",
            "Sales growthpast 5 years": "Positive (>0%)",
            "Sales growthqtr over qtr": "Positive (>0%)",
        }

        # Redirect stdout to suppress finvizfinance progress messages
        print("Fetching financial data...", file=sys.stderr)
        sys.stdout = open(os.devnull, 'w')
        financial = Financial()
        financial.set_filter(filters_dict=filters)
        financial_data = financial.screener_view()
        sys.stdout = original_stdout

        print("Fetching overview data...", file=sys.stderr)
        sys.stdout = open(os.devnull, 'w')
        overview = Overview()
        overview.set_filter(filters_dict=filters)
        overview_data = overview.screener_view()
        sys.stdout = original_stdout

        print("Fetching valuation data...", file=sys.stderr)
        sys.stdout = open(os.devnull, 'w')
        valuation = Valuation()
        valuation.set_filter(filters_dict=filters)
        valuation_data = valuation.screener_view()
        sys.stdout = original_stdout

        print("Fetching technical data...", file=sys.stderr)
        sys.stdout = open(os.devnull, 'w')
        technical = Technical()
        technical.set_filter(filters_dict=filters)
        technical_data = technical.screener_view()
        sys.stdout = original_stdout

        print("Processing data...", file=sys.stderr)

        financial_data = normalize_columns(financial_data)
        overview_data = normalize_columns(overview_data)
        technical_data = normalize_columns(technical_data)
        valuation_data = normalize_columns(valuation_data)

        all_table = merge_screener_views(
            financial_data, overview_data, technical_data, valuation_data
        )

        # FACTOR FILTER #1
        all_table["Price_Over_15"] = all_table["Price"].apply(
            lambda x: "True" if x >= 15 else "False"
        )

        # FACTOR FILTER #2
        all_table["Market Cap"] = (
            all_table["Market Cap"].replace("[\\$,]", "", regex=True).astype(float)
        )
        all_table["Market_Cap_Over_500m"] = all_table["Market Cap"].apply(
            lambda x: "True" if x >= 500000000 else "False"
        )

        # FACTOR FILTER #3
        all_table["Avg_Volume_Over_100k"] = all_table["Volume"].apply(
            lambda x: "True" if x >= 100000 else "False"
        )

        # FACTOR FILTER #4
        all_table["Price_Above_SMA50"] = all_table["SMA50"].apply(
            lambda x: "True" if x >= 0 else "False"
        )

        # FACTOR FILTER #5
        all_table["Price_Above_SMA200"] = all_table["SMA200"].apply(
            lambda x: "True" if x >= 0 else "False"
        )

        # FACTOR FILTER #6
        all_table["Pct_Above_Low_Over_30%"] = all_table["52W Low"].apply(
            lambda x: "True" if x >= 0.3 else "False"
        )

        # FACTOR FILTER #7
        all_table["Pct_Below_High_Under_20%"] = all_table["52W High"].apply(
            lambda x: "True" if x >= -0.2 else "False"
        )

        # FACTOR FILTER #8
        all_table["EPS This Y"] = (
            all_table["EPS This Y"].astype(str).str.replace("%", "").astype(float) / 100
        )
        all_table["EPS_This_Y_Positive"] = all_table["EPS This Y"].apply(
            lambda x: "True" if x >= 0 else "False"
        )

        # FACTOR FILTER #9
        all_table["EPS Next Y"] = (
            all_table["EPS Next Y"].astype(str).str.replace("%", "").astype(float) / 100
        )
        all_table["EPS_Next_Y_Positive"] = all_table["EPS Next Y"].apply(
            lambda x: "True" if x >= 0 else "False"
        )

        # FACTOR FILTER #10
        all_table["EPS Past 5Y"] = (
            all_table["EPS Past 5Y"].astype(str).str.replace("%", "").astype(float) / 100
        )
        all_table["EPS_Past_5Y_Positive"] = all_table["EPS Past 5Y"].apply(
            lambda x: "True" if x >= 0 else "False"
        )

        # FACTOR FILTER #11
        all_table["EPS Next 5Y"] = (
            all_table["EPS Next 5Y"].astype(str).str.replace("%", "").astype(float) / 100
        )
        all_table["EPS_Next_5Y_Positive"] = all_table["EPS Next 5Y"].apply(
            lambda x: "True" if x >= 0 else "False"
        )

        # FACTOR FILTER #12
        all_table["Sales Past 5Y"] = (
            all_table["Sales Past 5Y"].astype(str).str.replace("%", "").astype(float) / 100
        )
        all_table["Sales_Past_5Y_Positive"] = all_table["Sales Past 5Y"].apply(
            lambda x: "True" if x >= 0 else "False"
        )

        # FACTOR FILTER #13
        all_table["Change from Open"] = (
            all_table["Change from Open"].astype(str).str.replace("%", "").astype(float)
            / 100
        )

        # Run Day Stamp (use NYSE/Eastern timezone for consistency)
        eastern = ZoneInfo('America/New_York')
        all_table["Run_Day"] = datetime.now(eastern).date().isoformat()

        # Create an Investor Score column for better sorting
        # First, let's handle NaN values in relevant columns
        all_table["PEG"] = pd.to_numeric(all_table["PEG"], errors="coerce")
        all_table["ROE"] = pd.to_numeric(all_table["ROE"], errors="coerce")
        all_table["Profit M"] = pd.to_numeric(all_table["Profit M"], errors="coerce")
        all_table["EPS Next 5Y"] = pd.to_numeric(all_table["EPS Next 5Y"], errors="coerce")

        # Calculate and add investor score
        all_table["Investor_Score"] = all_table.apply(calculate_investor_score, axis=1)

        # Remove records if not meeting FACTOR FILTER criteria 2, 6, 7
        all_table = all_table.loc[
            (all_table["Market_Cap_Over_500m"] == "True")
            & (all_table["Pct_Above_Low_Over_30%"] == "True")
            & (all_table["Pct_Below_High_Under_20%"] == "True")
        ]

        # Sort the table by Investor Score (descending)
        all_table = all_table.sort_values(by="Investor_Score", ascending=False)

        # A column the frontend needs but this script never reads (Change, RSI,
        # Beta, ...) could otherwise vanish from the CSV without failing the run,
        # leaving the workflow to commit degraded data. Check the contract before
        # writing anything.
        missing_columns = missing_required_columns(all_table)
        if missing_columns:
            raise KeyError(
                "screener output is missing columns required by the frontend: "
                f"{missing_columns}. Columns present: {list(all_table.columns)}. "
                "If finviz renamed one of these, add it to COLUMN_ALIASES."
            )

        # Output CSV to stdout
        all_table.to_csv(sys.stdout, sep="\t", index=False)

    except Exception as e:
        # Reset stdout in case of error
        sys.stdout = original_stdout
        print(f"Error: {str(e)}", file=sys.stderr)
        # finviz reshapes its screener headers periodically, and the resulting
        # pandas errors rarely name the column that actually moved. Dump what each
        # view returned so the CI log alone is enough to diagnose the next break.
        for view_name in (
            "financial_data",
            "overview_data",
            "technical_data",
            "valuation_data",
        ):
            view = globals().get(view_name)
            if view is not None:
                print(f"  {view_name}: {list(view.columns)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
