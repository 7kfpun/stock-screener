import pytest
from datetime import datetime
from zoneinfo import ZoneInfo
from unittest.mock import patch, MagicMock
import sys
import os

# Import the module to test
sys.path.insert(0, os.path.dirname(__file__))
from is_market_open import is_market_open


class TestIsMarketOpen:
    """Tests for the is_market_open script."""

    @pytest.fixture
    def eastern_tz(self):
        """Return Eastern timezone."""
        return ZoneInfo('America/New_York')

    def test_market_open_on_regular_weekday(self, eastern_tz):
        """Test that market is open on a regular weekday (non-holiday)."""
        # Mock a Wednesday in the middle of the year (unlikely to be a holiday)
        with patch('is_market_open.datetime') as mock_datetime:
            # June 11, 2025 is a Wednesday
            mock_now = datetime(2025, 6, 11, 15, 0, tzinfo=eastern_tz)
            mock_datetime.now.return_value = mock_now

            result = is_market_open()

            assert result == True, "Market should be open on a regular Wednesday"

    def test_market_closed_on_saturday(self, eastern_tz):
        """Test that market is closed on Saturday."""
        with patch('is_market_open.datetime') as mock_datetime:
            # June 14, 2025 is a Saturday
            mock_now = datetime(2025, 6, 14, 15, 0, tzinfo=eastern_tz)
            mock_datetime.now.return_value = mock_now

            result = is_market_open()

            assert result == False, "Market should be closed on Saturday"

    def test_market_closed_on_sunday(self, eastern_tz):
        """Test that market is closed on Sunday."""
        with patch('is_market_open.datetime') as mock_datetime:
            # June 15, 2025 is a Sunday
            mock_now = datetime(2025, 6, 15, 15, 0, tzinfo=eastern_tz)
            mock_datetime.now.return_value = mock_now

            result = is_market_open()

            assert result == False, "Market should be closed on Sunday"

    def test_market_closed_on_new_years_day(self, eastern_tz):
        """Test that market is closed on New Year's Day."""
        with patch('is_market_open.datetime') as mock_datetime:
            # January 1, 2025 is a Wednesday but it's New Year's Day
            mock_now = datetime(2025, 1, 1, 15, 0, tzinfo=eastern_tz)
            mock_datetime.now.return_value = mock_now

            result = is_market_open()

            assert result == False, "Market should be closed on New Year's Day"

    def test_market_closed_on_christmas(self, eastern_tz):
        """Test that market is closed on Christmas."""
        with patch('is_market_open.datetime') as mock_datetime:
            # December 25, 2025 is a Thursday but it's Christmas
            mock_now = datetime(2025, 12, 25, 15, 0, tzinfo=eastern_tz)
            mock_datetime.now.return_value = mock_now

            result = is_market_open()

            assert result == False, "Market should be closed on Christmas"

    def test_market_closed_on_independence_day(self, eastern_tz):
        """Test that market is closed on Independence Day."""
        with patch('is_market_open.datetime') as mock_datetime:
            # July 4, 2025 is a Friday but it's Independence Day
            mock_now = datetime(2025, 7, 4, 15, 0, tzinfo=eastern_tz)
            mock_datetime.now.return_value = mock_now

            result = is_market_open()

            assert result == False, "Market should be closed on Independence Day"

    def test_market_closed_on_thanksgiving(self, eastern_tz):
        """Test that market is closed on Thanksgiving."""
        with patch('is_market_open.datetime') as mock_datetime:
            # November 27, 2025 is Thanksgiving (4th Thursday of November)
            mock_now = datetime(2025, 11, 27, 15, 0, tzinfo=eastern_tz)
            mock_datetime.now.return_value = mock_now

            result = is_market_open()

            assert result == False, "Market should be closed on Thanksgiving"

    def test_market_closed_on_mlk_day(self, eastern_tz):
        """Test that market is closed on Martin Luther King Jr. Day."""
        with patch('is_market_open.datetime') as mock_datetime:
            # January 20, 2025 is MLK Day (3rd Monday of January)
            mock_now = datetime(2025, 1, 20, 15, 0, tzinfo=eastern_tz)
            mock_datetime.now.return_value = mock_now

            result = is_market_open()

            assert result == False, "Market should be closed on MLK Day"

    def test_market_closed_on_good_friday(self, eastern_tz):
        """Test that market is closed on Good Friday."""
        with patch('is_market_open.datetime') as mock_datetime:
            # April 18, 2025 is Good Friday
            mock_now = datetime(2025, 4, 18, 15, 0, tzinfo=eastern_tz)
            mock_datetime.now.return_value = mock_now

            result = is_market_open()

            assert result == False, "Market should be closed on Good Friday"

    def test_uses_eastern_timezone(self):
        """Test that the function uses Eastern timezone for determining 'today'."""
        with patch('is_market_open.datetime') as mock_datetime:
            # Friday 10pm UTC = Friday 5pm ET (still Friday)
            # But it would be Saturday morning in Asia
            mock_now = MagicMock()
            mock_now.date.return_value = datetime(2025, 6, 13).date()  # Friday
            mock_datetime.now.return_value = mock_now

            result = is_market_open()

            # Should check with Eastern timezone
            mock_datetime.now.assert_called_once()
            call_args = mock_datetime.now.call_args
            if call_args and call_args[0]:
                tz_arg = call_args[0][0]
                assert str(tz_arg) == 'America/New_York', "Should use Eastern timezone"

    def test_error_handling_returns_true(self):
        """Test that on error, function returns True (fail-safe for manual override)."""
        with patch('is_market_open.mcal.get_calendar') as mock_calendar:
            # Simulate an error in getting the calendar
            mock_calendar.side_effect = Exception("Calendar service unavailable")

            result = is_market_open()

            assert result == True, "Should return True on error to allow manual override"

    def test_market_open_on_day_after_holiday(self, eastern_tz):
        """Test that market is open the day after a holiday."""
        with patch('is_market_open.datetime') as mock_datetime:
            # January 2, 2025 is a Thursday (day after New Year's)
            mock_now = datetime(2025, 1, 2, 15, 0, tzinfo=eastern_tz)
            mock_datetime.now.return_value = mock_now

            result = is_market_open()

            assert result == True, "Market should be open the day after New Year's"

    def test_market_open_on_regular_monday(self, eastern_tz):
        """Test that market is open on a regular Monday (not a holiday)."""
        with patch('is_market_open.datetime') as mock_datetime:
            # June 9, 2025 is a Monday (not a holiday)
            mock_now = datetime(2025, 6, 9, 15, 0, tzinfo=eastern_tz)
            mock_datetime.now.return_value = mock_now

            result = is_market_open()

            assert result == True, "Market should be open on a regular Monday"

    def test_market_open_on_regular_friday(self, eastern_tz):
        """Test that market is open on a regular Friday (not a holiday)."""
        with patch('is_market_open.datetime') as mock_datetime:
            # June 13, 2025 is a Friday (not a holiday)
            mock_now = datetime(2025, 6, 13, 15, 0, tzinfo=eastern_tz)
            mock_datetime.now.return_value = mock_now

            result = is_market_open()

            assert result == True, "Market should be open on a regular Friday"

    def test_market_status_with_2026_dates(self, eastern_tz):
        """Test market status for 2026 dates (verify calendar works for future years)."""
        with patch('is_market_open.datetime') as mock_datetime:
            # Test a regular Wednesday in 2026
            mock_now = datetime(2026, 3, 11, 15, 0, tzinfo=eastern_tz)
            mock_datetime.now.return_value = mock_now

            result = is_market_open()

            assert result == True, "Market should be open on a regular Wednesday in 2026"

    def test_prints_correct_status_messages(self, eastern_tz, capsys):
        """Test that correct status messages are printed to stderr."""
        with patch('is_market_open.datetime') as mock_datetime:
            # Test market open message
            mock_now = datetime(2025, 6, 11, 15, 0, tzinfo=eastern_tz)
            mock_datetime.now.return_value = mock_now

            is_market_open()
            captured = capsys.readouterr()

            assert "OPEN" in captured.err, "Should print OPEN status"
            assert "ET" in captured.err, "Should mention ET timezone"


