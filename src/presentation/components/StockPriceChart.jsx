import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { fetchStockHistory } from '../../data/csvStockRepository';
import { formatPrice, formatNumber } from '../../shared/formatters';

/**
 * StockPriceChart - Displays historical price (area) and score (line) for a stock
 * Uses continuous data from most recent backwards (stops at first gap)
 */
export function StockPriceChart({ ticker }) {
  const theme = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      if (!ticker) return;

      setLoading(true);
      setError(null);

      try {
        const history = await fetchStockHistory(ticker);

        if (!isMounted) return;

        if (history.length === 0) {
          setError('No historical data available');
        } else {
          // Transform data for Recharts
          const chartData = history.map(point => ({
            date: point.date,
            // Format date for display (MMM DD)
            displayDate: new Date(point.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            }),
            price: point.price,
            score: point.score
          }));
          setData(chartData);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load stock history:', err);
        setError('Failed to load historical data');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [ticker]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          {error}
        </Typography>
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          No historical data available for this stock
        </Typography>
      </Box>
    );
  }

  // Calculate price domain - positioned in upper half of chart
  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const pricePadding = Math.max(priceRange * 0.1, 1); // 10% padding or at least 1

  // Scale price to occupy upper portion (visually above score)
  const priceMin = Math.max(0, minPrice - pricePadding);
  const priceMax = maxPrice + pricePadding;
  const priceRangeWithPadding = priceMax - priceMin;

  // Extend domain downward to push price visually higher (above score)
  // Increased multiplier to maintain separation with score domain at [0, 100]
  const priceDomain = [
    priceMin - (priceRangeWithPadding * 2.5), // Add space below to push up
    priceMax
  ];

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom fontWeight="medium">
        Price & Score History
      </Typography>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.palette.divider}
          />

          <XAxis
            dataKey="displayDate"
            tick={{
              fill: theme.palette.text.secondary,
              fontSize: 11
            }}
            stroke={theme.palette.divider}
          />

          <YAxis
            yAxisId="left"
            domain={priceDomain}
            tick={{
              fill: theme.palette.text.secondary,
              fontSize: 11
            }}
            stroke={theme.palette.divider}
            label={{
              value: 'Price ($)',
              angle: -90,
              position: 'insideLeft',
              style: {
                fill: theme.palette.text.secondary,
                fontSize: 11
              }
            }}
            tickFormatter={(value) => {
              // Format axis ticks as whole numbers for stocks >= $10
              // or 2 decimals for stocks < $10
              return value >= 10 ? Math.round(value).toString() : value.toFixed(2);
            }}
          />

          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tick={{
              fill: theme.palette.text.secondary,
              fontSize: 11
            }}
            stroke={theme.palette.divider}
            label={{
              value: 'Score',
              angle: 90,
              position: 'insideRight',
              style: {
                fill: theme.palette.text.secondary,
                fontSize: 11
              }
            }}
            tickFormatter={(value) => Math.round(value).toString()}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: theme.shape.borderRadius,
              fontSize: 12
            }}
            formatter={(value, name) => {
              if (name === 'price') {
                return [formatPrice(value), 'Price'];
              }
              return [formatNumber(value, 0), 'Score'];
            }}
            labelFormatter={(label) => {
              // Find the full date for this label
              const point = data.find(d => d.displayDate === label);
              return point ? point.date : label;
            }}
          />

          <Legend
            wrapperStyle={{
              fontSize: 12,
              paddingTop: 10
            }}
            formatter={(value) => {
              if (value === 'price') return 'Price ($)';
              if (value === 'score') return 'Investor Score';
              return value;
            }}
          />

          <Line
            yAxisId="right"
            type="linear"
            dataKey="score"
            stroke={theme.palette.secondary.main}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />

          <Area
            yAxisId="left"
            type="linear"
            dataKey="price"
            stroke={theme.palette.primary.main}
            fill={theme.palette.primary.main}
            fillOpacity={0.6}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}
