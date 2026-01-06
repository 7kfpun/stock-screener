#!/usr/bin/env python3
"""
Check if the US stock market (NYSE) is open today.
Exits with code 0 if market is open, code 1 if closed.
"""
import sys
from datetime import datetime
import pandas_market_calendars as mcal

def is_market_open():
    """Check if NYSE is open today"""
    try:
        # Get NYSE calendar
        nyse = mcal.get_calendar('NYSE')

        # Get today's date
        today = datetime.now().date()

        # Get valid trading days for today
        schedule = nyse.valid_days(start_date=today, end_date=today)

        # If schedule is empty, market is closed
        if len(schedule) == 0:
            print(f"Market is CLOSED on {today} (weekend or holiday)", file=sys.stderr)
            return False
        else:
            print(f"Market is OPEN on {today}", file=sys.stderr)
            return True

    except Exception as e:
        print(f"Error checking market status: {e}", file=sys.stderr)
        # On error, assume market is open to allow manual override
        return True

if __name__ == "__main__":
    if is_market_open():
        sys.exit(0)  # Market is open
    else:
        sys.exit(1)  # Market is closed
