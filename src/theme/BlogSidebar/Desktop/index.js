import React, { useState } from 'react';
import clsx from 'clsx';
import { translate } from '@docusaurus/Translate';
import { useLocation } from '@docusaurus/router';
import {
  useVisibleBlogSidebarItems,
  groupBlogSidebarItemsByYear,
} from '@docusaurus/plugin-content-blog/client';

function YearGroup({ year, items, currentPath, isFirstGroup }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasActiveItem = items.some((item) => item.permalink === currentPath);
  const isActive = hasActiveItem || (isFirstGroup && currentPath === '/blog');

  return (
    <li
      className={clsx(
        'menu__list-item',
        'menu__list-item--collapsible',
        collapsed && 'menu__list-item--collapsed',
      )}>
      <div className={clsx('menu__list-item-collapsible', isActive && 'menu__list-item-collapsible--active')}>
        <span
          className={clsx(
            'menu__link',
            'menu__link--sublist',
            isActive && 'menu__link--active',
          )}>
          {year}
        </span>
        <button
          className="clean-btn menu__caret"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={`Toggle ${year}`}
          aria-expanded={!collapsed}
        />
      </div>
      <ul className="menu__list">
        {items.map((item) => (
          <li key={item.permalink} className="menu__list-item">
            <a
              href={item.permalink}
              className={clsx(
                'menu__link',
                item.permalink === currentPath && 'menu__link--active',
              )}>
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </li>
  );
}

export default function BlogSidebarDesktop({ sidebar }) {
  const items = useVisibleBlogSidebarItems(sidebar.items);
  const yearGroups = groupBlogSidebarItemsByYear(items);
  const { pathname } = useLocation();

  return (
    <aside className="col col--3">
      <nav
        className="menu thin-scrollbar"
        aria-label={translate({
          id: 'theme.blog.sidebar.navAriaLabel',
          message: 'Blog recent posts navigation',
          description: 'The ARIA label for recent posts in the blog sidebar',
        })}>
        <ul className="menu__list">
          {yearGroups.map(([year, yearItems], index) => (
            <YearGroup
              key={year}
              year={year}
              items={yearItems}
              currentPath={pathname}
              isFirstGroup={index === 0}
            />
          ))}
        </ul>
      </nav>
    </aside>
  );
}
