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
  const {releases} = usePluginData('llmd-versions-plugin') as {
    releases: string[];
  };
  const location = useLocation();

  // Latest stable version (first in releases list)
  const latestTag = releases?.[0];
  const olderReleases = releases?.slice(1) || [];

  // Extract current page path to preserve when switching versions
  // e.g., /docs/architecture/core/proxy -> architecture/core/proxy
  // e.g., /docs/0.7.0/architecture -> architecture (strip version)
  const getCurrentPagePath = () => {
    const path = location.pathname;
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

  return (
    <div className="navbar__item dropdown dropdown--hoverable">
      <a className="navbar__link" href="#" onClick={(e) => e.preventDefault()}>
        dev ▾
      </a>
      <ul className="dropdown__menu">
        <li>
          <a className="dropdown__link dropdown__link--active" href="/docs/">
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
                className="dropdown__link"
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
                  className="dropdown__link"
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
