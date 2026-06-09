/**
 * Search indexes canonical latest-stable paths (/docs/...).
 * Rewrite to match the docs version the user is currently browsing.
 */
export function resolveSearchResultUrl(url) {
  if (typeof window === 'undefined' || !url.startsWith('/docs')) {
    return url;
  }

  const {pathname} = window.location;
  let prefix = '/docs';

  if (/^\/docs\/dev(\/|$)/.test(pathname)) {
    prefix = '/docs/dev';
  } else {
    const versionMatch = pathname.match(/^\/docs\/(\d+\.\d+(?:\.\d+)?)(\/|$)/);
    if (versionMatch) {
      prefix = `/docs/${versionMatch[1]}`;
    }
  }

  if (prefix === '/docs') {
    return url;
  }

  const rest = url.slice('/docs'.length);
  return `${prefix}${rest}`;
}

/**
 * Navigate to a search result. Docs subsites are separate SPAs per version,
 * so always use full page loads for /docs URLs instead of client-side routing.
 */
export function navigateToSearchResult(url) {
  window.location.assign(resolveSearchResultUrl(url));
}
