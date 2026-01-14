import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchStockHistory } from './csvStockRepository.js';

describe('csvStockRepository', () => {
  describe('fetchStockHistory', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      globalThis.fetch = vi.fn();
    });

    it('should limit results to 30 data points', async () => {
      // Mock dates.csv with 50 dates
      const dates = Array.from({ length: 50 }, (_, i) => {
        const date = new Date(2026, 0, 14 - i);
        return date.toISOString().split('T')[0];
      }).join('\n');

      // Mock responses
      globalThis.fetch = vi.fn((url) => {
        if (url.includes('dates.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(dates),
          });
        }
        // Mock stock data for each date
        const stockData = `Ticker\tPrice\tInvestor_Score\nAAPL\t150.25\t85.5`;
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(stockData),
        });
      });

      const history = await fetchStockHistory('AAPL');

      expect(history.length).toBe(30);
      expect(history[0].price).toBe(150.25);
      expect(history[0].score).toBe(85.5);
    });

    it('should continue through gaps and not stop at missing data', async () => {
      // Mock dates.csv with 10 dates
      const dates = [
        '2026-01-14',
        '2026-01-13',
        '2026-01-12',
        '2026-01-11',
        '2026-01-10',
        '2026-01-09',
        '2026-01-08',
        '2026-01-07',
        '2026-01-06',
        '2026-01-05',
      ].join('\n');

      let callCount = 0;
      globalThis.fetch = vi.fn((url) => {
        if (url.includes('dates.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(dates),
          });
        }

        callCount++;
        // Return data for odd calls, missing for even calls (creates gaps)
        if (callCount % 2 === 1) {
          const stockData = `Ticker\tPrice\tInvestor_Score\nAAPL\t${100 + callCount}\t${80 + callCount}`;
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(stockData),
          });
        }

        // Return data without AAPL to simulate gap
        const stockData = `Ticker\tPrice\tInvestor_Score\nGOOGL\t200\t90`;
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(stockData),
        });
      });

      const history = await fetchStockHistory('AAPL');

      // Should have 5 data points (from odd-numbered calls) despite gaps
      expect(history.length).toBe(5);
      // Data should be in chronological order (oldest first)
      // Call 9 (price 109) is oldest, Call 1 (price 101) is newest
      expect(history[0].price).toBe(109);
      expect(history[1].price).toBe(107);
    });

    it('should return data in chronological order (oldest first)', async () => {
      const dates = ['2026-01-14', '2026-01-13', '2026-01-12'].join('\n');

      let callCount = 0;
      globalThis.fetch = vi.fn((url) => {
        if (url.includes('dates.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(dates),
          });
        }

        callCount++;
        const stockData = `Ticker\tPrice\tInvestor_Score\nAAPL\t${150 - callCount}\t85`;
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(stockData),
        });
      });

      const history = await fetchStockHistory('AAPL');

      expect(history.length).toBe(3);
      // Oldest first (was fetched last)
      expect(history[0].date).toBe('2026-01-12');
      expect(history[0].price).toBe(147);
      expect(history[1].date).toBe('2026-01-13');
      expect(history[1].price).toBe(148);
      expect(history[2].date).toBe('2026-01-14');
      expect(history[2].price).toBe(149);
    });

    it('should respect custom maxPoints parameter', async () => {
      const dates = Array.from({ length: 20 }, (_, i) => {
        const date = new Date(2026, 0, 14 - i);
        return date.toISOString().split('T')[0];
      }).join('\n');

      globalThis.fetch = vi.fn((url) => {
        if (url.includes('dates.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(dates),
          });
        }
        const stockData = `Ticker\tPrice\tInvestor_Score\nAAPL\t150\t85`;
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(stockData),
        });
      });

      const history = await fetchStockHistory('AAPL', 10);

      expect(history.length).toBe(10);
    });

    it('should handle errors gracefully and continue searching', async () => {
      const dates = ['2026-01-14', '2026-01-13', '2026-01-12', '2026-01-11'].join('\n');

      let callCount = 0;
      globalThis.fetch = vi.fn((url) => {
        if (url.includes('dates.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(dates),
          });
        }

        callCount++;
        if (callCount === 2) {
          // Simulate error on second call
          return Promise.reject(new Error('Network error'));
        }

        const stockData = `Ticker\tPrice\tInvestor_Score\nAAPL\t150\t85`;
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(stockData),
        });
      });

      const history = await fetchStockHistory('AAPL');

      // Should still get 3 data points (skipping the error)
      expect(history.length).toBe(3);
    });

    it('should return empty array when no data is found', async () => {
      const dates = ['2026-01-14', '2026-01-13'].join('\n');

      globalThis.fetch = vi.fn((url) => {
        if (url.includes('dates.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(dates),
          });
        }
        // Return data without AAPL
        const stockData = `Ticker\tPrice\tInvestor_Score\nGOOGL\t200\t90`;
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(stockData),
        });
      });

      const history = await fetchStockHistory('AAPL');

      expect(history.length).toBe(0);
    });
  });
});
