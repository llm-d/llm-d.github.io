/**
 * Search indexes canonical latest-stable paths (/docs/...).
 * Rewrite when the user is browsing a versioned docs subsite.
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

export function navigateToSearchResult(url) {
  window.location.assign(resolveSearchResultUrl(url));
}
