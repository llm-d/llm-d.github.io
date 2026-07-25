import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';

/**
 * Navbar item: GitHub octocat icon + live star count.
 *
 * Registered as the custom navbar item type `custom-githubStars` in
 * src/theme/NavbarItem/ComponentTypes.js. The count is fetched once from the
 * GitHub API and cached in localStorage (6h TTL) to avoid rate limits and
 * flicker on navigation; if the request fails or is rate-limited we simply show
 * the icon with no number. The icon itself is styled in custom.css
 * (.header-github-stars) to match the other navbar icon links.
 */
const API = 'https://api.github.com/repos/llm-d/llm-d';
const CACHE_KEY = 'llmd:gh-stars';
const TTL = 6 * 60 * 60 * 1000; // 6 hours

function formatStars(n) {
  if (n >= 1000) {
    return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  }
  return String(n);
}

export default function GithubStarsNavbarItem({
  mobile = false,
  href = 'https://github.com/llm-d/llm-d',
}) {
  const [stars, setStars] = useState(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && typeof cached.v === 'number') setStars(cached.v); // show immediately
      if (cached && Date.now() - cached.t < TTL) return; // still fresh — skip network
    } catch {
      /* ignore malformed cache / no localStorage */
    }
    fetch(API, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data || typeof data.stargazers_count !== 'number') return;
        setStars(data.stargazers_count);
        try {
          window.localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ v: data.stargazers_count, t: Date.now() }),
          );
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const count = stars != null ? formatStars(stars) : null;

  if (mobile) {
    return (
      <li className="menu__list-item">
        <Link
          href={href}
          className="menu__link header-github-stars"
          aria-label="GitHub repository"
        >
          <span className="header-github-stars__icon" aria-hidden="true" />
          <span>GitHub{count ? ` · ${count} stars` : ''}</span>
        </Link>
      </li>
    );
  }

  // Desktop: GitHub icon with the star count to its right.
  return (
    <Link
      href={href}
      className="navbar__item navbar__link header-github-stars"
      aria-label="GitHub repository"
    >
      <span className="header-github-stars__icon" aria-hidden="true" />
      {count && <span className="header-github-stars__count">{count}</span>}
    </Link>
  );
}
