import { 
  validateLocale, 
  parseAcceptLanguage,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
} from '@/lib/i18n/language-utils';

describe('validateLocale', () => {
  describe('security validations', () => {
    it('rejects XSS attempts in locale', () => {
      expect(validateLocale('<script>alert(1)</script>')).toBe(DEFAULT_LOCALE);
      expect(validateLocale('en"><script>')).toBe(DEFAULT_LOCALE);
      expect(validateLocale('javascript:alert(1)')).toBe(DEFAULT_LOCALE);
      expect(validateLocale('en\"><img src=x onerror=alert(1)>')).toBe(DEFAULT_LOCALE);
    });

    it('rejects SQL injection attempts', () => {
      expect(validateLocale("en'; DROP TABLE users;--")).toBe(DEFAULT_LOCALE);
      expect(validateLocale('en OR 1=1')).toBe(DEFAULT_LOCALE);
      expect(validateLocale('en UNION SELECT *')).toBe(DEFAULT_LOCALE);
    });

    it('rejects null bytes and special characters', () => {
      expect(validateLocale('en\x00')).toBe(DEFAULT_LOCALE);
      expect(validateLocale('en\n')).toBe(DEFAULT_LOCALE);
      expect(validateLocale('en\r\n')).toBe(DEFAULT_LOCALE);
      expect(validateLocale('en\t')).toBe(DEFAULT_LOCALE);
      expect(validateLocale('en\\"')).toBe(DEFAULT_LOCALE);
      expect(validateLocale("en'")).toBe(DEFAULT_LOCALE);
    });

    it('rejects excessively long input', () => {
      expect(validateLocale('a'.repeat(1000))).toBe(DEFAULT_LOCALE);
      expect(validateLocale('en' + 'x'.repeat(100))).toBe(DEFAULT_LOCALE);
    });

    it('rejects non-string inputs', () => {
      expect(validateLocale(null)).toBe(DEFAULT_LOCALE);
      expect(validateLocale(undefined)).toBe(DEFAULT_LOCALE);
      expect(validateLocale(123)).toBe(DEFAULT_LOCALE);
      expect(validateLocale({})).toBe(DEFAULT_LOCALE);
      expect(validateLocale([])).toBe(DEFAULT_LOCALE);
      expect(validateLocale(true)).toBe(DEFAULT_LOCALE);
      expect(validateLocale(false)).toBe(DEFAULT_LOCALE);
    });

    it('rejects invalid BCP 47 format', () => {
      expect(validateLocale('123')).toBe(DEFAULT_LOCALE);
      expect(validateLocale('e')).toBe(DEFAULT_LOCALE);
      expect(validateLocale('en-')).toBe(DEFAULT_LOCALE);
      expect(validateLocale('-en')).toBe(DEFAULT_LOCALE);
      expect(validateLocale('en--us')).toBe(DEFAULT_LOCALE);
    });
  });

  describe('valid locale handling', () => {
    it('accepts all supported locales', () => {
      SUPPORTED_LOCALES.forEach(locale => {
        expect(validateLocale(locale)).toBe(locale);
      });
    });

    it('handles case-insensitive matching', () => {
      expect(validateLocale('EN')).toBe('en');
      expect(validateLocale('En')).toBe('en');
      expect(validateLocale('ZH-tw')).toBe('zh-TW');
      expect(validateLocale('zh-tw')).toBe('zh-TW');
    });

    it('trims whitespace', () => {
      expect(validateLocale('  en  ')).toBe('en');
      expect(validateLocale('\ten\t')).toBe('en');
      expect(validateLocale(' zh-TW ')).toBe('zh-TW');
    });

    it('returns default for unsupported but valid-format locales', () => {
      expect(validateLocale('xx')).toBe(DEFAULT_LOCALE);
      expect(validateLocale('zz-ZZ')).toBe(DEFAULT_LOCALE);
      expect(validateLocale('ab-CD')).toBe(DEFAULT_LOCALE);
    });
  });
});

