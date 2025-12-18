import { useState } from 'react';
import * as FlagIcons from 'country-flag-icons/react/3x2';
import { COUNTRY_FLAGS } from '../../shared/formatters';

/**
 * Converts ISO country code to emoji flag
 * e.g., "US" -> "🇺🇸"
 */
function countryCodeToEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return null;

  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

/**
 * Detects if the platform supports emoji flags
 * Windows typically doesn't render emoji flags properly
 */
function detectEmojiSupport() {
  // Quick check: Windows doesn't support emoji flags well
  if (typeof navigator !== 'undefined' && /Windows/.test(navigator.userAgent)) {
    return false;
  }
  return true;
}

/**
 * CountryFlag - Displays a country flag using emoji (default) or SVG (fallback)
 * - Shows emoji flags on macOS, Linux, iOS, Android
 * - Falls back to SVG on Windows and other platforms without emoji support
 */
export function CountryFlag({ country, width = 16, height = 12, style = {} }) {
  const [supportsEmoji] = useState(detectEmojiSupport);

  if (!country || country === '') return null;

  const countryCode = COUNTRY_FLAGS[country];
  if (!countryCode || countryCode === '-') return null;

  // Use emoji if supported
  if (supportsEmoji) {
    const emoji = countryCodeToEmoji(countryCode);
    if (emoji) {
      return (
        <span
          style={{
            fontSize: `${width}px`,
            lineHeight: 1,
            display: 'inline-block',
            verticalAlign: 'middle',
            ...style
          }}
          title={country}
        >
          {emoji}
        </span>
      );
    }
  }

  // Fallback to SVG
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
