import {
  formatMoney,
  formatPercent,
  formatPrice,
  formatNumber,
  formatVolume,
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
