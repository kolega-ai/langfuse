/**
 * Internationalization utilities with security-first design
 * 
 * Security considerations:
 * - Strict whitelist approach for all locale values
 * - Input validation and sanitization
 * - Protection against XSS, injection attacks
 * - Fail-secure defaults
 */

/**
 * Supported locales - whitelist approach for security
 * Only these exact values will ever be used in the HTML lang attribute
 */
export const SUPPORTED_LOCALES = [
  'en',      // English
  'es',      // Spanish
  'fr',      // French
  'de',      // German
  'pt',      // Portuguese
  'zh',      // Chinese (Simplified)
  'zh-TW',   // Chinese (Traditional)
  'ja',      // Japanese
  'ko',      // Korean
  'ar',      // Arabic
  'ru',      // Russian
  'it',      // Italian
  'nl',      // Dutch
  'pl',      // Polish
  'vi',      // Vietnamese
] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

/**
 * Human-readable language names
 * These are safe static strings - no XSS risk
 */
export const LANGUAGE_NAMES: Record<SupportedLocale, string> = {
  'en': 'English',
  'es': 'Español',
  'fr': 'Français',
  'de': 'Deutsch',
  'pt': 'Português',
  'zh': '中文 (简体)',
  'zh-TW': '中文 (繁體)',
  'ja': '日本語',
  'ko': '한국어',
  'ar': 'العربية',
  'ru': 'Русский',
  'it': 'Italiano',
  'nl': 'Nederlands',
  'pl': 'Polski',
  'vi': 'Tiếng Việt',
};

/**
 * BCP 47 language tag regex for initial format validation
 * This is a simplified pattern - we still whitelist after matching
 */
const BCP47_PATTERN = /^[a-zA-Z]{2,3}(?:-[a-zA-Z]{2,4})?$/;

/**
 * Validates and sanitizes a language code input.
 * 
 * Security considerations:
 * 1. Strict whitelist approach - only known-good values pass
 * 2. No user input is ever used directly in HTML
 * 3. Pattern validation before lookup (defense in depth)
 * 4. Always returns a valid locale or default
 * 
 * @param input - Raw language input from any source (headers, cookies, params)
 * @returns A guaranteed-safe SupportedLocale value
 */
export function validateLocale(input: unknown): SupportedLocale {
  // Type guard - must be a string
  if (typeof input !== 'string') {
    return DEFAULT_LOCALE;
  }

  // Length check - BCP 47 tags are short
  if (input.length > 10) {
    return DEFAULT_LOCALE;
  }

  // Normalize: trim whitespace, lowercase for comparison
  const normalized = input.trim().toLowerCase();

  // Format validation (defense in depth)
  if (!BCP47_PATTERN.test(normalized)) {
    return DEFAULT_LOCALE;
  }

  // Whitelist lookup - case-insensitive matching
  const match = SUPPORTED_LOCALES.find(
    locale => locale.toLowerCase() === normalized
  );

  return match ?? DEFAULT_LOCALE;
}

/**
 * Parses the Accept-Language header and returns the best matching locale.
 * 
 * Security: Header value is untrusted input - fully validated before use.
 * 
 * @param acceptLanguage - Raw Accept-Language header value
 * @returns Best matching SupportedLocale
 */
export function parseAcceptLanguage(acceptLanguage: string | null | undefined): SupportedLocale {
  if (!acceptLanguage || typeof acceptLanguage !== 'string') {
    return DEFAULT_LOCALE;
  }

  // Limit header length to prevent DoS via regex
  if (acceptLanguage.length > 500) {
    return DEFAULT_LOCALE;
  }

  try {
    // Parse Accept-Language header format: "en-US,en;q=0.9,es;q=0.8"
    const languages = acceptLanguage
      .split(',')
      .slice(0, 10) // Limit number of entries
      .map(part => {
        const [lang, qValue] = part.trim().split(';');
        const quality = qValue?.match(/q=([\d.]+)/)?.[1];
        return {
          lang: lang?.trim() ?? '',
          quality: quality ? parseFloat(quality) : 1.0,
        };
      })
      .filter(({ lang, quality }) => 
        lang && 
        !isNaN(quality) && 
        quality >= 0 && 
        quality <= 1
      )
      .sort((a, b) => b.quality - a.quality);

    // Find first matching supported locale
    for (const { lang } of languages) {
      // Try exact match first
      const exactMatch = validateLocale(lang);
      if (exactMatch !== DEFAULT_LOCALE || lang.toLowerCase() === DEFAULT_LOCALE) {
        return exactMatch;
      }

      // Try base language (e.g., "en-US" -> "en")
      const baseLang = lang.split('-')[0];
      const baseMatch = validateLocale(baseLang);
      if (baseMatch !== DEFAULT_LOCALE || baseLang?.toLowerCase() === DEFAULT_LOCALE) {
        return baseMatch;
      }
    }
  } catch {
    // Any parsing error -> return default (fail secure)
    return DEFAULT_LOCALE;
  }

  return DEFAULT_LOCALE;
}

/**
 * Language preference cookie name
 */
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

/**
 * Cookie configuration for security
 */
export const LOCALE_COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 365, // 1 year
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  httpOnly: false, // Needs client-side access for UX
};