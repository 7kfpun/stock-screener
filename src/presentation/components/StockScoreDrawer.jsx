import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Divider,
  Chip,
  Stack,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { calculateScoreBreakdown } from '../../domain/stock/scoreCalculator';

/**
 * StockScoreDrawer - Displays detailed Investor Score breakdown in a right-side drawer
 * Features:
 * - Radar chart visualization of the 4 score components
 * - Progress bars for each metric
 * - Key metrics display
 * - Color-coded score tier (High/Medium/Low)
 */
export function StockScoreDrawer({ open, stock, onClose }) {
  const theme = useTheme();

  if (!stock) return null;

  const breakdown = calculateScoreBreakdown(stock);
  const score = stock.Investor_Score || 0;

  // Determine score tier
  const getScoreTier = (score) => {
    if (score >= 80) return { label: 'High', color: 'success' };
    if (score >= 50) return { label: 'Medium', color: 'secondary' };
    return { label: 'Low', color: 'error' };
  };

  const tier = getScoreTier(score);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 400, md: 480 },
          p: 3
        }
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="div" gutterBottom>
            {stock.Ticker}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {stock.Company}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              label={`Score: ${score}`}
              color={tier.color}
              size="small"
            />
            <Chip
              label={tier.label}
              variant="outlined"
              size="small"
            />
          </Stack>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Radar Chart */}
      <Typography variant="subtitle1" gutterBottom fontWeight="medium">
        Score Breakdown
      </Typography>

      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={breakdown}>
          <PolarGrid
            stroke={theme.palette.divider}
            strokeDasharray="3 3"
          />

          <PolarAngleAxis
            dataKey="metric"
            tick={{
              fill: theme.palette.text.primary,
              fontSize: 12,
              fontWeight: 500
            }}
          />

          <PolarRadiusAxis
            angle={90}
            domain={[0, 30]}
            tick={{
              fill: theme.palette.text.secondary,
              fontSize: 10
            }}
            tickCount={4}
          />

          <Radar
            name={stock.Ticker}
            dataKey="value"
            stroke={theme.palette.primary.main}
            fill={theme.palette.primary.main}
            fillOpacity={0.5}
            strokeWidth={2}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: theme.shape.borderRadius
            }}
            formatter={(value, name, props) => [
              `${value}/${props.payload.max} pts`,
              props.payload.metric
            ]}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Score Details with Progress Bars */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Score Components
        </Typography>
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {breakdown.map(({ metric, value, max }) => {
            const percentage = (value / max) * 100;
            return (
              <Box key={metric}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {metric}
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {value}/{max} pts
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: '100%',
                    height: 6,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    overflow: 'hidden'
                  }}
                >
                  <Box
                    sx={{
                      width: `${percentage}%`,
                      height: '100%',
                      bgcolor: percentage > 66 ? 'success.main' : percentage > 33 ? 'warning.main' : 'error.main',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* Additional Stock Info */}
      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle2" gutterBottom>
        Key Metrics
      </Typography>
      <Stack spacing={1} sx={{ mt: 2 }}>
        <MetricRow label="PEG Ratio" value={stock.PEG?.toFixed(2)} />
        <MetricRow label="ROE" value={stock.ROE ? `${(stock.ROE * 100).toFixed(1)}%` : null} />
        <MetricRow label="Profit Margin" value={stock['Profit M'] ? `${(stock['Profit M'] * 100).toFixed(1)}%` : null} />
        <MetricRow label="EPS Growth (5Y)" value={stock['EPS Next 5Y'] ? `${(stock['EPS Next 5Y'] * 100).toFixed(1)}%` : null} />
      </Stack>

      {/* Sector and Industry */}
      <Divider sx={{ my: 3 }} />

      <Stack spacing={1}>
        <MetricRow label="Sector" value={stock.Sector} />
        <MetricRow label="Industry" value={stock.Industry} />
        <MetricRow label="Country" value={stock.Country} />
      </Stack>
    </Drawer>
  );
}

/**
 * MetricRow - Helper component for displaying metric label-value pairs
 */
function MetricRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight="medium">
        {value ?? 'N/A'}
      </Typography>
    </Box>
  );
}
