import type { IncomingMessage } from 'http';
import type { NextApiRequest } from 'next';
import { 
  validateLocale, 
  parseAcceptLanguage, 
  LOCALE_COOKIE_NAME,
  DEFAULT_LOCALE,
  type SupportedLocale 
} from './language-utils';

interface DetectionContext {
  cookies?: Record<string, string>;
  acceptLanguage?: string | null;
}

/**
 * Parses cookies from request headers.
 * 
 * Security: Cookie values are untrusted - parsed safely.
 */
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader || typeof cookieHeader !== 'string') {
    return {};
  }

  // Limit cookie header length
  if (cookieHeader.length > 4096) {
    return {};
  }

  const cookies: Record<string, string> = {};
  
  try {
    cookieHeader.split(';').slice(0, 50).forEach(cookie => {
      const [name, ...valueParts] = cookie.split('=');
      const trimmedName = name?.trim();
      if (trimmedName) {
        cookies[trimmedName] = valueParts.join('=').trim();
      }
    });
  } catch {
    return {};
  }

  return cookies;
}

/**
 * Detects the appropriate locale from a request.
 * 
 * Priority order:
 * 1. URL locale parameter (if using i18n routing)
 * 2. NEXT_LOCALE cookie (user preference)
 * 3. Accept-Language header (browser preference)
 * 4. Default locale
 * 
 * Security: All inputs are validated through whitelist before use.
 */
export function detectLanguageFromRequest(
  req: IncomingMessage | NextApiRequest
): SupportedLocale {
  try {
    // Extract context from request
    const cookies = parseCookies(req.headers.cookie);
    const acceptLanguage = req.headers['accept-language'];

    // Check for Next.js locale in URL (if using i18n routing)
    if ('query' in req && req.query?.locale) {
      const urlLocale = Array.isArray(req.query.locale) 
        ? req.query.locale[0] 
        : req.query.locale;
      const validated = validateLocale(urlLocale);
      if (validated !== DEFAULT_LOCALE || urlLocale === DEFAULT_LOCALE) {
        return validated;
      }
    }

    // Check cookie preference
    const cookieLocale = cookies[LOCALE_COOKIE_NAME];
    if (cookieLocale) {
      const validated = validateLocale(cookieLocale);
      if (validated !== DEFAULT_LOCALE || cookieLocale.toLowerCase() === DEFAULT_LOCALE) {
        return validated;
      }
    }

    // Parse Accept-Language header
    return parseAcceptLanguage(acceptLanguage);
  } catch {
    // Fail secure
    return DEFAULT_LOCALE;
  }
}

/**
 * Creates detection context for use in getServerSideProps/getInitialProps
 */
export function createDetectionContext(
  req: IncomingMessage | NextApiRequest
): DetectionContext {
  return {
    cookies: parseCookies(req.headers.cookie),
    acceptLanguage: req.headers['accept-language'] ?? null,
  };
}