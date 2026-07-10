import React from 'react';
import {usePluginData} from '@docusaurus/useGlobalData';
import {useLocation} from '@docusaurus/router';

const REPO_URL = 'https://github.com/llm-d/llm-d/tree';
const MIN_WEBSITE_VERSION = '0.7.0';
const DEV_VERSION = 'dev';

// Compare semver versions (simple implementation for x.y.z format)
function isVersionGTE(version: string, target: string): boolean {
  const parseVersion = (v: string) => {
    const stripped = v.replace(/^v/, '');
    return stripped.split('.').map(n => parseInt(n, 10));
  };

  const [v1, v2] = [parseVersion(version), parseVersion(target)];

  for (let i = 0; i < 3; i++) {
    if ((v1[i] || 0) > (v2[i] || 0)) return true;
    if ((v1[i] || 0) < (v2[i] || 0)) return false;
  }
  return true; // Equal
}

export default function VersionDropdown(): React.JSX.Element {
  const pluginData = usePluginData('llmd-versions-plugin') as {
    releases?: string[];
  } | undefined;

  const location = useLocation();
  const [releases, setReleases] = React.useState<string[]>(pluginData?.releases || []);

  // Use the browser URL when hydrated; during SSR useLocation() already
  // returns the absolute pathname Docusaurus rendered the page at (e.g.
  // "/docs/dev/architecture"), so no reconstruction is needed.
  const getFullPath = (): string =>
    typeof window !== 'undefined' ? window.location.pathname : location.pathname;

  // Fallback: if plugin data is missing, fetch releases.json directly.
  // Always fetch from the root /docs/ build since every versioned build
  // ships the same releases.json with the full list.
  React.useEffect(() => {
    if (!pluginData?.releases || pluginData.releases.length === 0) {
      const base =
        typeof window !== 'undefined' ? window.location.origin : '';
      fetch(`${base}/docs/releases.json`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.every(v => typeof v === 'string')) {
            setReleases(data);
          } else {
            console.warn('[VersionDropdown] Invalid releases.json format, expected array of strings');
          }
        })
        .catch(err => console.warn('[VersionDropdown] Failed to load releases.json:', err));
    }
  }, [pluginData]);

  const latestTag = releases?.[0];
  const latestVersion = latestTag?.replace(/^v/, '');
  // Only show versions that are hosted on the website (>= MIN_WEBSITE_VERSION).
  // Pre-0.7.0 docs live in GitHub and would otherwise render as external
  // GitHub links in the dropdown, which is noisy and inconsistent with the
  // rest of the navigation. When a future release ships, the previous one
  // will naturally drop into this list as the new latest takes the top slot.
  const olderReleases = (releases?.slice(1) || []).filter((tag) =>
    isVersionGTE(tag.replace(/^v/, ''), MIN_WEBSITE_VERSION),
  );

  // Detect current version from the actual browser URL (window.location.pathname).
  // useLocation() returns a path relative to Docusaurus's baseUrl, which strips
  // the '/docs/' prefix, making it unreliable for detecting which versioned build
  // we're in. window.location.pathname always reflects the full URL as shown in
  // the browser, so '/docs/0.7.0/getting-started' → "0.7.0".
  //
  // Returns 'dev' for /docs/dev/*, the version string for /docs/X.Y.Z/*, or
  // the latest version string for any other /docs/* (the canonical URL serves
  // the latest stable release).
  const getCurrentVersion = (): string | null => {
    const path = getFullPath();

    if (/^\/docs\/dev(\/|$)/.test(path)) return DEV_VERSION;

    let match = path.match(/^\/docs\/(\d+\.\d+(?:\.\d+)?)\//);
    if (match) return match[1];

    // Relative path after baseUrl strip
    if (/^\/dev(\/|$)/.test(path)) return DEV_VERSION;
    match = path.match(/^\/(\d+\.\d+(?:\.\d+)?)\//);
    if (match) return match[1];

    // Bare /docs/... → canonical URL → latest stable
    return latestVersion || null;
  };

  const currentVersion = getCurrentVersion();

  // Generate URL for a version. Lands on each version's getting-started
  // page rather than the docs landing — that's the actual entry point for
  // readers, and consistent with the navbar Documentation link. We don't
  // preserve the current page path because dev and older releases have
  // different page sets, so a path-preserving link would 404 whenever
  // the current page doesn't exist in the target version.
  const getVersionUrl = (tag: string) => {
    const version = tag.replace(/^v/, '');

    if (latestTag && tag === latestTag) {
      return '/docs/getting-started';
    }
    if (isVersionGTE(version, MIN_WEBSITE_VERSION)) {
      return `/docs/${version}/getting-started`;
    }
    return `${REPO_URL}/${tag}/docs`;
  };

  // Dev docs live under /docs/dev/ once a stable release exists; before the
  // first release they remain at /docs/ (matches build-all.sh fallback).
  const getDevUrl = () =>
    latestTag ? '/docs/dev/getting-started' : '/docs/getting-started';

  const isExternalLink = (tag: string) => {
    const version = tag.replace(/^v/, '');
    return !isVersionGTE(version, MIN_WEBSITE_VERSION);
  };

  const getDropdownLabel = () => {
    if (currentVersion === DEV_VERSION || !currentVersion) return 'dev';

    const vTag = `v${currentVersion}`;
    if (vTag === latestTag) return `${vTag} (latest)`;
    return vTag;
  };

  const isDevActive = currentVersion === DEV_VERSION;
  const isLatestActive =
    !!latestTag &&
    !!currentVersion &&
    currentVersion !== DEV_VERSION &&
    `v${currentVersion}` === latestTag;

  return (
    <div className="navbar__item dropdown dropdown--hoverable">
      <a className="navbar__link" href="#" onClick={(e) => e.preventDefault()}>
        {getDropdownLabel()}
      </a>
      <ul className="dropdown__menu">
        <li>
          <a
            className={`dropdown__link ${isDevActive ? 'dropdown__link--active' : ''}`}
            href={getDevUrl()}
          >
            dev
          </a>
        </li>
        {latestTag && (
          <>
            <li className="dropdown-separator" style={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
              margin: '0.25rem 0',
            }} />
            <li>
              <a
                className={`dropdown__link ${isLatestActive ? 'dropdown__link--active' : ''}`}
                href={getVersionUrl(latestTag)}
                {...(isExternalLink(latestTag) && {
                  target: '_blank',
                  rel: 'noopener noreferrer',
                })}
              >
                latest ({latestTag}){isExternalLink(latestTag) ? ' →' : ''}
              </a>
            </li>
          </>
        )}
        {olderReleases.length > 0 && (
          <>
            {olderReleases.map((tag) => (
              <li key={tag}>
                <a
                  className={`dropdown__link ${currentVersion && currentVersion !== DEV_VERSION && `v${currentVersion}` === tag ? 'dropdown__link--active' : ''}`}
                  href={getVersionUrl(tag)}
                  {...(isExternalLink(tag) && {
                    target: '_blank',
                    rel: 'noopener noreferrer',
                  })}
                >
                  {tag}{isExternalLink(tag) ? ' →' : ''}
                </a>
              </li>
            ))}
          </>
        )}
      </ul>
    </div>
  );
}
