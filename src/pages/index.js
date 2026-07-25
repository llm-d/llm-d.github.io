import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import LandingApp from '@site/src/landing/LandingApp';
// Scoped Tailwind utilities for the landing (generated; see npm run landing:css)
// followed by the landing fonts + wrapper base. Both are scoped to .llmd-frame.
import '@site/src/landing/landing.tailwind.css';
import '@site/src/landing/landing.css';

/**
 * Home / landing page. Renders the ported design (LandingApp) inside the
 * standard Docusaurus Layout (navbar + footer).
 */
export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="llm-d" description={siteConfig.tagline}>
      <LandingApp />
    </Layout>
  );
}
