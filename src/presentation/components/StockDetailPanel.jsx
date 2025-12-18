import {
  Box,
  IconButton,
  Typography,
  Divider,
  Chip,
  Stack,
  useTheme,
  Dialog,
  AppBar,
  Toolbar,
  Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
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
import { CountryFlag } from './CountryFlag';

/**
 * StockDetailPanel - Displays detailed Investor Score breakdown
 * Responsive: Desktop (split-view panel) / Mobile (full-screen dialog)
 */
export function StockDetailPanel({ stock, onClose, isMobile }) {
  const theme = useTheme();

  if (!stock) return null;

  const breakdown = calculateScoreBreakdown(stock);
  const score = stock.Investor_Score || 0;

  const getScoreTier = (score) => {
    if (score >= 80) return { label: 'High', color: 'success' };
    if (score >= 50) return { label: 'Medium', color: 'secondary' };
    return { label: 'Low', color: 'error' };
  };

  const tier = getScoreTier(score);

  const content = (
    <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontSize: '1.1rem', mb: 0.5 }}>
            {stock.Ticker}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75, fontSize: '0.8rem' }}>
            {stock.Company}
          </Typography>
          <Stack direction="row" spacing={0.5}>
            <Chip
              label={`Score: ${score}`}
              color={tier.color}
              size="small"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
            <Chip
              label={tier.label}
              variant="outlined"
              size="small"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          </Stack>
        </Box>
        {!isMobile && (
          <IconButton
            onClick={() => onClose(null)}
            size="small"
            sx={{
              '&:hover': {
                bgcolor: 'action.hover',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* External Links */}
      <Stack direction="row" spacing={0.5} sx={{ mt: 1, mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
        <Button
          size="small"
          variant="outlined"
          endIcon={<OpenInNewIcon sx={{ fontSize: '0.75rem' }} />}
          href={`https://finance.yahoo.com/quote/${stock.Ticker}`}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ fontSize: '0.65rem', py: 0.25, px: 0.75, minHeight: 24 }}
        >
          Yahoo
        </Button>
        <Button
          size="small"
          variant="outlined"
          endIcon={<OpenInNewIcon sx={{ fontSize: '0.75rem' }} />}
          href={`https://www.tradingview.com/symbols/${stock.Ticker}/`}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ fontSize: '0.65rem', py: 0.25, px: 0.75, minHeight: 24 }}
        >
          TradingView
        </Button>
        <Button
          size="small"
          variant="outlined"
          endIcon={<OpenInNewIcon sx={{ fontSize: '0.75rem' }} />}
          href={`https://www.marketwatch.com/investing/stock/${stock.Ticker}`}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ fontSize: '0.65rem', py: 0.25, px: 0.75, minHeight: 24 }}
        >
          MarketWatch
        </Button>
      </Stack>

      <Divider sx={{ mb: 2 }} />

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
            isAnimationActive={false}
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

      {/* Complete Stock Details */}
      <Divider sx={{ my: 3 }} />

      {/* Company Info */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {stock.Sector || '-'} • {stock.Industry || '-'}
        </Typography>
        <CountryFlag country={stock.Country} width={16} height={12} />
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
    </Box>
  );

  // Mobile: Full-screen dialog
  if (isMobile) {
    return (
      <Dialog fullScreen open={!!stock} onClose={() => onClose(null)}>
        <AppBar sx={{ position: 'relative' }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Stock Details
            </Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={() => onClose(null)}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        {content}
      </Dialog>
    );
  }

  // Desktop: Split-view panel
  return (
    <Box
      sx={{
        width: 500,
        minWidth: 500,
        maxWidth: 500,
        flexShrink: 0,
        height: '100%',
        bgcolor: 'background.paper',
        borderLeft: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden'
      }}
    >
      {content}
    </Box>
  );
}
