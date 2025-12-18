// Data formatters
export function formatMoney(value) {
  if (!value || value === '') return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return value;

  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toFixed(0)}`;
}

export function formatVolume(value) {
  if (!value || value === '') return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return value;

  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(0);
}

export function formatPercent(value) {
  if (!value || value === '') return '-';
  if (typeof value === 'string' && value.includes('%')) return value;

  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return `${(num * 100).toFixed(2)}%`;
}

export function formatPrice(value) {
  if (!value || value === '') return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return `$${num.toFixed(2)}`;
}

export function formatNumber(value, decimals = 2) {
  if (!value || value === '') return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toFixed(decimals);
}

export const COUNTRY_FLAGS = {
  // common flags that listed in s&p500 and nasdaq
  'USA': 'US',
  'China': 'CN',
  'Canada': 'CA',
  'United Kingdom': 'GB',
  'Germany': 'DE',
  'France': 'FR',
  'Japan': 'JP',
  'India': 'IN',
  'Brazil': 'BR',
  'Australia': 'AU',
  'South Korea': 'KR',
  'Israel': 'IL',
  'Netherlands': 'NL',
  'Sweden': 'SE',
  'Switzerland': 'CH',
  'Spain': 'ES',
  'Italy': 'IT',
  'Taiwan': 'TW',
  'Singapore': 'SG',
  'Hong Kong': 'HK',
  'Mexico': 'MX',
  'Ireland': 'IE',
  'Belgium': 'BE',
  'Denmark': 'DK',
  'Norway': 'NO',
  'Finland': 'FI',
  'Poland': 'PL',
  'Russia': 'RU',
  'Argentina': 'AR',
  'Chile': 'CL',
  'New Zealand': 'NZ',
  'South Africa': 'ZA',
  'Luxembourg': 'LU',
  'Austria': 'AT',
  'Portugal': 'PT',
  'Greece': 'GR',
  'Turkey': 'TR',
  'UAE': 'AE',
  'Saudi Arabia': 'SA',
  'Malaysia': 'MY',
  'Thailand': 'TH',
  'Indonesia': 'ID',
  'Vietnam': 'VN',
  'Philippines': 'PH',
  'Colombia': 'CO',
  'Peru': 'PE',
  'Panama': 'PA',
  'Egypt': 'EG',
  'Qatar': 'QA',
  'Kuwait': 'KW',
  'Bermuda': 'BM',
  'Cayman Islands': 'KY',
  'Jersey': 'JE',
  'Guernsey': 'GG',
  'Isle of Man': 'IM',
  'Cyprus': 'CY',
  'Malta': 'MT',
  'Monaco': 'MC',
  'Liechtenstein': 'LI',
};

export function formatCountry(value) {
  if (!value || value === '') return '-';
  return COUNTRY_FLAGS[value] || '-';
}

export function formatScore(value) {
  if (!value || value === '') return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return '-';
  return num.toFixed(0);
}