describe('parseAcceptLanguage', () => {
  describe('valid parsing', () => {
    it('parses simple Accept-Language header', () => {
      expect(parseAcceptLanguage('en')).toBe('en');
      expect(parseAcceptLanguage('es')).toBe('es');
      expect(parseAcceptLanguage('fr')).toBe('fr');
    });

    it('parses weighted Accept-Language header', () => {
      expect(parseAcceptLanguage('es;q=0.9,en;q=0.8')).toBe('es');
      expect(parseAcceptLanguage('en;q=0.8,es;q=0.9')).toBe('es');
      expect(parseAcceptLanguage('fr;q=1.0,en;q=0.8,es;q=0.9')).toBe('fr');
    });

    it('handles regional variants', () => {
      expect(parseAcceptLanguage('en-US,en;q=0.9')).toBe('en');
      expect(parseAcceptLanguage('zh-TW,zh;q=0.9')).toBe('zh-TW');
      expect(parseAcceptLanguage('es-ES,es;q=0.9,en;q=0.8')).toBe('es');
    });

    it('handles complex Accept-Language headers', () => {
      expect(parseAcceptLanguage('fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7')).toBe('fr');
      expect(parseAcceptLanguage('de-DE,de;q=0.9,en;q=0.8,zh-TW;q=0.7')).toBe('de');
    });
  });

  describe('security and error handling', () => {
    it('handles malformed headers safely', () => {
      expect(parseAcceptLanguage('')).toBe(DEFAULT_LOCALE);
      expect(parseAcceptLanguage(null)).toBe(DEFAULT_LOCALE);
      expect(parseAcceptLanguage(undefined)).toBe(DEFAULT_LOCALE);
      expect(parseAcceptLanguage(';;;')).toBe(DEFAULT_LOCALE);
      expect(parseAcceptLanguage('q=0.9')).toBe(DEFAULT_LOCALE);
      expect(parseAcceptLanguage(';q=0.9')).toBe(DEFAULT_LOCALE);
    });

    it('rejects excessively long headers', () => {
      const longHeader = 'en,'.repeat(1000);
      expect(parseAcceptLanguage(longHeader)).toBe(DEFAULT_LOCALE);
    });

    it('handles invalid quality values', () => {
      expect(parseAcceptLanguage('en;q=invalid')).toBe('en');
      expect(parseAcceptLanguage('en;q=2.0')).toBe(DEFAULT_LOCALE); // q > 1.0 is invalid
      expect(parseAcceptLanguage('en;q=-0.5')).toBe(DEFAULT_LOCALE); // negative q is invalid
    });

    it('limits number of language entries processed', () => {
      const manyLanguages = Array.from({ length: 50 }, (_, i) => `lang${i};q=0.${i}`).join(',');
      // Should still work but only process first 10
      expect(parseAcceptLanguage(manyLanguages + ',en;q=0.1')).toBe(DEFAULT_LOCALE);
    });

    it('handles malicious injection attempts', () => {
      expect(parseAcceptLanguage('en<script>alert(1)</script>')).toBe(DEFAULT_LOCALE);
      expect(parseAcceptLanguage('en"; DROP TABLE;--')).toBe(DEFAULT_LOCALE);
      expect(parseAcceptLanguage('en\x00')).toBe(DEFAULT_LOCALE);
    });
  });

  describe('fallback behavior', () => {
    it('falls back to default when no supported languages found', () => {
      expect(parseAcceptLanguage('xx-YY,zz;q=0.9')).toBe(DEFAULT_LOCALE);
      expect(parseAcceptLanguage('invalid-lang')).toBe(DEFAULT_LOCALE);
    });

    it('finds base language when regional variant not supported', () => {
      expect(parseAcceptLanguage('en-AU,en;q=0.9')).toBe('en'); // en-AU not in list, falls back to en
      expect(parseAcceptLanguage('fr-CA,fr;q=0.9')).toBe('fr'); // fr-CA not in list, falls back to fr
    });
  });
});