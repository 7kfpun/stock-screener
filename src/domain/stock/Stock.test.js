import { describe, it, expect } from 'vitest';
import { createStock, createStockCollection } from './stock.js';

describe('Stock', () => {
  describe('createStock', () => {
    it('should create a stock object with all properties', () => {
      const data = {
        Ticker: 'AAPL',
        Company: 'Apple Inc.',
        Sector: 'Technology',
        Industry: 'Consumer Electronics',
        'Market Cap': '2500000000000',
        Price: '150.25',
        Volume: '50000000',
        '52W Low': '120.0',
        '52W High': '180.0',
        ROE: '25.5',
        'P/E': '25.0',
        PEG: '1.2',
      };

      const stock = createStock(data);

      expect(stock.Ticker).toBe('AAPL');
      expect(stock.Company).toBe('Apple Inc.');
      expect(stock.Sector).toBe('Technology');
      expect(stock['Market Cap']).toBe(2500000000000);
      expect(stock.Price).toBe(150.25);
    });

    it('should handle missing optional fields', () => {
      const data = {
        Ticker: 'TEST',
        Company: 'Test Company',
      };

      const stock = createStock(data);

      expect(stock.Ticker).toBe('TEST');
      expect(stock.Company).toBe('Test Company');
      expect(stock.Sector).toBe('');
      expect(stock['Market Cap']).toBeNull();
    });

    it('should return null for invalid input', () => {
      expect(createStock(null)).toBeNull();
      expect(createStock(undefined)).toBeNull();
    });
  });

  describe('createStockCollection', () => {
    it('should create an array of stock objects', () => {
      const data = [
        { Ticker: 'AAPL', Company: 'Apple Inc.' },
        { Ticker: 'GOOGL', Company: 'Alphabet Inc.' },
      ];

      const stocks = createStockCollection(data);

      expect(stocks).toHaveLength(2);
      expect(stocks[0].Ticker).toBe('AAPL');
      expect(stocks[1].Ticker).toBe('GOOGL');
    });

    it('should filter out null values', () => {
      const data = [
        { Ticker: 'AAPL', Company: 'Apple Inc.' },
        null,
        { Ticker: 'GOOGL', Company: 'Alphabet Inc.' },
      ];

      const stocks = createStockCollection(data);

      expect(stocks).toHaveLength(2);
    });

    it('should return empty array for invalid input', () => {
      expect(createStockCollection(null)).toEqual([]);
      expect(createStockCollection(undefined)).toEqual([]);
    });
  });
});
