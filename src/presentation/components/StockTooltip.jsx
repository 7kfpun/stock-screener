import { Box, Typography } from '@mui/material';
import {
  formatMoney,
  formatPercent,
  formatPrice,
  formatNumber,
  formatVolume,
  formatCountry,
  formatScore,
} from '../../shared/formatters';

export const formatSignedPercent = (value) => {
  const formatted = formatPercent(value);
  if (formatted === '-') return formatted;
  const num = parseFloat(value);
  if (isNaN(num)) return formatted;
  return num > 0 ? `+${formatted}` : formatted;
};

export const tooltipFieldGroups = [
  {
    title: 'Snapshot',
    fields: [
      { label: 'Investor Score', key: 'Investor_Score', formatter: formatScore },
      { label: 'Price', key: 'Price', formatter: formatPrice },
      { label: 'Change', key: 'Change', formatter: formatSignedPercent },
      { label: 'Market Cap', key: 'Market Cap', formatter: formatMoney },
      { label: 'Volume', key: 'Volume', formatter: formatVolume },
    ],
  },
  {
    title: 'Valuation',
    fields: [
      { label: 'P/E', key: 'P/E', formatter: (value) => formatNumber(value, 2) },
      { label: 'Forward P/E', key: 'Fwd P/E', formatter: (value) => formatNumber(value, 2) },
      { label: 'PEG', key: 'PEG', formatter: (value) => formatNumber(value, 2) },
      { label: 'Price/Sales', key: 'P/S', formatter: (value) => formatNumber(value, 2) },
      { label: 'Price/Book', key: 'P/B', formatter: (value) => formatNumber(value, 2) },
    ],
  },
  {
    title: 'Profitability',
    fields: [
      { label: 'ROE', key: 'ROE', formatter: formatPercent },
      { label: 'ROA', key: 'ROA', formatter: formatPercent },
      { label: 'ROIC', key: 'ROIC', formatter: formatPercent },
      { label: 'Profit Margin', key: 'Profit M', formatter: formatPercent },
      { label: 'Gross Margin', key: 'Gross M', formatter: formatPercent },
    ],
  },
  {
    title: 'Growth',
    fields: [
      { label: 'EPS This Y', key: 'EPS This Y', formatter: formatPercent },
      { label: 'EPS Next Y', key: 'EPS Next Y', formatter: formatPercent },
      { label: 'EPS Next 5Y', key: 'EPS Next 5Y', formatter: formatPercent },
      { label: 'Sales Past 5Y', key: 'Sales Past 5Y', formatter: formatPercent },
    ],
  },
  {
    title: 'Technical',
    fields: [
      { label: 'SMA50', key: 'SMA50', formatter: formatPercent },
      { label: 'SMA200', key: 'SMA200', formatter: formatPercent },
      { label: '52W High', key: '52W High', formatter: formatPercent },
      { label: '52W Low', key: '52W Low', formatter: formatPercent },
      { label: 'RSI', key: 'RSI', formatter: (value) => formatNumber(value, 2) },
      { label: 'Beta', key: 'Beta', formatter: (value) => formatNumber(value, 2) },
    ],
  },
];

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
