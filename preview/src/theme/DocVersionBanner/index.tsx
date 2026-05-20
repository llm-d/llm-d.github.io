import React from 'react';

// Matches a versioned URL like /docs/0.7.0/... or /docs/1.2.3/...
const VERSION_PATH_RE = /^\/docs\/\d+\.\d+(?:\.\d+)?\//;

export default function DocVersionBanner(): React.JSX.Element | null {
  // This site deploys each version as a separate Docusaurus build rather than
  // using Docusaurus's built-in multi-version feature, so the plugin version
  // hooks always report "current". We detect the version from the URL instead.
  const isVersionedPage =
    typeof window !== 'undefined' && VERSION_PATH_RE.test(window.location.pathname);

  // On a numbered-version page (e.g. /docs/0.7.0/...) — no banner needed.
  if (isVersionedPage) {
    return null;
  }

  // On the dev (main) build — remind readers this is a preview.
  return (
    <div
      className="theme-doc-version-banner alert alert--warning margin-bottom--md"
      role="alert"
    >
      You are viewing the <strong>latest developer preview</strong> docs. For stable release
      docs, use the version picker.
    </div>
  );
}
