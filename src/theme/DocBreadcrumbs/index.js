import React from 'react';
import clsx from 'clsx';
import OriginalDocBreadcrumbs from '@theme-original/DocBreadcrumbs';
import { ThemeClassNames } from '@docusaurus/theme-common';
import { useHomePageRoute } from '@docusaurus/theme-common/internal';
import {
  useSidebarBreadcrumbs,
  useDoc,
} from '@docusaurus/plugin-content-docs/client';
import { translate } from '@docusaurus/Translate';
import HomeBreadcrumbItem from '@theme/DocBreadcrumbs/Items/Home';

/**
 * Docusaurus builds breadcrumbs from the active sidebar, so a doc with
 * `displayed_sidebar: null` (our standalone Contributing page) renders none.
 * This wrapper keeps the stock breadcrumbs for every normal doc, and only when
 * the sidebar yields nothing falls back to a simple "home › <page title>"
 * breadcrumb so the page still has the same header as the rest of the site.
 */
export default function DocBreadcrumbs(props) {
  const breadcrumbs = useSidebarBreadcrumbs();
  if (breadcrumbs) {
    return <OriginalDocBreadcrumbs {...props} />;
  }
  return <FallbackBreadcrumbs />;
}

function FallbackBreadcrumbs() {
  const homePageRoute = useHomePageRoute();
  const { metadata } = useDoc();
  return (
    <nav
      className={clsx(ThemeClassNames.docs.docBreadcrumbs, 'breadcrumbsFallback')}
      aria-label={translate({
        id: 'theme.docs.breadcrumbs.navAriaLabel',
        message: 'Breadcrumbs',
        description: 'The ARIA label for the breadcrumbs',
      })}
      // Match the stock breadcrumbs container spacing/size (styles.module.css).
      style={{ '--ifm-breadcrumb-size-multiplier': 0.8, marginBottom: '0.8rem' }}
    >
      <ul className="breadcrumbs">
        {homePageRoute && <HomeBreadcrumbItem />}
        <li className="breadcrumbs__item breadcrumbs__item--active">
          <span className="breadcrumbs__link">{metadata.title}</span>
        </li>
      </ul>
    </nav>
  );
}
