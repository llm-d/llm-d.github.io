/**
 * @jest-environment jsdom
 */

// Ensure timers are controlled
jest.useFakeTimers();

function resetDomState() {
  document.body.innerHTML = '';
  Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
  window._paq = [];
  // Mock location to a docs page path; avoid jsdom navigation by redefining location
  const loc = new URL('http://localhost/docs/guide');
  // @ts-ignore
  delete window.location;
  // @ts-ignore
  window.location = {
    href: loc.href,
    origin: loc.origin,
    protocol: loc.protocol,
    host: loc.host,
    hostname: loc.hostname,
    port: loc.port,
    pathname: loc.pathname,
    search: loc.search,
    hash: loc.hash,
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
  };
}

async function importFreshAnalytics() {
  jest.resetModules();
  return import('../src/clientModules/analytics.js');
}

describe('analytics client module', () => {
  beforeEach(() => {
    resetDomState();
  });

  test('cross-page navigation without hash', async () => {
    const mod = await importFreshAnalytics();
    document.title = 'Docs';

    const previousLocation = { pathname: '/docs/guide', search: '', hash: '' };
    const location = { pathname: '/docs/install', search: '', hash: '' };
    mod.onRouteDidUpdate({ location, previousLocation });

    expect(window._paq).toEqual(
      expect.arrayContaining([
        ['setReferrerUrl', '/docs/guide'],
        ['setCustomUrl', '/docs/install'],
        ['setDocumentTitle', 'Docs'],
        ['trackPageView'],
      ]),
    );
  });

  test('hash navigation (direct load) enhances title', async () => {
    const mod = await importFreshAnalytics();
    document.title = 'Docs';

    const previousLocation = null;
    const location = { pathname: '/docs/guide', search: '', hash: '#install' };
    mod.onRouteDidUpdate({ location, previousLocation });

    expect(window._paq).toEqual(
      expect.arrayContaining([
        ['setCustomUrl', '/docs/guide#install'],
        ['setDocumentTitle', 'Docs - install'],
        ['trackPageView'],
      ]),
    );
  });

  test('same-page anchor click creates a virtual pageview', async () => {
    await importFreshAnalytics();
    document.title = 'Docs Page';

    const link = document.createElement('a');
    link.href = '/docs/guide#examples';
    document.body.appendChild(link);

    // Allow any delayed listener attachment
    jest.runOnlyPendingTimers();

    link.click();

    expect(window._paq).toEqual(
      expect.arrayContaining([
        ['setCustomUrl', '/docs/guide#examples'],
        ['setDocumentTitle', 'Docs Page - examples'],
        ['trackPageView'],
      ]),
    );
  });

  test('different-page anchor click is ignored by same-page handler', async () => {
    await importFreshAnalytics();

    const link = document.createElement('a');
    link.href = '/docs/other#section';
    document.body.appendChild(link);

    jest.runOnlyPendingTimers();
    link.click();

    const match = window._paq.find(it => it[0] === 'setCustomUrl' && it[1] === '/docs/other#section');
    expect(match).toBeUndefined();
  });

  test('title does not compound on multiple hash navigations', async () => {
    const mod = await importFreshAnalytics();
    document.title = 'Docs Page - first';

    const link = document.createElement('a');
    link.href = '/docs/guide#second';
    document.body.appendChild(link);

    // Trigger a route update to schedule delayed listener binding for late anchors
    mod.onRouteDidUpdate({ location: { pathname: '/docs/guide', search: '', hash: '' }, previousLocation: null });
    jest.runOnlyPendingTimers();
    link.click();
    // Flush any microtasks and delayed bindings
    await Promise.resolve();
    jest.runOnlyPendingTimers();

    expect(window._paq).toEqual(
      expect.arrayContaining([
        ['setDocumentTitle', 'Docs Page - second'],
      ]),
    );
  });

  test('late-rendered anchor receives listener after route update', async () => {
    const mod = await importFreshAnalytics();
    document.title = 'Docs';

    mod.onRouteDidUpdate({ location: { pathname: '/docs/guide', search: '', hash: '' }, previousLocation: null });

    const late = document.createElement('a');
    late.href = '/docs/guide#late';
    document.body.appendChild(late);

    // Simulate delayed listener registration
    jest.runOnlyPendingTimers();
    late.click();

    expect(window._paq).toEqual(
      expect.arrayContaining([
        ['setCustomUrl', '/docs/guide#late'],
        ['setDocumentTitle', 'Docs - late'],
        ['trackPageView'],
      ]),
    );
  });

  test('hash-only URLs are handled correctly', async () => {
    const mod = await importFreshAnalytics();
    document.title = 'Docs Page';

    const link = document.createElement('a');
    link.href = 'http://localhost/docs/guide#section'; // Use full URL to ensure proper resolution
    document.body.appendChild(link);

    mod.onRouteDidUpdate({ location: { pathname: '/docs/guide', search: '', hash: '' }, previousLocation: null });
    jest.runOnlyPendingTimers();
    
    // Clear initial tracking calls
    window._paq.length = 0;
    
    link.click();

    expect(window._paq).toEqual(
      expect.arrayContaining([
        ['setCustomUrl', '/docs/guide#section'],
        ['setDocumentTitle', 'Docs Page - section'],
        ['trackPageView'],
      ]),
    );
  });

  test('rapid sequential clicks are not double-counted', async () => {
    const mod = await importFreshAnalytics();
    document.title = 'Docs';

    const link1 = document.createElement('a');
    link1.href = '/docs/guide#first';
    const link2 = document.createElement('a');
    link2.href = '/docs/guide#second';
    document.body.appendChild(link1);
    document.body.appendChild(link2);

    mod.onRouteDidUpdate({ location: { pathname: '/docs/guide', search: '', hash: '' }, previousLocation: null });
    jest.runOnlyPendingTimers();
    
    // Rapid clicks
    link1.click();
    link2.click();

    const firstClicks = window._paq.filter(call => call[1] === '/docs/guide#first');
    const secondClicks = window._paq.filter(call => call[1] === '/docs/guide#second');
    
    expect(firstClicks.length).toBe(1);
    expect(secondClicks.length).toBe(1);
  });

  test('malformed URLs are handled gracefully', async () => {
    const mod = await importFreshAnalytics();
    document.title = 'Docs';

    const link = document.createElement('a');
    // Set invalid href directly to bypass browser URL validation
    Object.defineProperty(link, 'href', { value: 'javascript:alert("invalid")', configurable: true });
    document.body.appendChild(link);

    mod.onRouteDidUpdate({ location: { pathname: '/docs/guide', search: '', hash: '' }, previousLocation: null });
    jest.runOnlyPendingTimers();
    
    // Should not throw error
    expect(() => link.click()).not.toThrow();
    
    // Should not create tracking calls for malformed URLs
    const malformedCalls = window._paq.filter(call => 
      call[1] && typeof call[1] === 'string' && call[1].includes('javascript:')
    );
    expect(malformedCalls.length).toBe(0);
  });

  test('analytics failures are handled gracefully', async () => {
    const mod = await importFreshAnalytics();
    document.title = 'Docs';
    
    // Simulate analytics not being initialized
    window._paq = undefined;

    const link = document.createElement('a');
    link.href = '/docs/guide#test';
    document.body.appendChild(link);

    jest.runOnlyPendingTimers();
    
    // Should not throw error when analytics is unavailable
    expect(() => link.click()).not.toThrow();
    
    // Should not crash route updates either
    expect(() => {
      mod.onRouteDidUpdate({ location: { pathname: '/docs/guide', search: '', hash: '' }, previousLocation: null });
    }).not.toThrow();
  });
});


