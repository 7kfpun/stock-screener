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
import { tooltipFieldGroups } from './StockTooltipConfig';
import { formatCountry } from '../../shared/formatters';

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

      {/* Complete Stock Details from Tooltip */}
      <Divider sx={{ my: 3 }} />

      {/* Company Info */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {stock.Sector || '-'} • {stock.Industry || '-'} • {formatCountry(stock.Country)}
        </Typography>
      </Box>

      {/* All Metric Sections */}
      <Stack spacing={3}>
        {tooltipFieldGroups.map((section) => (
          <Box key={section.title}>
            <Typography
              variant="overline"
              sx={{
                letterSpacing: '0.08em',
                color: 'text.secondary',
                fontWeight: 600,
                display: 'block',
                mb: 1.5
              }}
            >
              {section.title}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1.5,
              }}
            >
              {section.fields.map((field) => (
                <Box
                  key={field.label}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.25
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {field.label}
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {field.formatter ? field.formatter(stock[field.key]) : stock[field.key] || '-'}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Stack>
    </Drawer>
  );
}
