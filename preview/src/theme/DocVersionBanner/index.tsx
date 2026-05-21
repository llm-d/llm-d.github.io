import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function DocVersionBanner(): React.JSX.Element | null {
  const {siteConfig} = useDocusaurusContext();

  // The dev build (baseUrl=/docs/dev/) is the only one that should advertise
  // itself as a developer preview. The canonical /docs/ URL serves the latest
  // stable release, and /docs/X.Y.Z/ URLs are explicit stable deep-links.
  // Keying off baseUrl (a build-time constant) keeps the verdict consistent
  // in SSR and after client hydration.
  if (siteConfig.baseUrl !== '/docs/dev/') {
    return null;
  }

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
