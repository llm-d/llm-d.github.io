import React from 'react';
import {usePluginData} from '@docusaurus/useGlobalData';

const REPO_URL = 'https://github.com/llm-d/llm-d/tree';

export default function VersionDropdown(): React.JSX.Element {
  const {releases} = usePluginData('llmd-versions-plugin') as {
    releases: string[];
  };

  // Latest stable version (first in releases list)
  const latestTag = releases?.[0];
  const olderReleases = releases?.slice(1) || [];

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
                href={`${REPO_URL}/${latestTag}/docs`}
                target="_blank"
                rel="noopener noreferrer"
              >
                latest ({latestTag}) →
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
                  href={`${REPO_URL}/${tag}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tag} →
                </a>
              </li>
            ))}
          </>
        )}
      </ul>
    </div>
  );
}
