import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  formatPercent,
  formatNumber,
  formatVolume,
  formatPrice,
  formatScore,
} from './formatters.js';

describe('formatters', () => {
  describe('formatMoney', () => {
    it('should format small amounts', () => {
      expect(formatMoney(1234)).toBe('$1234');
    });

    it('should format billions', () => {
      expect(formatMoney(1234567890000)).toBe('$1.23T');
    });

    it('should format millions', () => {
      expect(formatMoney(1234567890)).toBe('$1.23B');
    });

    it('should handle null values', () => {
      expect(formatMoney(null)).toBe('-');
    });

    it('should handle empty strings', () => {
      expect(formatMoney('')).toBe('-');
    });
  });

  describe('formatPercent', () => {
    it('should format decimal as percentage', () => {
      expect(formatPercent(0.1234)).toBe('12.34%');
    });

    it('should handle null values', () => {
      expect(formatPercent(null)).toBe('-');
    });

    it('should handle negative percentages', () => {
      expect(formatPercent(-0.0567)).toBe('-5.67%');
    });

    it('should not convert if already formatted', () => {
      expect(formatPercent('12.34%')).toBe('12.34%');
    });
  });

  describe('formatNumber', () => {
    it('should format number with default 2 decimals', () => {
      expect(formatNumber(1234.567)).toBe('1234.57');
    });

    it('should handle null values', () => {
      expect(formatNumber(null)).toBe('-');
    });

    it('should format with custom decimals', () => {
      expect(formatNumber(1234.56789, 3)).toBe('1234.568');
    });
  });

  describe('formatVolume', () => {
    it('should format millions', () => {
      expect(formatVolume(1234567)).toBe('1.23M');
    });

    it('should format thousands', () => {
      expect(formatVolume(1234)).toBe('1.23K');
    });

    it('should handle null values', () => {
      expect(formatVolume(null)).toBe('-');
    });

    it('should handle small numbers', () => {
      expect(formatVolume(123)).toBe('123');
    });
  });

  describe('formatPrice', () => {
    it('should format price with $ symbol', () => {
      expect(formatPrice(150.25)).toBe('$150.25');
    });

    it('should handle null values', () => {
      expect(formatPrice(null)).toBe('-');
    });
  });

  describe('formatScore', () => {
    it('should format score as integer', () => {
      expect(formatScore(85.7)).toBe('86');
    });

    it('should handle null values', () => {
      expect(formatScore(null)).toBe('-');
    });
  });
});
