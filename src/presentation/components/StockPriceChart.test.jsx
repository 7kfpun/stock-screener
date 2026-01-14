import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { StockPriceChart } from './StockPriceChart.jsx';
import * as csvStockRepository from '../../data/csvStockRepository.js';

// Mock the repository
vi.mock('../../data/csvStockRepository.js', () => ({
  fetchStockHistory: vi.fn(),
}));

// Mock Recharts to avoid canvas rendering issues in tests
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    LineChart: ({ children, data }) => (
      <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
        {children}
      </div>
    ),
    Line: ({ yAxisId, dataKey, dot, strokeWidth }) => (
      <div
        data-testid={`line-${dataKey}`}
        data-y-axis={yAxisId}
        data-dot={typeof dot === 'object' ? 'object' : String(dot)}
        data-stroke-width={strokeWidth}
      />
    ),
    XAxis: ({ dataKey }) => <div data-testid="x-axis" data-key={dataKey} />,
    YAxis: ({ yAxisId, domain }) => (
      <div
        data-testid={`y-axis-${yAxisId}`}
        data-domain={domain ? JSON.stringify(domain) : undefined}
      />
    ),
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
  };
});

describe('StockPriceChart', () => {
  const theme = createTheme();

  const renderWithTheme = (component) => {
    return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    csvStockRepository.fetchStockHistory.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithTheme(<StockPriceChart ticker="AAPL" />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display error message when history fails to load', async () => {
    csvStockRepository.fetchStockHistory.mockRejectedValue(new Error('Network error'));

    renderWithTheme(<StockPriceChart ticker="AAPL" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load historical data')).toBeInTheDocument();
    });
  });

  it('should display message when no historical data is available', async () => {
    csvStockRepository.fetchStockHistory.mockResolvedValue([]);

    renderWithTheme(<StockPriceChart ticker="AAPL" />);

    await waitFor(() => {
      expect(screen.getByText('No historical data available')).toBeInTheDocument();
    });
  });

  it('should render chart with historical data', async () => {
    const mockHistory = [
      { date: '2026-01-12', price: 150.25, score: 85.5 },
      { date: '2026-01-13', price: 151.30, score: 86.0 },
      { date: '2026-01-14', price: 152.10, score: 86.5 },
    ];

    csvStockRepository.fetchStockHistory.mockResolvedValue(mockHistory);

    renderWithTheme(<StockPriceChart ticker="AAPL" />);

    await waitFor(() => {
      expect(screen.getByText('Price & Score History')).toBeInTheDocument();
    });

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should display correct data point count in caption', async () => {
    const mockHistory = [
      { date: '2026-01-12', price: 150.25, score: 85.5 },
      { date: '2026-01-13', price: 151.30, score: 86.0 },
      { date: '2026-01-14', price: 152.10, score: 86.5 },
    ];

    csvStockRepository.fetchStockHistory.mockResolvedValue(mockHistory);

    renderWithTheme(<StockPriceChart ticker="AAPL" />);

    await waitFor(() => {
      expect(screen.getByText('Showing 3 data points')).toBeInTheDocument();
    });
  });

  it('should render lines without dots (dot=false)', async () => {
    const mockHistory = [
      { date: '2026-01-12', price: 150.25, score: 85.5 },
      { date: '2026-01-13', price: 151.30, score: 86.0 },
    ];

    csvStockRepository.fetchStockHistory.mockResolvedValue(mockHistory);

    renderWithTheme(<StockPriceChart ticker="AAPL" />);

    await waitFor(() => {
      const priceLine = screen.getByTestId('line-price');
      const scoreLine = screen.getByTestId('line-score');

      // Both lines should have dot={false}
      expect(priceLine.getAttribute('data-dot')).toBe('false');
      expect(scoreLine.getAttribute('data-dot')).toBe('false');
    });
  });

  it('should set custom domain for price Y-axis based on data', async () => {
    const mockHistory = [
      { date: '2026-01-12', price: 100, score: 85 },
      { date: '2026-01-13', price: 150, score: 86 },
      { date: '2026-01-14', price: 200, score: 87 },
    ];

    csvStockRepository.fetchStockHistory.mockResolvedValue(mockHistory);

    renderWithTheme(<StockPriceChart ticker="AAPL" />);

    await waitFor(() => {
      const leftYAxis = screen.getByTestId('y-axis-left');
      const domain = JSON.parse(leftYAxis.getAttribute('data-domain'));

      // Should have custom domain (not [0, auto])
      expect(domain).toBeDefined();
      expect(Array.isArray(domain)).toBe(true);
      expect(domain.length).toBe(2);

      // Price range is 100-200, so domain should be roughly [90, 210] with 10% padding
      expect(domain[0]).toBeGreaterThanOrEqual(85);
      expect(domain[0]).toBeLessThan(100);
      expect(domain[1]).toBeGreaterThan(200);
      expect(domain[1]).toBeLessThanOrEqual(215);
    });
  });

  it('should keep score Y-axis domain fixed at [0, 100]', async () => {
    const mockHistory = [
      { date: '2026-01-12', price: 150, score: 85 },
      { date: '2026-01-13', price: 151, score: 86 },
    ];

    csvStockRepository.fetchStockHistory.mockResolvedValue(mockHistory);

    renderWithTheme(<StockPriceChart ticker="AAPL" />);

    await waitFor(() => {
      const rightYAxis = screen.getByTestId('y-axis-right');
      const domain = JSON.parse(rightYAxis.getAttribute('data-domain'));

      // Score axis should always be [0, 100]
      expect(domain).toEqual([0, 100]);
    });
  });

  it('should use appropriate stroke width for lines', async () => {
    const mockHistory = [
      { date: '2026-01-12', price: 150, score: 85 },
      { date: '2026-01-13', price: 151, score: 86 },
    ];

    csvStockRepository.fetchStockHistory.mockResolvedValue(mockHistory);

    renderWithTheme(<StockPriceChart ticker="AAPL" />);

    await waitFor(() => {
      const priceLine = screen.getByTestId('line-price');
      const scoreLine = screen.getByTestId('line-score');

      // Both lines should have strokeWidth of 2
      expect(priceLine.getAttribute('data-stroke-width')).toBe('2');
      expect(scoreLine.getAttribute('data-stroke-width')).toBe('2');
    });
  });

  it('should calculate minimum price domain padding of 1', async () => {
    // Test with very small price range
    const mockHistory = [
      { date: '2026-01-12', price: 100.0, score: 85 },
      { date: '2026-01-13', price: 100.1, score: 86 },
    ];

    csvStockRepository.fetchStockHistory.mockResolvedValue(mockHistory);

    renderWithTheme(<StockPriceChart ticker="AAPL" />);

    await waitFor(() => {
      const leftYAxis = screen.getByTestId('y-axis-left');
      const domain = JSON.parse(leftYAxis.getAttribute('data-domain'));

      // Should have at least 1 unit of padding even for small range
      expect(domain[0]).toBeLessThanOrEqual(99);
      expect(domain[1]).toBeGreaterThanOrEqual(101.1);
    });
  });
});
