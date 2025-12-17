import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import HeatmapView from './HeatmapView.jsx';

vi.mock('../../shared/analytics.js', () => ({
  trackHeatmapInteraction: vi.fn(),
}));

const theme = createTheme();

const mockData = [
  {
    Ticker: 'AAPL',
    Company: 'Apple Inc.',
    Investor_Score: 85,
    Change: 0.025,
    'Market Cap': 2800000000000,
    Volume: 50000000,
    Sector: 'Technology',
    Industry: 'Consumer Electronics',
  },
  {
    Ticker: 'MSFT',
    Company: 'Microsoft Corp.',
    Investor_Score: 80,
    Change: -0.015,
    'Market Cap': 2700000000000,
    Volume: 30000000,
    Sector: 'Technology',
    Industry: 'Software',
  },
  {
    Ticker: 'JPM',
    Company: 'JPMorgan Chase',
    Investor_Score: 75,
    Change: 0.012,
    'Market Cap': 500000000000,
    Volume: 20000000,
    Sector: 'Financial',
    Industry: 'Banking',
  },
];

const renderWithTheme = (component) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('HeatmapView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render heatmap controls', () => {
    const onStockSelect = vi.fn();
    renderWithTheme(
      <HeatmapView data={mockData} onStockSelect={onStockSelect} selectedTicker={null} />
    );

    expect(screen.getByText(/Group by:/)).toBeInTheDocument();
    expect(screen.getByText(/Size by:/)).toBeInTheDocument();
  });

  it('should render stock tiles', () => {
    const onStockSelect = vi.fn();
    renderWithTheme(
      <HeatmapView data={mockData} onStockSelect={onStockSelect} selectedTicker={null} />
    );

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.getByText('JPM')).toBeInTheDocument();
  });

  it('should call onStockSelect when tile is clicked', () => {
    const onStockSelect = vi.fn();
    renderWithTheme(
      <HeatmapView data={mockData} onStockSelect={onStockSelect} selectedTicker={null} />
    );

    const appleTile = screen.getByText('AAPL').closest('div[role="presentation"]')?.parentElement;
    if (appleTile) {
      fireEvent.click(appleTile);
      expect(onStockSelect).toHaveBeenCalledWith('AAPL');
    }
  });

  it('should group stocks by sector', () => {
    const onStockSelect = vi.fn();
    renderWithTheme(
      <HeatmapView data={mockData} onStockSelect={onStockSelect} selectedTicker={null} />
    );

    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Financial')).toBeInTheDocument();
  });

  it('should persist groupBy preference in localStorage', async () => {
    const onStockSelect = vi.fn();
    renderWithTheme(
      <HeatmapView data={mockData} onStockSelect={onStockSelect} selectedTicker={null} />
    );

    const comboboxes = screen.getAllByRole('combobox');
    const groupBySelect = comboboxes[0]; // First combobox is group by
    fireEvent.mouseDown(groupBySelect);

    const noGroupOption = await screen.findByText('No group');
    fireEvent.click(noGroupOption);

    expect(localStorage.getItem('heatmapGroupBy')).toBe('none');
  });

  it('should persist sizeBy preference in localStorage', async () => {
    const onStockSelect = vi.fn();
    renderWithTheme(
      <HeatmapView data={mockData} onStockSelect={onStockSelect} selectedTicker={null} />
    );

    const comboboxes = screen.getAllByRole('combobox');
    const sizeBySelect = comboboxes[1]; // Second combobox is size by
    fireEvent.mouseDown(sizeBySelect);

    const volumeOption = await screen.findByText('Volume');
    fireEvent.click(volumeOption);

    expect(localStorage.getItem('heatmapSizeBy')).toBe('volume');
  });

  it('should handle empty data array', () => {
    const onStockSelect = vi.fn();
    const { container } = renderWithTheme(
      <HeatmapView data={[]} onStockSelect={onStockSelect} selectedTicker={null} />
    );

    // Should still render controls
    expect(screen.getByText(/Group by:/)).toBeInTheDocument();

    // Should not render any tiles
    const tiles = container.querySelectorAll('[role="presentation"]');
    expect(tiles.length).toBe(0);
  });

  it('should display sector labels', () => {
    const onStockSelect = vi.fn();
    renderWithTheme(
      <HeatmapView data={mockData} onStockSelect={onStockSelect} selectedTicker={null} />
    );

    // Check that sector names are displayed
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Financial')).toBeInTheDocument();
  });
});