class TestMarketCalendarIntegration:
    """Integration tests using actual pandas-market-calendars library."""

    def test_known_2025_trading_days(self):
        """Test with known 2025 trading days using real calendar."""
        # These are definitely trading days in 2025
        trading_days = [
            datetime(2025, 1, 2),   # Thursday (first trading day of year)
            datetime(2025, 3, 17),  # Monday (regular day)
            datetime(2025, 6, 11),  # Wednesday (regular day)
            datetime(2025, 9, 15),  # Monday (regular day)
        ]

        for test_date in trading_days:
            with patch('is_market_open.datetime') as mock_datetime:
                eastern = ZoneInfo('America/New_York')
                mock_now = test_date.replace(hour=15, tzinfo=eastern)
                mock_datetime.now.return_value = mock_now

                result = is_market_open()
                assert result == True, f"Market should be open on {test_date.date()}"

    def test_known_2025_market_holidays(self):
        """Test with known 2025 market holidays using real calendar."""
        # These are definitely market holidays in 2025
        holidays = [
            datetime(2025, 1, 1),   # New Year's Day
            datetime(2025, 7, 4),   # Independence Day
            datetime(2025, 12, 25), # Christmas
        ]

        for test_date in holidays:
            with patch('is_market_open.datetime') as mock_datetime:
                eastern = ZoneInfo('America/New_York')
                mock_now = test_date.replace(hour=15, tzinfo=eastern)
                mock_datetime.now.return_value = mock_now

                result = is_market_open()
                assert result == False, f"Market should be closed on {test_date.date()}"

    def test_known_2025_weekends(self):
        """Test with known 2025 weekend dates using real calendar."""
        # These are weekend dates in 2025
        weekends = [
            datetime(2025, 6, 14),  # Saturday
            datetime(2025, 6, 15),  # Sunday
            datetime(2025, 12, 13), # Saturday
            datetime(2025, 12, 14), # Sunday
        ]

        for test_date in weekends:
            with patch('is_market_open.datetime') as mock_datetime:
                eastern = ZoneInfo('America/New_York')
                mock_now = test_date.replace(hour=15, tzinfo=eastern)
                mock_datetime.now.return_value = mock_now

                result = is_market_open()
                assert result == False, f"Market should be closed on {test_date.date()} (weekend)"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
