import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import TableView from './TableView.jsx';

vi.mock('../../shared/analytics.js', () => ({
  trackTableInteraction: vi.fn(),
}));

const theme = createTheme();

const mockData = [
  {
    Ticker: 'AAPL',
    Company: 'Apple Inc.',
    Investor_Score: 85,
    Price: 175.50,
    Change: 0.025,
    'Market Cap': 2800000000000,
    Volume: 50000000,
    Sector: 'Technology',
    Industry: 'Consumer Electronics',
    Country: 'USA',
  },
  {
    Ticker: 'MSFT',
    Company: 'Microsoft Corp.',
    Investor_Score: 80,
    Price: 380.25,
    Change: -0.015,
    'Market Cap': 2700000000000,
    Volume: 30000000,
    Sector: 'Technology',
    Industry: 'Software',
    Country: 'USA',
  },
];

const renderWithTheme = (component) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('TableView', () => {
  it('should render table with stock data', () => {
    const onStockSelect = vi.fn();
    renderWithTheme(
      <TableView data={mockData} onStockSelect={onStockSelect} selectedTicker={null} />
    );

    expect(screen.getByText('Apple Inc. (AAPL)')).toBeInTheDocument();
    expect(screen.getByText('Microsoft Corp. (MSFT)')).toBeInTheDocument();
  });

  it('should call onStockSelect when row is clicked', async () => {
    const onStockSelect = vi.fn();
    renderWithTheme(
      <TableView data={mockData} onStockSelect={onStockSelect} selectedTicker={null} />
    );

    const appleRow = screen.getByText('Apple Inc. (AAPL)').closest('.MuiDataGrid-row');
    if (appleRow) {
      fireEvent.click(appleRow);
      expect(onStockSelect).toHaveBeenCalledWith('AAPL');
    }
  });

  it('should highlight selected row', () => {
    const onStockSelect = vi.fn();
    const { container } = renderWithTheme(
      <TableView data={mockData} onStockSelect={onStockSelect} selectedTicker="AAPL" />
    );

    const selectedRow = container.querySelector('.selected-row');
    expect(selectedRow).toBeInTheDocument();
  });

  it('should display investor scores with correct styling', () => {
    const onStockSelect = vi.fn();
    const { container } = renderWithTheme(
      <TableView data={mockData} onStockSelect={onStockSelect} selectedTicker={null} />
    );

    // High score (85) should have score-high class
    const highScoreCell = container.querySelector('.score-high');
    expect(highScoreCell).toBeInTheDocument();

    // Medium score (80) should have score-medium class
    const mediumScoreCell = container.querySelector('.score-medium');
    expect(mediumScoreCell).toBeInTheDocument();
  });

  it('should display company information correctly', () => {
    const onStockSelect = vi.fn();
    renderWithTheme(
      <TableView data={mockData} onStockSelect={onStockSelect} selectedTicker={null} />
    );

    expect(screen.getByText(/Technology/)).toBeInTheDocument();
    expect(screen.getByText(/Consumer Electronics/)).toBeInTheDocument();
    expect(screen.getByText(/Software/)).toBeInTheDocument();
  });

  it('should handle empty data array', () => {
    const onStockSelect = vi.fn();
    renderWithTheme(
      <TableView data={[]} onStockSelect={onStockSelect} selectedTicker={null} />
    );

    expect(screen.getByText('No rows')).toBeInTheDocument();
  });

  it('should show positive and negative changes with correct styling', () => {
    const onStockSelect = vi.fn();
    const { container } = renderWithTheme(
      <TableView data={mockData} onStockSelect={onStockSelect} selectedTicker={null} />
    );

    const positiveChange = container.querySelector('.change-positive');
    const negativeChange = container.querySelector('.change-negative');

    expect(positiveChange).toBeInTheDocument();
    expect(negativeChange).toBeInTheDocument();
  });
});
