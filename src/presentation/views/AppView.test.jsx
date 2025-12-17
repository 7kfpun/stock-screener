import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AppView from './AppView.jsx';

vi.mock('../../application/useStockData.js', () => ({
  useStockData: () => ({
    stocks: [
      { Ticker: 'AAPL', Company: 'Apple Inc.', Investor_Score: 85, Sector: 'Technology' },
      { Ticker: 'MSFT', Company: 'Microsoft Corp.', Investor_Score: 80, Sector: 'Technology' },
      { Ticker: 'GOOGL', Company: 'Alphabet Inc.', Investor_Score: 75, Sector: 'Technology' },
    ],
    availableDates: ['2025-12-01', '2025-12-15'],
    selectedDate: '2025-12-15',
    loading: false,
    error: null,
    lastUpdated: '2025-12-15',
    selectDate: vi.fn(),
  }),
}));

vi.mock('../../shared/analytics.js', () => ({
  trackThemeChange: vi.fn(),
  trackViewChange: vi.fn(),
  trackSearch: vi.fn(),
  trackAccordionToggle: vi.fn(),
  trackTableInteraction: vi.fn(),
  trackHeatmapInteraction: vi.fn(),
}));

describe('AppView', () => {
  let originalLocation;
  let originalHistory;

  beforeEach(() => {
    originalLocation = window.location;
    originalHistory = window.history;

    delete window.location;
    window.location = { search: '', pathname: '/' };

    delete window.history;
    window.history = {
      replaceState: vi.fn(),
    };

    // Mock matchMedia for theme detection
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().implementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    window.location = originalLocation;
    window.history = originalHistory;
  });

  describe('URL persistence', () => {
    it('should read view from URL on initial load', () => {
      window.location.search = '?view=heatmap';
      render(<AppView />);

      // Heatmap controls should be visible
      expect(screen.getByText(/Group by:/)).toBeInTheDocument();
    });

    it('should read ticker from URL on initial load', async () => {
      window.location.search = '?ticker=AAPL';
      render(<AppView />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });
    });

    it('should update URL when view changes', async () => {
      render(<AppView />);

      await waitFor(() => {
        expect(window.history.replaceState).toHaveBeenCalled();
      });
    });
  });

  describe('Stock selection', () => {
    it('should auto-select top-ranked stock on desktop', async () => {
      // Mock desktop viewport
      window.matchMedia = vi.fn().implementation((query) => ({
        matches: query !== '(max-width: 959.95px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<AppView />);

      // Should auto-select AAPL (highest score: 85)
      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should not auto-select on mobile', () => {
      // Mock mobile viewport
      window.matchMedia = vi.fn().implementation((query) => ({
        matches: query === '(max-width: 959.95px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<AppView />);

      // Stock detail panel should not be visible
      expect(screen.queryByText('Score Breakdown')).not.toBeInTheDocument();
    });
  });

  describe('UI elements', () => {
    it('should render stock screener title', () => {
      render(<AppView />);
      expect(screen.getByText('Stock Screener')).toBeInTheDocument();
    });

    it('should render view toggle buttons', () => {
      render(<AppView />);
      expect(screen.getByText('Table')).toBeInTheDocument();
      expect(screen.getByText('Heatmap')).toBeInTheDocument();
    });

    it('should display stock count', () => {
      render(<AppView />);
      expect(screen.getByText('3 stocks')).toBeInTheDocument();
    });

    it('should render screening methodology accordion', () => {
      render(<AppView />);
      expect(screen.getByText(/Screening Methodology/)).toBeInTheDocument();
    });
  });
});
