// Client module for global Matomo analytics
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

let isInitialized = false;
let lastAnchorVirtual = { url: null, time: 0 };

function getBaseTitle() {
  const currentTitle = document.title || '';
  // Strip a single trailing " - section" suffix if present
  return currentTitle.replace(/\s-\s[^-]+$/, '');
}

function resolveMatomoSiteId(hostname) {
  if (!hostname) return null;
  const host = hostname.toLowerCase();
  const isPreview = host === 'localhost' || host.includes('netlify.app') || host.includes('netlify.com');
  const isProd = host === 'llm-d.ai' || host.endsWith('.llm-d.ai');
  if (isPreview) return '6';
  if (isProd) return '7';
  return null; // unknown host -> do not track
}

function ensureMatomoInitialized() {
  if (isInitialized) return;
  const siteId = resolveMatomoSiteId(window.location.hostname);
  if (!siteId) {
    // Not a recognized host; keep analytics disabled
    return;
  }

  window._paq = window._paq || [];
  window._paq.push(['disableCookies']);
  window._paq.push(['alwaysUseSendBeacon', true]);
  window._paq.push(['enableLinkTracking']);

  const baseUrl = '//analytics.ossupstream.org/';
  window._paq.push(['setTrackerUrl', baseUrl + 'matomo.php']);
  window._paq.push(['setSiteId', siteId]);

  const d = document;
  const g = d.createElement('script');
  const s = d.getElementsByTagName('script')[0];
  g.async = true;
  g.src = baseUrl + 'matomo.js';
  if (s && s.parentNode) {
    s.parentNode.insertBefore(g, s);
  } else if (d.head) {
    d.head.appendChild(g);
  } else if (d.body) {
    d.body.appendChild(g);
  }

  isInitialized = true;
}

function trackAnchorClicks() {
  if (typeof document === 'undefined') return;
  
  // Remove existing listeners to avoid duplicates
  const links = document.querySelectorAll('a[href*="#"]');
  links.forEach(link => {
    link.removeEventListener('click', handleAnchorClick);
    link.addEventListener('click', handleAnchorClick);
  });
}

function handleAnchorClick(event) {
  if (!window._paq || !isInitialized) return;
  
  const href = event.currentTarget.href;
  const linkUrl = new URL(href, window.location.origin);
  const isSamePage = linkUrl.pathname === window.location.pathname && !!linkUrl.hash;

  // Only track same-page anchor clicks (route changes handle cross-page navigation)
  if (isSamePage) {
    const anchor = linkUrl.hash;
    const virtualUrl = `${linkUrl.pathname}${anchor}`;
    const baseTitle = getBaseTitle();
    const enhancedTitle = `${baseTitle} - ${anchor.replace('#', '')}`;

    window._paq.push(['setCustomUrl', virtualUrl]);
    window._paq.push(['setDocumentTitle', enhancedTitle]);
    window._paq.push(['trackPageView']);

    // Remember this virtual pageview so the upcoming route update (hash change)
    // does not double-count the same navigation.
    lastAnchorVirtual = { url: virtualUrl, time: Date.now() };
  }
}

export function onRouteDidUpdate({location, previousLocation}) {
  if (!ExecutionEnvironment.canUseDOM) return;
  ensureMatomoInitialized();
  if (!window._paq || !isInitialized) return;

  // Track SPA navigations (handles cross-page navigation with anchors)
  if (previousLocation) {
    const referrer = `${previousLocation.pathname}${previousLocation.search || ''}${previousLocation.hash || ''}`;
    window._paq.push(['setReferrerUrl', referrer]);
  }
  
  // Track page with hash - enhanced title only if hash present
  const fullUrl = `${location.pathname}${location.search || ''}${location.hash || ''}`;

  // If this is a same-page hash navigation that immediately follows our
  // anchor click handler, avoid double-counting by skipping this route-update track.
  const isSamePageHashNav = Boolean(
    previousLocation &&
    previousLocation.pathname === location.pathname &&
    location.hash &&
    previousLocation.hash !== location.hash
  );
  if (isSamePageHashNav) {
    const recentlyTrackedSame =
      lastAnchorVirtual.url === fullUrl && (Date.now() - lastAnchorVirtual.time) < 1500;
    if (recentlyTrackedSame) {
      // Re-attach anchor click listeners after route change and exit early
      setTimeout(trackAnchorClicks, 100);
      return;
    }
  }
  const baseTitle = getBaseTitle();
  const pageTitle = location.hash 
    ? `${baseTitle} - ${location.hash.replace('#', '')}` 
    : baseTitle;
    
  window._paq.push(['setCustomUrl', fullUrl]);
  window._paq.push(['setDocumentTitle', pageTitle]);
  window._paq.push(['trackPageView']);
  
  // Re-attach anchor click listeners after route change
  setTimeout(trackAnchorClicks, 100);
}

// Initialize analytics and anchor tracking on page load
if (ExecutionEnvironment.canUseDOM) {
  const init = () => {
    ensureMatomoInitialized();
    trackAnchorClicks();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}