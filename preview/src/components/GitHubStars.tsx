import React, {useEffect, useState} from 'react';
import {Star} from 'lucide-react';

// lucide-react 1.x dropped brand marks; inline the GitHub Octicon (MIT) so we
// don't depend on the older 0.x line.
function GitHubMark({size = 16}: {size?: number}): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}

const REPO_URL = 'https://github.com/llm-d/llm-d';
const API_URL = 'https://api.github.com/repos/llm-d/llm-d';
const CACHE_KEY = 'llmd-github-stars';
const CACHE_TTL_MS = 60 * 60 * 1000;

type CacheEntry = {count: number; ts: number};

function formatStars(n: number): string {
  if (n < 1000) return n.toString();
  return (Math.round(n / 100) / 10).toFixed(1) + 'k';
}

function readCache(): number | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.count;
  } catch {
    return null;
  }
}

function writeCache(count: number): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({count, ts: Date.now()}));
  } catch {
    /* ignore quota / privacy mode */
  }
}

export default function GitHubStars(): React.JSX.Element {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    const cached = readCache();
    if (cached !== null) {
      setStars(cached);
      return;
    }
    let cancelled = false;
    fetch(API_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{stargazers_count: number}>;
      })
      .then((data) => {
        if (cancelled) return;
        setStars(data.stargazers_count);
        writeCache(data.stargazers_count);
      })
      .catch(() => {
        /* swallow — we just won't show a count */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="nav-pill nav-pill--gh"
      aria-label={
        stars !== null
          ? `GitHub repository, ${stars} stars`
          : 'GitHub repository'
      }
    >
      <GitHubMark size={14} />
      <span className="nav-pill__label">GitHub</span>
      {stars !== null && (
        <span className="nav-pill__chip">
          <Star size={11} fill="currentColor" aria-hidden="true" />
          {formatStars(stars)}
        </span>
      )}
    </a>
  );
}
