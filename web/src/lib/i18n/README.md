# Internationalization (i18n) Security Fix

This directory contains the security fix for the hardcoded HTML `lang` attribute issue identified in the security scan.

## Problem

The original code had a hardcoded `lang="en"` attribute in `layout.tsx`, which:
- Creates accessibility issues for non-English users
- Potentially enables social engineering attacks through language confusion
- Violates security best practices for internationalization

## Solution

### Security-First Architecture

1. **Strict Whitelist Validation**: All language values are validated against a predefined whitelist before being used in HTML output
2. **Input Sanitization**: All user inputs (headers, cookies, URL params) are sanitized and validated
3. **Defense in Depth**: Multiple layers of validation (format checking + whitelist lookup)
4. **Fail-Secure Design**: Any invalid input defaults to a safe fallback (`'en'`)

### Key Components

#### `language-utils.ts`
- Defines supported locales whitelist
- Implements secure validation functions
- Provides language parsing with security checks
- Handles BCP 47 language tag validation

#### `detect-language.ts`
- Server-side language detection from requests
- Secure cookie parsing with length limits
- Accept-Language header parsing with DoS protection
- Priority-based detection (URL → Cookie → Header → Default)

#### `_document.tsx`
- Custom Next.js Document for Pages Router
- Server-side language detection and validation
- Dynamic HTML `lang` attribute setting
- RTL language support with `dir` attribute

#### `useLocale.ts`
- Client-side locale management hook
- Secure cookie handling
- Next.js router integration for locale switching
- Browser language preference detection

#### `LanguageSelector.tsx`
- UI component for language switching
- Accessible design with ARIA labels
- Security: Only whitelisted options rendered

### Security Mitigations

| Threat | Mitigation |
|--------|------------|
| XSS via lang attribute injection | Strict whitelist validation - only known-safe values can appear in HTML |
| Cookie poisoning | Cookie values validated before use, never trusted directly |
| Header injection | All header values treated as untrusted input and validated |
| DoS via regex | Length limits on all inputs, simple regex patterns |
| Cache poisoning | `Vary: Accept-Language` header for proper caching |

### Usage Examples

#### Server-Side (in _document.tsx)
```typescript
// Secure language detection from request
const locale = detectLanguageFromRequest(ctx.req);

// Always produces a safe, whitelisted value
<Html lang={locale} dir={dir}>
```

#### Client-Side (in components)
```typescript
// Hook for language management
const { locale, setLocale } = useLocale();

// Component with security validation
<LanguageSelector />
```

### Testing

Comprehensive security tests in `__tests__/i18n/language-utils.test.ts` cover:
- XSS injection attempts
- SQL injection attempts  
- Malformed input handling
- Length limit enforcement
- Type validation
- Edge case handling

### Configuration

Updated `next.config.mjs` with:
- Extended supported locales list
- Proper cache headers (`Vary: Accept-Language`)
- Locale detection disabled (we handle it securely)

## Before vs After

### Before (Security Issue)
```typescript
// Hard-coded, not accessible, security risk
<html lang="en">
```

### After (Secure & Dynamic)
```typescript
// Dynamic, validated, secure, accessible
<Html lang={validatedLocale} dir={textDirection}>
  <Head>
    <meta httpEquiv="Content-Language" content={validatedLocale} />
  </Head>
```

## Compliance

This fix addresses:
- **CWE-16**: Configuration - Dynamic configuration based on user preferences
- **OWASP A05:2021**: Security Misconfiguration - Proper internationalization setup
- **WCAG 2.1 SC 3.1.1**: Language of Page - Correct lang attribute for accessibility