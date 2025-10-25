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

const coerceNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const numeric = Number.parseFloat(value);
  return Number.isNaN(numeric) ? null : numeric;
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
