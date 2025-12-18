import * as FlagIcons from 'country-flag-icons/react/3x2';
import { COUNTRY_FLAGS } from '../../shared/formatters';

/**
 * CountryFlag - Displays a country flag icon using SVG
 * Works consistently across all platforms including Windows
 */
export function CountryFlag({ country, width = 16, height = 12, style = {} }) {
  if (!country || country === '') return null;

  const countryCode = COUNTRY_FLAGS[country];
  if (!countryCode || countryCode === '-') return null;

  const FlagComponent = FlagIcons[countryCode];
  if (!FlagComponent) return null;

  return (
    <FlagComponent
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style
      }}
      title={country}
    />
  );
}
