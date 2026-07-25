import { useEffect, useState } from "react";

/**
 * Live release-updates data for the landing page's release panel.
 *
 * The panel shows, per selected version: a list of change entries (title + PR
 * number) and the contributors for that release. This hook pulls that data live
 * from the GitHub API — the same approach as the navbar star count
 * (src/components/GithubStarsNavbarItem.js): fetch client-side in an effect,
 * cache in localStorage with a 6h TTL, and degrade gracefully to a static
 * snapshot when the API is unavailable or rate-limited (unauthenticated GitHub
 * is 60 req/hr per IP). SSR and first paint render the static fallback, so the
 * panel is never empty.
 *
 *   • Entries      — parsed from each release's auto-generated notes body.
 *   • Contributors — unique commit authors between the previous release tag and
 *                    the selected tag (GET /compare/{prev}...{tag}), fetched
 *                    lazily per version.
 */

export type ReleaseEntry = { text: string; pr: string | null };
export type Contributor = { login: string; avatar: string; url: string };

const REPO = "llm-d/llm-d";
const API = `https://api.github.com/repos/${REPO}`;
const RELEASES_CACHE_KEY = "llmd:releases";
const CONTRIB_CACHE_PREFIX = "llmd:release-contrib:";
const TTL = 6 * 60 * 60 * 1000; // 6 hours

// --- Static fallback (SSR + first paint + when the API fails/rate-limits) ----
// A trimmed snapshot so the panel always renders something meaningful offline.
const FALLBACK_RELEASES: Record<string, ReleaseEntry[]> = {
  "v0.8.1": [
    { text: "Point to patch v0.8.1", pr: null },
    { text: "Updated the branch to clone in the guides to release-0.8 branch", pr: "1958" },
    { text: "Pin inference-perf version", pr: "1946" },
  ],
  "v0.8.0": [
    { text: "Simplify WVA guide test", pr: "1072" },
    { text: "fix concurrency group to sha not PR", pr: "1073" },
    { text: "fix block-size alignment", pr: "1084" },
    { text: "Revise maturity status and TPU VM type details", pr: "1085" },
    { text: "Updated maturity testing level on all guides", pr: "1094" },
    { text: "Skip latest tag for release candidates", pr: "1034" },
  ],
  "v0.7.0": [
    { text: "Add SGLang option for inference-scheduling well-lit path", pr: "527" },
    { text: "Partial enablement of CICD for GKE", pr: "934" },
    { text: "docs: Small fixes in the inference-scheduling installation guide", pr: "924" },
  ],
};

const FALLBACK_CONTRIBUTORS: Contributor[] = [
  { login: "Gregory-Pereira", avatar: "https://avatars.githubusercontent.com/u/19876404?v=4", url: "https://github.com/Gregory-Pereira" },
  { login: "clubanderson", avatar: "https://avatars.githubusercontent.com/u/407614?v=4", url: "https://github.com/clubanderson" },
  { login: "lionelvillard", avatar: "https://avatars.githubusercontent.com/u/6598801?v=4", url: "https://github.com/lionelvillard" },
  { login: "ahg-g", avatar: "https://avatars.githubusercontent.com/u/40361897?v=4", url: "https://github.com/ahg-g" },
  { login: "robertgshaw2-redhat", avatar: "https://avatars.githubusercontent.com/u/114415538?v=4", url: "https://github.com/robertgshaw2-redhat" },
  { login: "diegocastanibm", avatar: "https://avatars.githubusercontent.com/u/117670907?v=4", url: "https://github.com/diegocastanibm" },
  { login: "liu-cong", avatar: "https://avatars.githubusercontent.com/u/6902282?v=4", url: "https://github.com/liu-cong" },
  { login: "maugustosilva", avatar: "https://avatars.githubusercontent.com/u/2022883?v=4", url: "https://github.com/maugustosilva" },
  { login: "smarterclayton", avatar: "https://avatars.githubusercontent.com/u/1163175?v=4", url: "https://github.com/smarterclayton" },
  { login: "petecheslock", avatar: "https://avatars.githubusercontent.com/u/511733?v=4", url: "https://github.com/petecheslock" },
];
const FALLBACK_TOTAL = 151;

// Only surface v0.7.0 and later in the release-updates dropdown.
function surfaced(v: string): boolean {
  const parts = v.replace(/^v/, "").split(".");
  const maj = Number(parts[0]);
  const min = Number(parts[1]);
  return maj > 0 || min >= 7;
}

// Sort tags newest-first by semver so the dropdown order and the "previous tag"
// used for the contributor compare are stable regardless of publish order.
function semverParts(v: string): number[] {
  return v.replace(/^v/, "").split(".").map((n) => Number(n) || 0);
}
function cmpVersionDesc(a: string, b: string): number {
  const A = semverParts(a);
  const B = semverParts(b);
  const len = Math.max(A.length, B.length);
  for (let i = 0; i < len; i++) {
    const d = (B[i] || 0) - (A[i] || 0);
    if (d) return d;
  }
  return 0;
}

