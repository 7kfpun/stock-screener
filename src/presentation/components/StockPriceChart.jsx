import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  LineChart,
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
 * StockPriceChart - Displays historical price and score for a stock
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

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle1" gutterBottom fontWeight="medium">
        Price & Score History
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Showing {data.length} continuous data points
      </Typography>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
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
            yAxisId="left"
            type="monotone"
            dataKey="price"
            stroke={theme.palette.primary.main}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />

          <Line
            yAxisId="right"
            type="monotone"
            dataKey="score"
            stroke={theme.palette.secondary.main}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
