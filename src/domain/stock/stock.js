export const STOCK_NUMERIC_FIELDS = [
  'Investor_Score',
  'Price',
  'Change',
  'Market Cap',
  'Volume',
  'P/E',
  'Fwd P/E',
  'PEG',
  'P/S',
  'P/B',
  'ROE',
  'ROA',
  'ROIC',
  'Profit M',
  'Gross M',
  'EPS This Y',
  'EPS Next Y',
  'EPS Next 5Y',
  'Sales Past 5Y',
  'Beta',
  'SMA50',
  'SMA200',
  '52W High',
  '52W Low',
  'RSI',
];

// Percentage fields are stored as fractions (0.0103), but some CSVs carry
// finviz's display string instead: ROIC has always been "19.87%", and Change
// has been "1.03%" since finviz's Aug 2026 column rename. parseFloat would read
// those as 19.87 and 1.03, which the percent formatters then multiply by 100
// again ("+103.00%"), so a trailing "%" is scaled down to the same fraction.
const coerceNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const numeric = Number.parseFloat(value);
  if (Number.isNaN(numeric)) return null;
  return typeof value === 'string' && value.trim().endsWith('%') ? numeric / 100 : numeric;
};

export function createStock(rawRow) {
  if (!rawRow) return null;

  const stock = { ...rawRow };

  STOCK_NUMERIC_FIELDS.forEach((field) => {
    stock[field] = coerceNumber(rawRow[field]);
  });

  // Preserve canonical casing for key identifiers.
  stock.Ticker = rawRow.Ticker?.trim() || '';
  stock.Company = rawRow.Company?.trim() || '';
  stock.Sector = rawRow.Sector?.trim() || '';
  stock.Industry = rawRow.Industry?.trim() || '';
  stock.Country = rawRow.Country?.trim() || '';

  return stock;
}

export function createStockCollection(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(createStock)
    .filter(Boolean);
}