// Parse a release body's change list into {text, pr} entries. Handles both
// GitHub auto-generated notes ("* Title by @user in .../pull/123") and manually
// authored bullet lines (with a trailing "(#123)" or "#123").
function parseReleaseBody(body: string): ReleaseEntry[] {
  const entries: ReleaseEntry[] = [];
  for (const line of body.split(/\r?\n/)) {
    const bullet = line.match(/^\s*[*\-]\s+(.*)$/);
    if (!bullet) continue;
    let text = bullet[1];
    const prMatch =
      text.match(/\/pull\/(\d+)/) || text.match(/\(#(\d+)\)/) || text.match(/#(\d+)\b/);
    const pr = prMatch ? prMatch[1] : null;
    // Strip the "by @user in <url>" suffix and any raw URLs / PR refs.
    text = text
      .replace(/\s+by\s+@[\w.-]+\s+in\s+https?:\/\/\S+/i, "")
      .replace(/\s*\(#\d+\)\s*$/, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\s+#\d+\s*$/, "")
      .trim();
    if (!text) continue;
    entries.push({ text, pr });
  }
  return entries;
}

type CacheEntry<T> = { t: number; v: T };

function readCache<T>(key: string): { value: T; fresh: boolean } | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.t !== "number") return null;
    return { value: parsed.v, fresh: Date.now() - parsed.t < TTL };
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    /* ignore quota / no localStorage */
  }
}

type ReleasesPayload = {
  // tag -> { body, url }
  rec: Record<string, { body: string; url: string }>;
  // all tags, newest-first
  order: string[];
};

type ContribPayload = { contributors: Contributor[]; total: number };

export type UseReleaseData = {
  versions: string[];
  selected: string;
  setSelected: (v: string) => void;
  entries: ReleaseEntry[];
  contributors: Contributor[];
  totalContributors: number;
  releaseUrl: string;
};

export function useReleaseData(): UseReleaseData {
  const fallbackVersions = Object.keys(FALLBACK_RELEASES)
    .filter(surfaced)
    .sort(cmpVersionDesc);

  const [releases, setReleases] = useState<ReleasesPayload | null>(null);
  const [versions, setVersions] = useState<string[]>(fallbackVersions);
  const [selected, setSelected] = useState<string>(fallbackVersions[0]);
  const [contribByVersion, setContribByVersion] = useState<Record<string, ContribPayload>>({});

  const applyReleases = (payload: ReleasesPayload) => {
    setReleases(payload);
    const surfacedVersions = payload.order.filter(surfaced);
    if (surfacedVersions.length) {
      setVersions(surfacedVersions);
      setSelected((cur) => (surfacedVersions.includes(cur) ? cur : surfacedVersions[0]));
    }
  };

  // Fetch the releases list once (cache-first).
  useEffect(() => {
    const cached = readCache<ReleasesPayload>(RELEASES_CACHE_KEY);
    if (cached) applyReleases(cached.value);
    if (cached && cached.fresh) return;

    let cancelled = false;
    fetch(`${API}/releases?per_page=30`, { headers: { Accept: "application/vnd.github+json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((list) => {
        if (cancelled || !Array.isArray(list)) return;
        const rec: ReleasesPayload["rec"] = {};
        for (const rel of list) {
          if (!rel || !rel.tag_name) continue;
          rec[rel.tag_name] = { body: rel.body || "", url: rel.html_url || "" };
        }
        const order = Object.keys(rec).sort(cmpVersionDesc);
        if (!order.length) return;
        const payload = { rec, order };
        writeCache(RELEASES_CACHE_KEY, payload);
        applyReleases(payload);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch contributors for the selected version (cache-first, lazy).
  useEffect(() => {
    if (!releases || contribByVersion[selected]) return;

    const cacheKey = CONTRIB_CACHE_PREFIX + selected;
    const cached = readCache<ContribPayload>(cacheKey);
    if (cached && cached.value.contributors.length) {
      setContribByVersion((prev) => ({ ...prev, [selected]: cached.value }));
      if (cached.fresh) return;
    }

    const idx = releases.order.indexOf(selected);
    const prevTag = idx >= 0 && idx < releases.order.length - 1 ? releases.order[idx + 1] : null;
    if (!prevTag) return; // oldest known release — keep fallback contributors

    let cancelled = false;
    fetch(`${API}/compare/${prevTag}...${selected}`, {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.commits)) return;
        const map = new Map<string, Contributor & { count: number }>();
        for (const c of data.commits) {
          const a = c && c.author;
          if (!a || !a.login) continue;
          const cur =
            map.get(a.login) ||
            { login: a.login, avatar: a.avatar_url, url: a.html_url, count: 0 };
          cur.count += 1;
          map.set(a.login, cur);
        }
        const sorted = [...map.values()].sort((x, y) => y.count - x.count);
        if (!sorted.length) return;
        const payload: ContribPayload = {
          contributors: sorted.map(({ login, avatar, url }) => ({ login, avatar, url })),
          total: sorted.length,
        };
        writeCache(cacheKey, payload);
        setContribByVersion((prev) => ({ ...prev, [selected]: payload }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [releases, selected, contribByVersion]);

  const entries =
    releases && releases.rec[selected]
      ? parseReleaseBody(releases.rec[selected].body)
      : FALLBACK_RELEASES[selected] ?? [];

  const releaseUrl =
    releases && releases.rec[selected] && releases.rec[selected].url
      ? releases.rec[selected].url
      : `https://github.com/${REPO}/releases/tag/${selected}`;

  const contrib = contribByVersion[selected];
  const contributors = contrib ? contrib.contributors : FALLBACK_CONTRIBUTORS;
  const totalContributors = contrib ? contrib.total : FALLBACK_TOTAL;

  return { versions, selected, setSelected, entries, contributors, totalContributors, releaseUrl };
}
