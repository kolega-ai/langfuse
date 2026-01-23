import { useLocale } from '@/hooks/useLocale';
import { LANGUAGE_NAMES, type SupportedLocale } from '@/lib/i18n/language-utils';
import { useCallback, type ChangeEvent } from 'react';

interface LanguageSelectorProps {
  /** Additional CSS classes */
  className?: string;
  /** Accessible label for the selector */
  ariaLabel?: string;
}

/**
 * Accessible language selector component.
 * 
 * Security:
 * - All options are from static whitelist
 * - Values are validated before use
 * - No user-generated content in render
 */
export function LanguageSelector({ 
  className = '', 
  ariaLabel = 'Select language' 
}: LanguageSelectorProps) {
  const { locale, locales, setLocale, isChanging } = useLocale();

  const handleChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setLocale(event.target.value);
  }, [setLocale]);

  return (
    <div className={`language-selector ${className}`}>
      <label htmlFor="language-select" className="sr-only">
        {ariaLabel}
      </label>
      <select
        id="language-select"
        value={locale}
        onChange={handleChange}
        disabled={isChanging}
        aria-label={ariaLabel}
        aria-busy={isChanging}
        className="language-select"
        style={{
          padding: '8px 12px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          fontSize: '14px',
          backgroundColor: 'white',
          minWidth: '120px',
        }}
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {LANGUAGE_NAMES[loc]}
          </option>
        ))}
      </select>
      {isChanging && (
        <span 
          className="language-loading" 
          aria-hidden="true"
          style={{ 
            marginLeft: '8px', 
            fontSize: '12px',
            color: '#666',
          }}
        >
          Changing...
        </span>
      )}
    </div>
  );
}