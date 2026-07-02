import React from 'react';
import {usePluginData} from '@docusaurus/useGlobalData';
import {useLocation} from '@docusaurus/router';

const REPO_URL = 'https://github.com/llm-d/llm-d/tree';
const MIN_WEBSITE_VERSION = '0.7.0';
const DEV_VERSION = 'dev';

function isVersionGTE(version, target) {
  const parseVersion = (v) => {
    const stripped = v.replace(/^v/, '');
    return stripped.split('.').map((n) => parseInt(n, 10));
  };

  const [v1, v2] = [parseVersion(version), parseVersion(target)];

  for (let i = 0; i < 3; i++) {
    if ((v1[i] || 0) > (v2[i] || 0)) return true;
    if ((v1[i] || 0) < (v2[i] || 0)) return false;
  }
  return true;
}

export default function VersionDropdown() {
  const pluginData = usePluginData('llmd-versions-plugin');

  const location = useLocation();
  const [releases, setReleases] = React.useState(pluginData?.releases || []);

  const getFullPath = () =>
    typeof window !== 'undefined' ? window.location.pathname : location.pathname;

  React.useEffect(() => {
    if (!pluginData?.releases || pluginData.releases.length === 0) {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      fetch(`${base}/docs/releases.json`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.every((v) => typeof v === 'string')) {
            setReleases(data);
          } else {
            console.warn('[VersionDropdown] Invalid releases.json format, expected array of strings');
          }
        })
        .catch((err) => console.warn('[VersionDropdown] Failed to load releases.json:', err));
    }
  }, [pluginData]);

  const latestTag = releases?.[0];
  const latestVersion = latestTag?.replace(/^v/, '');
  const olderReleases = (releases?.slice(1) || []).filter((tag) =>
    isVersionGTE(tag.replace(/^v/, ''), MIN_WEBSITE_VERSION),
  );

  const getCurrentVersion = () => {
    const path = getFullPath();

    if (/^\/docs\/dev(\/|$)/.test(path)) return DEV_VERSION;

    let match = path.match(/^\/docs\/(\d+\.\d+(?:\.\d+)?)\//);
    if (match) return match[1];

    if (/^\/dev(\/|$)/.test(path)) return DEV_VERSION;
    match = path.match(/^\/(\d+\.\d+(?:\.\d+)?)\//);
    if (match) return match[1];

    return latestVersion || null;
  };

  const currentVersion = getCurrentVersion();

  const getVersionUrl = (tag) => {
    const version = tag.replace(/^v/, '');

    if (latestTag && tag === latestTag) {
      return '/docs/getting-started';
    }
    if (isVersionGTE(version, MIN_WEBSITE_VERSION)) {
      return `/docs/${version}/getting-started`;
    }
    return `${REPO_URL}/${tag}/docs`;
  };

  const getDevUrl = () =>
    latestTag ? '/docs/dev/getting-started' : '/docs/getting-started';

  const isExternalLink = (tag) => {
    const version = tag.replace(/^v/, '');
    return !isVersionGTE(version, MIN_WEBSITE_VERSION);
  };

  const getDropdownLabel = () => {
    if (currentVersion === DEV_VERSION) return 'dev';
    if (!currentVersion) return latestTag ? `${latestTag} (latest)` : 'dev';

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
      <a
        className="navbar__link"
        href="#"
        aria-haspopup="true"
        aria-label="Documentation version"
        onClick={(e) => e.preventDefault()}>
        {getDropdownLabel()}
      </a>
      <ul className="dropdown__menu">
        <li>
          <a
            className={`dropdown__link ${isDevActive ? 'dropdown__link--active' : ''}`}
            href={getDevUrl()}>
            dev
          </a>
        </li>
        {latestTag && (
          <>
            <li
              className="dropdown-separator"
              style={{
                borderTop: '1px solid rgba(255,255,255,0.1)',
                margin: '0.25rem 0',
              }}
            />
            <li>
              <a
                className={`dropdown__link ${isLatestActive ? 'dropdown__link--active' : ''}`}
                href={getVersionUrl(latestTag)}
                {...(isExternalLink(latestTag) && {
                  target: '_blank',
                  rel: 'noopener noreferrer',
                })}>
                latest ({latestTag}){isExternalLink(latestTag) ? ' →' : ''}
              </a>
            </li>
          </>
        )}
        {olderReleases.length > 0 &&
          olderReleases.map((tag) => (
            <li key={tag}>
              <a
                className={`dropdown__link ${currentVersion && currentVersion !== DEV_VERSION && `v${currentVersion}` === tag ? 'dropdown__link--active' : ''}`}
                href={getVersionUrl(tag)}
                {...(isExternalLink(tag) && {
                  target: '_blank',
                  rel: 'noopener noreferrer',
                })}>
                {tag}
                {isExternalLink(tag) ? ' →' : ''}
              </a>
            </li>
          ))}
      </ul>
    </div>
  );
}
