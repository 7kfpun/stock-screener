import { Box, Typography } from '@mui/material';
import { formatCountry } from '../../shared/formatters';
import { tooltipFieldGroups } from './StockTooltipConfig';

export function StockTooltip({ stock }) {
  if (!stock) return null;

  return (
    <Box sx={{ maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {stock.Company} ({stock.Ticker})
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          {stock.Sector || '-'} • {stock.Industry || '-'} • {formatCountry(stock.Country)}
        </Typography>
      </Box>

      {tooltipFieldGroups.map((section) => (
        <Box key={section.title} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="overline" sx={{ letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)' }}>
            {section.title}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 0.5,
            }}
          >
            {section.fields.map((field) => (
              <Box
                key={field.label}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  {field.label}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {field.formatter ? field.formatter(stock[field.key]) : stock[field.key] || '-'}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
