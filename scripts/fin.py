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

    # Merge tables
    all_table = (
        financial_data.merge(
            overview_data.drop(columns=["Market Cap", "Price", "Change", "Volume"]),
            on="Ticker",
            how="left",
        )
        .merge(
            technical_data.drop(columns=["Price", "Change", "Volume"]),
            on="Ticker",
            how="left",
        )
        .merge(
            valuation_data.drop(
                columns=["Market Cap", "Price", "Change", "Volume", "P/E"]
            ),
            on="Ticker",
            how="left",
        )
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

    # Create a function to calculate investor score
    def calculate_investor_score(row):
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

    # Output CSV to stdout
    all_table.to_csv(sys.stdout, sep="\t", index=False)

except Exception as e:
    # Reset stdout in case of error
    sys.stdout = original_stdout
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
