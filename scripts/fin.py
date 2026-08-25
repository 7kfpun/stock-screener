import pandas as pd
import json
import sys
import warnings
import os
from contextlib import redirect_stdout
from finvizfinance.screener.financial import Financial
from finvizfinance.screener.overview import Overview
from finvizfinance.screener.valuation import Valuation
from finvizfinance.screener.technical import Technical
from datetime import datetime
from zoneinfo import ZoneInfo

# Suppress warnings and logs from finvizfinance
warnings.filterwarnings("ignore")

# finviz renames screener columns from time to time, and in Aug 2026 it started
# suffixing percentage columns with " %": first "Change" -> "Change %" (fixed by
# pinning that one alias), then "Change from Open" -> "Change from Open %" two
# weeks later, which broke the pipeline again. Chasing one literal per outage
# doesn't converge, so canonicalize the whole pattern back to the names the
# frontend and every historical public/data/*.csv already use.
PERCENT_SUFFIX = " %"

# Renames that do NOT follow the " %" pattern go here, keyed by the name finviz
# serves and valued by the canonical name this pipeline emits.
COLUMN_ALIASES = {}

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

# Percentage columns worth carrying into the CSV when finviz serves them, but
# that no frontend code reads. If finviz renames or drops one, the daily update
# must still ship: REQUIRED_COLUMNS above is the list this run is allowed to
# fail on. "Change from Open" took the Aug 20 run down purely because the
# conversion below assumed it was always present.
OPTIONAL_PERCENT_COLUMNS = [
    "Change from Open",
]

# Percentage columns the pipeline converts from "15%" to 0.15 unconditionally.
PERCENT_COLUMNS = [
    "EPS This Y",
    "EPS Next Y",
    "EPS Past 5Y",
    "EPS Next 5Y",
    "Sales Past 5Y",
]


def normalize_columns(df):
    """Rename finviz's column spellings to the canonical pipeline names.

    Handles two kinds of rename: explicit entries in COLUMN_ALIASES, and the
    " %" suffix finviz began appending to percentage columns in Aug 2026
    ("Change %", "Change from Open %"). A suffixed column is only unsuffixed
    when the canonical name is free -- if finviz ever serves both "Change" and
    "Change %" as distinct columns, renaming would create a duplicate that
    breaks the merge instead of fixing it.
    """
    renames = {c: COLUMN_ALIASES[c] for c in df.columns if c in COLUMN_ALIASES}
    taken = set(df.columns) | set(renames.values())
    for column in df.columns:
        if column in renames or not column.endswith(PERCENT_SUFFIX):
            continue
        canonical = column[: -len(PERCENT_SUFFIX)]
        if canonical and canonical not in taken:
            renames[column] = canonical
            taken.add(canonical)
    return df.rename(columns=renames)


# The ticker cell finviz serves changed shape in Jul 2026: it now carries a
# single-letter logo placeholder next to the ticker link, and finvizfinance
# reads screener cells with BeautifulSoup's ``.text``, which concatenates every
# descendant string. Every ticker therefore arrives with its own initial
# doubled ("CDNA" -> "CCDNA", "LLY" -> "LLLY", "AU" -> "AAU").
TICKER_COLUMN = "Ticker"

# Below this many rows a frame could plausibly be all AAPL/BB/MMM by chance, so
# the repair refuses to act rather than risk mangling genuine tickers.
MIN_TICKERS_FOR_REPAIR = 10


def repair_doubled_tickers(df):
    """Drop the duplicated initial finviz's logo placeholder prepends.

    Stripping the leading character unconditionally is not safe: AAPL, BB and
    MMM genuinely begin with a repeated letter, so the day finviz drops the
    placeholder an unconditional strip would corrupt them instead. Repair only
    when *every* ticker in a frame of at least MIN_TICKERS_FOR_REPAIR carries a
    doubled initial -- a real screener page never looks like that (the
    pre-July snapshots in public/data hit exactly one row each, AAPL), and the
    check heals itself the moment finviz reverts.

    All four screener views are affected identically, so repairing each view
    before the merge keeps the join key consistent; skipping the repair (tiny
    result set) leaves them consistently doubled rather than half-fixed.
    """
    if TICKER_COLUMN not in df.columns or len(df) == 0:
        return df

    tickers = df[TICKER_COLUMN].astype(str).str.strip()
    present = tickers[tickers != ""]
    doubled = present.map(lambda t: len(t) >= 2 and t[0] == t[1])

    if len(present) < MIN_TICKERS_FOR_REPAIR or not doubled.all():
        # A partially doubled frame is neither the placeholder nor clean data;
        # say so rather than silently shipping half-corrupt tickers.
        if len(present) >= MIN_TICKERS_FOR_REPAIR and doubled.mean() > 0.5:
            print(
                f"Warning: {doubled.sum()}/{len(present)} tickers start with a "
                "doubled letter. That is too many to be real and too few to be "
                "the finviz logo placeholder, so tickers are left untouched.",
                file=sys.stderr,
            )
        return df

    repaired = tickers.str[1:]
    print(
        f"Note: stripped the finviz logo placeholder initial from "
        f"{len(present)} tickers (e.g. {present.iloc[0]} -> {repaired.iloc[0]}).",
        file=sys.stderr,
    )
    return df.assign(**{TICKER_COLUMN: repaired})


