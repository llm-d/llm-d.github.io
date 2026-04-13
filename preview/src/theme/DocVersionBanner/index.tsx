import React from 'react';
import Link from '@docusaurus/Link';
import {
  useActivePlugin,
  useActiveVersion,
  useDocVersionSuggestions,
} from '@docusaurus/plugin-content-docs/client';

export default function DocVersionBanner(): React.JSX.Element | null {
  const plugin = useActivePlugin();
  const activeVersion = useActiveVersion(plugin?.pluginId);
  const versionSuggestion = useDocVersionSuggestions(plugin?.pluginId);

  if (!activeVersion || !versionSuggestion) {
    return null;
  }

  const latestStable = versionSuggestion.latestVersionSuggestion;
  const isDevVersion = activeVersion.name === 'current';
  const isLatestStable = activeVersion.name === latestStable.name;

  // On the latest stable version — no banner needed
  if (isLatestStable && !isDevVersion) {
    return null;
  }

  // On dev version, but dev IS the latest (no stable versions yet) — no in-page banner
  // (the announcement bar already handles this case)
  if (isDevVersion && latestStable.name === 'current') {
    return null;
  }

  // On dev version and a stable version exists
  if (isDevVersion) {
    return (
      <div
        className="theme-doc-version-banner alert alert--warning margin-bottom--md"
        role="alert"
      >
        You are viewing the <strong>latest developer preview</strong> docs (main).{' '}
        <Link to={latestStable.path}>
          Click here to view docs for the latest stable release ({latestStable.label}).
        </Link>
      </div>
    );
  }

  // On an older stable version
  return (
    <div
      className="theme-doc-version-banner alert alert--warning margin-bottom--md"
      role="alert"
    >
      You are viewing docs for <strong>{activeVersion.label}</strong>, which is no longer
      the latest version.{' '}
      <Link to={latestStable.path}>
        View the latest stable release ({latestStable.label}).
      </Link>
    </div>
  );
}
