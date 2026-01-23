import Document, {
  Html,
  Head,
  Main,
  NextScript,
  type DocumentContext,
  type DocumentInitialProps,
} from 'next/document';
import { 
  detectLanguageFromRequest 
} from '@/lib/i18n/detect-language';
import { 
  DEFAULT_LOCALE, 
  type SupportedLocale 
} from '@/lib/i18n/language-utils';

/**
 * Extended document props to include validated locale
 */
interface CustomDocumentProps extends DocumentInitialProps {
  locale: SupportedLocale;
}

/**
 * Custom Document for dynamic HTML lang attribute.
 * 
 * Security considerations:
 * 1. Locale is validated server-side before use
 * 2. Only whitelisted values can appear in HTML
 * 3. No client-side injection possible for initial render
 * 4. Content-Language header for consistency
 */
class CustomDocument extends Document<CustomDocumentProps> {
  static async getInitialProps(ctx: DocumentContext): Promise<CustomDocumentProps> {
    const initialProps = await Document.getInitialProps(ctx);
    
    let locale: SupportedLocale = DEFAULT_LOCALE;

    // Detect language from request (server-side only)
    if (ctx.req) {
      locale = detectLanguageFromRequest(ctx.req);
    }

    // Also check Next.js locale from router (if i18n routing enabled)
    if (ctx.locale) {
      const { validateLocale } = await import('@/lib/i18n/language-utils');
      locale = validateLocale(ctx.locale);
    }

    return {
      ...initialProps,
      locale,
    };
  }

  render() {
    const { locale } = this.props;
    
    // Determine text direction for RTL languages
    const dir = ['ar', 'he', 'fa', 'ur'].includes(locale) ? 'rtl' : 'ltr';

    return (
      <Html lang={locale} dir={dir}>
        <Head>
          {/* 
            Content-Language header equivalent for meta.
            Note: This should also be set as an HTTP header in next.config.js
          */}
          <meta httpEquiv="Content-Language" content={locale} />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default CustomDocument;