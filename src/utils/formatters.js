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
  'USA': '🇺🇸',
  'China': '🇨🇳',
  'Canada': '🇨🇦',
  'United Kingdom': '🇬🇧',
  'Germany': '🇩🇪',
  'France': '🇫🇷',
  'Japan': '🇯🇵',
  'India': '🇮🇳',
  'Brazil': '🇧🇷',
  'Australia': '🇦🇺',
  'South Korea': '🇰🇷',
  'Israel': '🇮🇱',
  'Netherlands': '🇳🇱',
  'Sweden': '🇸🇪',
  'Switzerland': '🇨🇭',
  'Spain': '🇪🇸',
  'Italy': '🇮🇹',
  'Taiwan': '🇹🇼',
  'Singapore': '🇸🇬',
  'Hong Kong': '🇭🇰',
  'Mexico': '🇲🇽',
  'Ireland': '🇮🇪',
  'Belgium': '🇧🇪',
  'Denmark': '🇩🇰',
  'Norway': '🇳🇴',
  'Finland': '🇫🇮',
  'Poland': '🇵🇱',
  'Russia': '🇷🇺',
  'Argentina': '🇦🇷',
  'Chile': '🇨🇱',
  'New Zealand': '🇳🇿',
  'South Africa': '🇿🇦',
  'Luxembourg': '🇱🇺',
  'Austria': '🇦🇹',
  'Portugal': '🇵🇹',
  'Greece': '🇬🇷',
  'Turkey': '🇹🇷',
  'UAE': '🇦🇪',
  'Saudi Arabia': '🇸🇦',
  'Malaysia': '🇲🇾',
  'Thailand': '🇹🇭',
  'Indonesia': '🇮🇩',
  'Vietnam': '🇻🇳',
  'Philippines': '🇵🇭',
  'Colombia': '🇨🇴',
  'Peru': '🇵🇪',
  'Panama': '🇵🇦',
  'Egypt': '🇪🇬',
  'Qatar': '🇶🇦',
  'Kuwait': '🇰🇼',
  'Bermuda': '🇧🇲',
  'Cayman Islands': '🇰🇾',
  'Jersey': '🇯🇪',
  'Guernsey': '🇬🇬',
  'Isle of Man': '🇮🇲',
  'Cyprus': '🇨🇾',
  'Malta': '🇲🇹',
  'Monaco': '🇲🇨',
  'Liechtenstein': '🇱🇮'
};

export function formatCountry(value) {
  if (!value || value === '') return '-';
  return COUNTRY_FLAGS[value] || '🏳️';
}

export function formatScore(value) {
  if (!value || value === '') return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return '-';
  return num.toFixed(0);
}
