import React from 'react';
import {usePluginData} from '@docusaurus/useGlobalData';

const REPO_URL = 'https://github.com/llm-d/llm-d/tree';

export default function VersionDropdown(): React.JSX.Element {
  const {releases} = usePluginData('llmd-versions-plugin') as {
    releases: string[];
  };

  return (
    <div className="navbar__item dropdown dropdown--hoverable">
      <a className="navbar__link" href="#" onClick={(e) => e.preventDefault()}>
        latest ▾
      </a>
      <ul className="dropdown__menu">
        <li>
          <a className="dropdown__link dropdown__link--active" href="/preview/docs/getting-started">
            latest (main)
          </a>
        </li>
        {releases && releases.length > 0 && (
          <>
            <li className="dropdown-separator" style={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
              margin: '0.25rem 0',
            }} />
            {releases.map((tag) => (
              <li key={tag}>
                <a
                  className="dropdown__link"
                  href={`${REPO_URL}/${tag}/docs/wip-docs-new`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tag}
                </a>
              </li>
            ))}
          </>
        )}
      </ul>
    </div>
  );
}
