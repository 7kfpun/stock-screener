import pytest
import pandas as pd
import sys
from io import StringIO
from unittest.mock import patch, MagicMock


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
        # Create a sample row
        sample_row = pd.Series({
            'PEG': 0.8,  # Should score 30 (< 1)
            'ROE': 0.25,  # Should score 30 (> 0.2)
            'Profit M': 0.25,  # Should score 20 (> 0.2)
            'EPS Next 5Y': 0.35  # Should score 20 (> 0.3)
        })

        # Define the scoring function (extracted from the script)
        def calculate_investor_score(row):
            score = 0

            if not pd.isna(row["PEG"]):
                if row["PEG"] > 0 and row["PEG"] < 1:
                    score += 30
                elif row["PEG"] >= 1 and row["PEG"] < 2:
                    score += 20
                elif row["PEG"] >= 2:
                    score += 10

            if not pd.isna(row["ROE"]):
                if row["ROE"] > 0.2:
                    score += 30
                elif row["ROE"] > 0.1:
                    score += 20
                elif row["ROE"] > 0:
                    score += 10

            if not pd.isna(row["Profit M"]):
                if row["Profit M"] > 0.2:
                    score += 20
                elif row["Profit M"] > 0.1:
                    score += 15
                elif row["Profit M"] > 0:
                    score += 10

            if not pd.isna(row["EPS Next 5Y"]):
                if row["EPS Next 5Y"] > 0.3:
                    score += 20
                elif row["EPS Next 5Y"] > 0.2:
                    score += 15
                elif row["EPS Next 5Y"] > 0.1:
                    score += 10

            return score

        score = calculate_investor_score(sample_row)
        assert score == 100, f"Expected score of 100, got {score}"

    def test_calculate_investor_score_with_nan(self):
        """Test investor score calculation with NaN values."""
        sample_row = pd.Series({
            'PEG': float('nan'),
            'ROE': 0.15,  # Should score 20
            'Profit M': float('nan'),
            'EPS Next 5Y': 0.25  # Should score 15
        })

        def calculate_investor_score(row):
            score = 0

            if not pd.isna(row["PEG"]):
                if row["PEG"] > 0 and row["PEG"] < 1:
                    score += 30
                elif row["PEG"] >= 1 and row["PEG"] < 2:
                    score += 20
                elif row["PEG"] >= 2:
                    score += 10

            if not pd.isna(row["ROE"]):
                if row["ROE"] > 0.2:
                    score += 30
                elif row["ROE"] > 0.1:
                    score += 20
                elif row["ROE"] > 0:
                    score += 10

            if not pd.isna(row["Profit M"]):
                if row["Profit M"] > 0.2:
                    score += 20
                elif row["Profit M"] > 0.1:
                    score += 15
                elif row["Profit M"] > 0:
                    score += 10

            if not pd.isna(row["EPS Next 5Y"]):
                if row["EPS Next 5Y"] > 0.3:
                    score += 20
                elif row["EPS Next 5Y"] > 0.2:
                    score += 15
                elif row["EPS Next 5Y"] > 0.1:
                    score += 10

            return score

        score = calculate_investor_score(sample_row)
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
        merged = (
            sample_financial_data.merge(
                sample_overview_data.drop(columns=['Market Cap', 'Price', 'Change', 'Volume']),
                on='Ticker',
                how='left'
            )
            .merge(
                sample_technical_data.drop(columns=['Price', 'Change', 'Volume']),
                on='Ticker',
                how='left'
            )
            .merge(
                sample_valuation_data.drop(columns=['Market Cap', 'Price', 'Change', 'Volume', 'P/E']),
                on='Ticker',
                how='left'
            )
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


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
