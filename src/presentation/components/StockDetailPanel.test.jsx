import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { StockDetailPanel } from './StockDetailPanel.jsx';

vi.mock('../../shared/analytics.js', () => ({
  trackTableInteraction: vi.fn(),
  trackHeatmapInteraction: vi.fn(),
}));

const mockStock = {
  Ticker: 'AAPL',
  Company: 'Apple Inc.',
  Investor_Score: 85,
  Sector: 'Technology',
  Industry: 'Consumer Electronics',
  Country: 'USA',
  'Market Cap': 2800000000000,
  Price: 175.50,
  PEG: 1.2,
  ROE: 0.45,
  'Profit M': 0.25,
  'EPS Next 5Y': 0.15,
};

const theme = createTheme();

const renderWithTheme = (component) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('StockDetailPanel', () => {
  describe('Desktop mode', () => {
    it('should render stock details in desktop panel mode', () => {
      const onClose = vi.fn();
      renderWithTheme(
        <StockDetailPanel stock={mockStock} onClose={onClose} isMobile={false} />
      );

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      expect(screen.getByText('Score: 85')).toBeInTheDocument();
    });

    it('should show close button in desktop mode', () => {
      const onClose = vi.fn();
      renderWithTheme(
        <StockDetailPanel stock={mockStock} onClose={onClose} isMobile={false} />
      );

      const closeButton = screen.getByRole('button', { name: '' });
      expect(closeButton).toBeInTheDocument();
    });

    it('should display score breakdown section', () => {
      const onClose = vi.fn();
      renderWithTheme(
        <StockDetailPanel stock={mockStock} onClose={onClose} isMobile={false} />
      );

      expect(screen.getByText('Score Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Score Components')).toBeInTheDocument();
    });

    it('should render with fixed width', () => {
      const onClose = vi.fn();
      const { container } = renderWithTheme(
        <StockDetailPanel stock={mockStock} onClose={onClose} isMobile={false} />
      );

      const panel = container.firstChild;
      expect(panel).toHaveStyle({ width: '500px' });
    });
  });

  describe('Mobile mode', () => {
    it('should render stock details in mobile dialog mode', () => {
      const onClose = vi.fn();
      renderWithTheme(
        <StockDetailPanel stock={mockStock} onClose={onClose} isMobile={true} />
      );

      expect(screen.getByText('Stock Details')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    });

    it('should show close button in app bar for mobile', () => {
      const onClose = vi.fn();
      renderWithTheme(
        <StockDetailPanel stock={mockStock} onClose={onClose} isMobile={true} />
      );

      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      expect(closeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Summary section', () => {
    const mockSummary = {
      top_stocks: [
        {
          ticker: 'AAPL',
          description: 'Apple makes consumer electronics',
          why_selected: 'Strong valuation and growth',
          latest_news: 'Record Q1 earnings reported',
        },
      ],
    };

    it('should display summary section when stock is in top_stocks', () => {
      const onClose = vi.fn();
      renderWithTheme(
        <StockDetailPanel stock={mockStock} summary={mockSummary} onClose={onClose} isMobile={false} />
      );

      expect(screen.getByText('Apple makes consumer electronics')).toBeInTheDocument();
      expect(screen.getByText('Why Selected')).toBeInTheDocument();
      expect(screen.getByText('Strong valuation and growth')).toBeInTheDocument();
      expect(screen.getByText('Latest News')).toBeInTheDocument();
      expect(screen.getByText('Record Q1 earnings reported')).toBeInTheDocument();
    });

    it('should not display summary section when stock is not in top_stocks', () => {
      const onClose = vi.fn();
      const summaryWithoutAapl = { top_stocks: [{ ticker: 'MSFT', description: 'Microsoft', why_selected: 'Quality', latest_news: 'news' }] };
      renderWithTheme(
        <StockDetailPanel stock={mockStock} summary={summaryWithoutAapl} onClose={onClose} isMobile={false} />
      );

      expect(screen.queryByText('Why Selected')).not.toBeInTheDocument();
    });

    it('should not display summary section when summary is null', () => {
      const onClose = vi.fn();
      renderWithTheme(
        <StockDetailPanel stock={mockStock} summary={null} onClose={onClose} isMobile={false} />
      );

      expect(screen.queryByText('Why Selected')).not.toBeInTheDocument();
    });

    it('should not display latest_news section when latest_news is empty', () => {
      const onClose = vi.fn();
      const summaryNoNews = {
        top_stocks: [{ ticker: 'AAPL', description: 'Apple', why_selected: 'Growth', latest_news: '' }],
      };
      renderWithTheme(
        <StockDetailPanel stock={mockStock} summary={summaryNoNews} onClose={onClose} isMobile={false} />
      );

      expect(screen.getByText('Why Selected')).toBeInTheDocument();
      expect(screen.queryByText('Latest News')).not.toBeInTheDocument();
    });
  });

  describe('Common functionality', () => {
    it('should not render when stock is null', () => {
      const onClose = vi.fn();
      const { container } = renderWithTheme(
        <StockDetailPanel stock={null} onClose={onClose} isMobile={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should display company sector and industry', () => {
      const onClose = vi.fn();
      renderWithTheme(
        <StockDetailPanel stock={mockStock} onClose={onClose} isMobile={false} />
      );

      expect(screen.getByText(/Technology/)).toBeInTheDocument();
      expect(screen.getByText(/Consumer Electronics/)).toBeInTheDocument();
    });
  });
});
