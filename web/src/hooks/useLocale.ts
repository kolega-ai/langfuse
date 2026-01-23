import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { 
  validateLocale, 
  SUPPORTED_LOCALES,
  LOCALE_COOKIE_NAME,
  LOCALE_COOKIE_OPTIONS,
  DEFAULT_LOCALE,
  type SupportedLocale 
} from '@/lib/i18n/language-utils';

interface UseLocaleReturn {
  /** Current active locale */
  locale: SupportedLocale;
  /** All supported locales */
  locales: readonly SupportedLocale[];
  /** Change the locale with validation */
  setLocale: (newLocale: string) => void;
  /** Whether locale is being changed */
  isChanging: boolean;
}

/**
 * Safely sets a cookie
 */
function setCookie(name: string, value: string, options: typeof LOCALE_COOKIE_OPTIONS): void {
  if (typeof document === 'undefined') return;

  const { maxAge, path, sameSite, secure } = options;
  
  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  cookieString += `; Max-Age=${maxAge}`;
  cookieString += `; Path=${path}`;
  cookieString += `; SameSite=${sameSite}`;
  
  if (secure) {
    cookieString += '; Secure';
  }

  document.cookie = cookieString;
}

/**
 * Hook for managing locale preference with security validations.
 * 
 * Features:
 * - Syncs with Next.js router locale
 * - Persists preference to cookie
 * - Validates all locale values
 * - Handles navigation for locale changes
 */
export function useLocale(): UseLocaleReturn {
  const router = useRouter();
  const [isChanging, setIsChanging] = useState(false);

  // Get current locale from router, validate it
  const currentLocale = validateLocale(router.locale);

  const setLocale = useCallback((newLocale: string) => {
    // Validate the new locale
    const validatedLocale = validateLocale(newLocale);
    
    if (validatedLocale === currentLocale) {
      return; // No change needed
    }

    setIsChanging(true);

    // Store preference in cookie
    setCookie(LOCALE_COOKIE_NAME, validatedLocale, LOCALE_COOKIE_OPTIONS);

    // Navigate to new locale URL
    const { pathname, query, asPath } = router;
    
    router.push({ pathname, query }, asPath, { 
      locale: validatedLocale,
      scroll: false,
    }).finally(() => {
      setIsChanging(false);
    });
  }, [currentLocale, router]);

  // Sync cookie with router locale on mount/change
  useEffect(() => {
    if (currentLocale) {
      setCookie(LOCALE_COOKIE_NAME, currentLocale, LOCALE_COOKIE_OPTIONS);
    }
  }, [currentLocale]);

  return {
    locale: currentLocale,
    locales: SUPPORTED_LOCALES,
    setLocale,
    isChanging,
  };
}

/**
 * Detect browser's preferred language (client-side only)
 * 
 * Security: Returns validated locale only
 */
export function detectBrowserLanguage(): SupportedLocale {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE;
  }

  // navigator.languages is an array of preferred languages
  const languages = navigator.languages ?? [navigator.language];
  
  for (const lang of languages) {
    const validated = validateLocale(lang);
    if (validated !== DEFAULT_LOCALE || lang?.toLowerCase().startsWith('en')) {
      return validated;
    }
  }

  return DEFAULT_LOCALE;
}