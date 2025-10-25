import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAvailableDates, fetchStockSnapshots } from '../data/csvStockRepository.js';

const DEFAULT_DATES_LIMIT = 50;
const DEFAULT_DATE = 'latest';

export function useStockData({ initialDate = DEFAULT_DATE, datesLimit = DEFAULT_DATES_LIMIT } = {}) {
  const [stocks, setStocks] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [dataTimestamp, setDataTimestamp] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStocks = useCallback(async (date) => {
    const targetDate = date ?? selectedDate ?? DEFAULT_DATE;
    setLoading(true);
    try {
      const [snapshots, dates] = await Promise.all([
        fetchStockSnapshots(targetDate),
        fetchAvailableDates(datesLimit),
      ]);
      setStocks(snapshots);
      setAvailableDates(dates);
      setDataTimestamp(dates[0] || '');
      setError(null);
    } catch (err) {
      setStocks([]);
      setError(err instanceof Error ? err.message : 'Failed to load stock data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const selectDate = useCallback(async (date) => {
    setSelectedDate(date);
    await loadStocks(date);
  }, [loadStocks]);

  const refresh = useCallback(async () => {
    await loadStocks(selectedDate);
  }, [loadStocks, selectedDate]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);
      try {
        const [dates, snapshots] = await Promise.all([
          fetchAvailableDates(datesLimit),
          fetchStockSnapshots(initialDate),
        ]);

        if (cancelled) return;

        setAvailableDates(dates);
        const latest = dates[0] || DEFAULT_DATE;
        setStocks(snapshots);
        setSelectedDate(initialDate === DEFAULT_DATE ? latest : initialDate);
        setDataTimestamp(dates[0] || '');
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setStocks([]);
        setError(err instanceof Error ? err.message : 'Failed to load stock data');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [datesLimit, initialDate]);

  const lastUpdated = useMemo(() => dataTimestamp, [dataTimestamp]);

  return {
    stocks,
    availableDates,
    selectedDate,
    loading,
    error,
    lastUpdated,
    selectDate,
    refresh,
  };
}
