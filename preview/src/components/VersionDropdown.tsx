import React from 'react';
import {usePluginData} from '@docusaurus/useGlobalData';
import {useLocation} from '@docusaurus/router';

const REPO_URL = 'https://github.com/llm-d/llm-d/tree';
const MIN_WEBSITE_VERSION = '0.7.0';

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

  // Fallback: if plugin data is missing, fetch releases.json directly.
  // Always fetch from the root /docs/ build since both dev and versioned builds
  // contain the same releases.json with the full list.
  React.useEffect(() => {
    if (!pluginData?.releases || pluginData.releases.length === 0) {
      const base =
        typeof window !== 'undefined' ? window.location.origin : '';
      fetch(`${base}/docs/releases.json`)
        .then(res => res.json())
        .then(data => {
          // Validate that data is an array of strings
          if (Array.isArray(data) && data.every(v => typeof v === 'string')) {
            setReleases(data);
          } else {
            console.warn('[VersionDropdown] Invalid releases.json format, expected array of strings');
          }
        })
        .catch(err => console.warn('[VersionDropdown] Failed to load releases.json:', err));
    }
  }, [pluginData]);

  // Latest stable version (first in releases list)
  const latestTag = releases?.[0];
  const olderReleases = releases?.slice(1) || [];

  // Detect current version from the actual browser URL (window.location.pathname).
  // useLocation() returns a path relative to Docusaurus's baseUrl, which strips
  // the '/docs/' prefix, making it unreliable for detecting which versioned build
  // we're in. window.location.pathname always reflects the full URL as shown in
  // the browser, so '/docs/0.7.0/getting-started' → "0.7.0".
  const getCurrentVersion = (): string | null => {
    const path =
      typeof window !== 'undefined' ? window.location.pathname : location.pathname;

    // Full URL: /docs/0.7.0/...
    let match = path.match(/^\/docs\/(\d+\.\d+(?:\.\d+)?)\//);
    if (match) return match[1];

    // Relative path after baseUrl strip: /0.7.0/...
    match = path.match(/^\/(\d+\.\d+(?:\.\d+)?)\//);
    return match ? match[1] : null;
  };

  const currentVersion = getCurrentVersion();

  // Extract current page path to preserve when switching versions
  // e.g., /docs/architecture/core/proxy -> architecture/core/proxy
  // e.g., /docs/0.7.0/architecture -> architecture (strip version)
  // Uses window.location.pathname for the same reason as getCurrentVersion():
  // useLocation() is baseUrl-relative and won't contain the /docs/ prefix when
  // the versioned build has baseUrl='/docs/0.7.0/', causing version-switch links
  // to always fall back to 'getting-started' instead of the current page.
  const getCurrentPagePath = () => {
    const path =
      typeof window !== 'undefined' ? window.location.pathname : location.pathname;
    const match = path.match(/^\/docs\/(.+)$/);
    if (!match) return 'getting-started';

    let pagePath = match[1];

    // Strip version number if present (e.g., "0.7.0/architecture" -> "architecture")
    // Version pattern: starts with digit(s).digit(s) optionally followed by .digit(s)
    const versionMatch = pagePath.match(/^(\d+\.\d+(?:\.\d+)?)\/(.*)/);
    if (versionMatch) {
      pagePath = versionMatch[2];
    }

    return pagePath || 'getting-started';
  };

  // Generate URL for a version
  const getVersionUrl = (tag: string) => {
    const version = tag.replace(/^v/, '');
    const pagePath = getCurrentPagePath();

    if (isVersionGTE(version, MIN_WEBSITE_VERSION)) {
      // Version 0.7.0+ hosted on website
      return `/docs/${version}/${pagePath}`;
    } else {
      // Pre-0.7.0 versions link to GitHub
      return `${REPO_URL}/${tag}/docs`;
    }
  };

  // Check if link should open in new tab (GitHub links only)
  const isExternalLink = (tag: string) => {
    const version = tag.replace(/^v/, '');
    return !isVersionGTE(version, MIN_WEBSITE_VERSION);
  };

  // Get display label for dropdown button
  const getDropdownLabel = () => {
    if (!currentVersion) return 'dev ▾';

    const vTag = `v${currentVersion}`;
    if (vTag === latestTag) return `${vTag} (latest) ▾`;
    return `${vTag} ▾`;
  };

  return (
    <div className="navbar__item dropdown dropdown--hoverable">
      <a className="navbar__link" href="#" onClick={(e) => e.preventDefault()}>
        {getDropdownLabel()}
      </a>
      <ul className="dropdown__menu">
        <li>
          <a
            className={`dropdown__link ${!currentVersion ? 'dropdown__link--active' : ''}`}
            href={`/docs/${getCurrentPagePath()}`}
          >
            dev (main)
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
                className={`dropdown__link ${currentVersion && `v${currentVersion}` === latestTag ? 'dropdown__link--active' : ''}`}
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
                  className={`dropdown__link ${currentVersion && `v${currentVersion}` === tag ? 'dropdown__link--active' : ''}`}
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