def to_fraction(df, column):
    """Convert a finviz percentage column ("2.5%") to a fraction (0.025)."""
    df[column] = df[column].astype(str).str.replace("%", "").astype(float) / 100


def fetch_view(name, screener_cls, filters, views):
    """Fetch one screener view, recording the raw frame in `views`.

    `views` is the diagnostic record the error handler dumps, so it holds the
    frame exactly as finviz served it -- normalization happens afterwards, and
    the raw headers are the thing worth logging when the next rename lands.
    """
    print(f"Fetching {name} data...", file=sys.stderr)
    # finvizfinance prints progress to stdout and our CSV goes to stdout too, so
    # silence it for the duration of the fetch. redirect_stdout restores
    # whatever stream was current (rather than a module-level snapshot taken at
    # import time), closes the devnull handle, and unwinds even if the fetch
    # raises -- all three of which the previous manual swap got wrong.
    with open(os.devnull, "w") as devnull, redirect_stdout(devnull):
        screener = screener_cls()
        screener.set_filter(filters_dict=filters)
        data = screener.screener_view()
    views[name] = data
    return data


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
    # Declared outside the try so the error handler can report whichever views
    # were fetched before the failure.
    views = {}

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

        financial_data = fetch_view("financial", Financial, filters, views)
        overview_data = fetch_view("overview", Overview, filters, views)
        valuation_data = fetch_view("valuation", Valuation, filters, views)
        technical_data = fetch_view("technical", Technical, filters, views)

        print("Processing data...", file=sys.stderr)

        financial_data = repair_doubled_tickers(normalize_columns(financial_data))
        overview_data = repair_doubled_tickers(normalize_columns(overview_data))
        technical_data = repair_doubled_tickers(normalize_columns(technical_data))
        valuation_data = repair_doubled_tickers(normalize_columns(valuation_data))

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

        # FACTOR FILTERS #8-#12
        for column in PERCENT_COLUMNS:
            to_fraction(all_table, column)
        all_table["EPS_This_Y_Positive"] = all_table["EPS This Y"].apply(
            lambda x: "True" if x >= 0 else "False"
        )
        all_table["EPS_Next_Y_Positive"] = all_table["EPS Next Y"].apply(
            lambda x: "True" if x >= 0 else "False"
        )
        all_table["EPS_Past_5Y_Positive"] = all_table["EPS Past 5Y"].apply(
            lambda x: "True" if x >= 0 else "False"
        )
        all_table["EPS_Next_5Y_Positive"] = all_table["EPS Next 5Y"].apply(
            lambda x: "True" if x >= 0 else "False"
        )
        all_table["Sales_Past_5Y_Positive"] = all_table["Sales Past 5Y"].apply(
            lambda x: "True" if x >= 0 else "False"
        )

        # FACTOR FILTER #13 -- optional: nothing downstream reads these, so a
        # column finviz renames or retires costs us one CSV field, not the run.
        for column in OPTIONAL_PERCENT_COLUMNS:
            if column in all_table.columns:
                to_fraction(all_table, column)
            else:
                print(
                    f"Note: optional column {column!r} is absent from the screener "
                    "output; continuing without it.",
                    file=sys.stderr,
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
        print(f"Error: {str(e)}", file=sys.stderr)
        # finviz reshapes its screener headers periodically, and the resulting
        # pandas errors rarely name the column that actually moved. Dump what
        # each view returned so the CI log alone is enough to diagnose the next
        # break. This used to read globals(), which never sees frames local to
        # main() -- so it printed nothing, and the Aug 20 "Change from Open"
        # failure left no record of what finviz had actually served.
        for view_name, view in views.items():
            print(f"  {view_name}: {list(view.columns)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
