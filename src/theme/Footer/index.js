import React from 'react';
import { useLocation } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { LandingFooterContent } from '@site/src/landing/Frame156';
// Scoped landing utilities + wrapper styling. Scoped to `.llmd-frame`, so on
// non-landing pages these only affect the footer below.
import '@site/src/landing/landing.tailwind.css';
import '@site/src/landing/landing.css';

/**
 * Site-wide footer — the llm-d landing footer, used as the default footer on
 * every page (swizzles the theme's default Footer). It reuses the exact landing
 * footer markup (LandingFooterContent) inside a full-width dark band with a
 * centered content column.
 *
 * The landing page (`/`) renders this same footer inline within its scroll
 * flow, so we skip it there to avoid rendering it twice.
 */
export default function Footer() {
  const { pathname } = useLocation();
  const { siteConfig } = useDocusaurusContext();
  if (pathname === siteConfig.baseUrl) {
    return null;
  }
  return (
    <footer className="llmd-frame llmd-site-footer">
      <div className="llmd-site-footer__inner">
        <LandingFooterContent />
      </div>
    </footer>
  );
}
