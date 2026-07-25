// @ts-check
// See https://docusaurus.io/docs/api/docusaurus-config
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { themes as prismThemes } from 'prism-react-renderer';
import { makeDocsPreprocessor } from './scripts/lib/preprocess.mjs';
import { loadMenuConfig, makeSidebarItemsGenerator, validateMenuConfig } from './scripts/lib/sidebar.mjs';

const GITHUB_REPO = 'https://github.com/llm-d/llm-d';

// Self-adjusting versioning: derive the version map from versions.json (which
// docusaurus writes newest-first). The newest release is served at /docs and the
// rest at /docs/<version>; the committed dev docs/ are the unreleased "dev"
// version at /docs/dev. Reading the file lets `llmd-site version cut` recreate
// versioned_docs/ without the config hard-coding a version that may be absent.
const siteDir = path.dirname(fileURLToPath(import.meta.url));
// menu-config.json is authored in llm-d/llm-d (docs/menu-config.json) and synced
// into docs/ alongside the docs it describes. It may be absent before the first
// sync, so loadMenuConfig tolerates a missing file and we only validate when docs/ exists.
const docsDir = path.join(siteDir, 'docs');
const menuConfig = loadMenuConfig(path.join(docsDir, 'menu-config.json'));
if (fs.existsSync(docsDir)) validateMenuConfig(menuConfig, docsDir);
const versionsFile = path.join(siteDir, 'versions.json');
const releasedVersions = fs.existsSync(versionsFile)
  ? JSON.parse(fs.readFileSync(versionsFile, 'utf8'))
  : [];
const LATEST_VERSION = releasedVersions[0];
const docsVersions = LATEST_VERSION
  ? {
      lastVersion: LATEST_VERSION,
      versions: {
        // Released versions first (newest = default at /docs, older at /docs/<v>),
        // then the unreleased dev version last — this is the version dropdown order.
        ...Object.fromEntries(
          releasedVersions.map((v) => [
            v,
            {
              // Mark the default (newest) release, served at /docs, as "(latest)".
              label: v === LATEST_VERSION ? `v${v} (latest)` : `v${v}`,
              path: v === LATEST_VERSION ? '' : v,
              badge: true,
            },
          ]),
        ),
        current: { label: 'dev', path: 'dev', banner: 'unreleased' },
      },
    }
  : {};

/** Docs are synced from llm-d/llm-d into docs/ (see tools/llmd-site).
 *  Map a synced doc back to its source file for the "Edit this page" link. */
function docsEditUrl({ versionDocsDirPath, docPath }) {
  // Only the current ("next") version maps cleanly back to the live source tree.
  if (versionDocsDirPath !== 'docs') return undefined;
  return `${GITHUB_REPO}/edit/main/docs/${docPath}`;
}

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'llm-d',
  tagline: 'Kubernetes-native, high-performance distributed LLM inference',
  favicon: 'img/llm-d-favicon.png',

  url: 'https://llm-d.ai',
  baseUrl: '/',

  organizationName: 'llm-d',
  projectName: 'llm-d',

  trailingSlash: false,
  onBrokenLinks: 'warn',
  onBrokenAnchors: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    // .md -> CommonMark (forgiving of the raw HTML in the synced GitHub docs),
    // .mdx -> MDX (blog posts, community index/events, getting-started).
    format: 'detect',
    mermaid: true,
    // Render-time link/image/brace fixes for the pristine synced docs copy.
    preprocessor: makeDocsPreprocessor({ docsDir }),
    hooks: {
      onBrokenMarkdownLinks: 'warn',
      onBrokenMarkdownImages: 'warn',
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: 'docs',
          routeBasePath: 'docs',
          sidebarPath: './sidebars.js',
          editUrl: docsEditUrl,
          sidebarItemsGenerator: makeSidebarItemsGenerator(menuConfig),
          // Native versioning: the synced docs/ are the unreleased "dev" version;
          // released versions are frozen snapshots under versioned_docs/.
          includeCurrentVersion: true,
          ...docsVersions,
        },
        blog: {
          path: 'blog',
          routeBasePath: 'blog',
          showReadingTime: true,
          blogSidebarTitle: 'All posts',
          blogSidebarCount: 'ALL',
          editUrl: `${GITHUB_REPO}/edit/main/website/`,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'ignore',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
        },
      }),
    ],
  ],

  plugins: [
    // Community section as its own docs instance (mirrors docusaurus.io/community).
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'community',
        path: 'community',
        routeBasePath: 'community',
        sidebarPath: './sidebarsCommunity.js',
      },
    ],
  ],

  themes: [
    '@docusaurus/theme-mermaid',
    // Offline full-text search (docs + blog + community).
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      /** @type {import('@easyops-cn/docusaurus-search-local').PluginOptions} */
      ({
        hashed: true,
        indexBlog: true,
        indexPages: true,
        docsRouteBasePath: ['/docs', '/community'],
        highlightSearchTermsOnTargetPage: true,
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/llm-d-social-card.jpg',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      announcementBar: {
        id: 'llm-d-0-8-0',
        content:
          '🎉 <b>llm-d 0.8 is here!</b> Multimodal, batch &amp; flow-control graduate to production, with broader accelerator support and initial RL. <a href="/docs/getting-started/quickstart"><b>See what\'s new →</b></a>',
        textColor: '#ffffff',
        isCloseable: true,
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: false,
        },
      },
      navbar: {
        logo: {
          alt: 'llm-d',
          src: 'img/llm-d-logotype-and-icon.svg',
          srcDark: 'img/llm-d-logotype-and-icon-dark.svg',
          href: '/',
        },
        items: [
          {
            // Plain link (not a version-aware docSidebar item) so "Docs" always
            // opens the latest release at /docs, regardless of the version the
            // visitor last viewed (dev/0.7 are reachable via the dropdown).
            to: '/docs',
            position: 'left',
            label: 'Docs',
          },
          { to: '/blog', label: 'Blog', position: 'left' },
          {
            type: 'docSidebar',
            sidebarId: 'communitySidebar',
            docsPluginId: 'community',
            position: 'left',
            label: 'Contributing',
          },
          {
            type: 'docsVersionDropdown',
            // On the left, right after Community (consistent navbar spacing).
            position: 'left',
            dropdownActiveClassDisabled: true,
            // Order the dropdown releases-first (newest default at top), dev last.
            versions: [...releasedVersions, 'current'],
          },
          {
            // GitHub icon + live star count (see src/components/GithubStarsNavbarItem).
            type: 'custom-githubStars',
            href: GITHUB_REPO,
            position: 'right',
            'aria-label': 'GitHub repository',
          },
          {
            href: 'https://llm-d.ai/slack',
            position: 'right',
            className: 'header-slack-link',
            label: 'Join Slack',
            'aria-label': 'llm-d Slack',
          },
        ],
      },
      footer: {
        style: 'dark',
        logo: {
          alt: 'llm-d Logo',
          src: 'img/cncf-color.svg',
          srcDark: 'img/cncf-white.png',
          href: 'https://cncf.io',
          target: '_blank',
          width: 240,
          className: 'footer-logo',
          style: {
            marginRight: '10px',
          },
        },
        links: [
          {
            title: 'Documentation',
            items: [
              {
                html: '<a href="/docs" class="footer__link-item">Getting Started</a>',
              },
              {
                html: '<a href="/docs/architecture" class="footer__link-item">Architecture</a>',
              },
              {
                html: '<a href="/docs/well-lit-paths" class="footer__link-item">Well-Lit Paths</a>',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                html: '<a href="/community" class="footer__link-item">Contact us</a>',
              },
              {
                html: '<a href="/community/contribute" class="footer__link-item">Contributing</a>',
              },
              {
                html: '<a href="/community/code-of-conduct" class="footer__link-item">Code of Conduct</a>',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                html: '<a href="/blog" class="footer__link-item">Blog</a>',
              },
              {
                label: 'Privacy Policy',
                href: 'https://www.redhat.com/en/about/privacy-policy',
              },
            ],
          },
          {
            title: 'Social',
            items: [
              {
                html: `
                <div class="footer-socials" role="navigation" aria-label="Social links">
                  <div class="footer-socials-row">
                    <a href="https://github.com/llm-d/" target="_blank" rel="noreferrer noopener" aria-label="GitHub">
                      <img src="/img/new-social/github-mark-white.png" alt="GitHub" />
                    </a>
                    <a href="https://linkedin.com/company/llm-d" target="_blank" rel="noreferrer noopener" aria-label="LinkedIn">
                      <img src="/img/new-social/linkedin-mark-white.png" alt="LinkedIn" />
                    </a>
                    <a href="https://llm-d.slack.com" target="_blank" rel="noreferrer noopener" aria-label="Slack">
                      <img src="/img/new-social/slack-mark-white.png" alt="Slack" />
                    </a>
                    <a href="https://www.reddit.com/r/llm_d/" target="_blank" rel="noreferrer noopener" aria-label="Reddit">
                      <img src="/img/new-social/reddit-mark-white.png" alt="Reddit" />
                    </a>
                    <a href="https://bsky.app/profile/llm-d.ai" target="_blank" rel="noreferrer noopener" aria-label="Bluesky">
                      <img src="/img/new-social/bluesky-mark-white.svg" alt="Bluesky" />
                    </a>
                    <a href="https://x.com/_llm_d_" target="_blank" rel="noreferrer noopener" aria-label="X / Twitter">
                      <img src="/img/new-social/x-mark-white.png" alt="X / Twitter" />
                    </a>
                    <a href="https://www.youtube.com/@llm-d-project" target="_blank" rel="noreferrer noopener" aria-label="YouTube">
                      <img src="/img/new-social/youtube-mark-white.svg" alt="YouTube" />
                    </a>
                  </div>
                  <div class="footer-cncf">
                    <img class="footer-cncf-logo" src="/img/CNCF-logo.svg" alt="CNCF" />
                    <span>llm-d is a CNCF Sandbox project</span>
                  </div>
                  <div class="footer-socials-cta">
                    <a href="/slack" target="_self" rel="noreferrer noopener" aria-label="Join our Slack">
                      <span class="button-link">Join our Slack</span>
                    </a>
                  </div>
                </div>
              `,
              },
            ],
          },
        ],
        copyright: `Copyright llm-d a Series of LF Projects, LLC. Apache 2.0 License.<br />\
        We are a Cloud Native Computing Foundation sandbox project.<br />\
        For website terms of use, trademark policy and other project policies please see <a href="https://lfprojects.org/policies/" target="_blank" rel="noreferrer noopener">https://lfprojects.org/policies/</a>`,
      },
      prism: {
        theme: prismThemes.oneLight,
        darkTheme: prismThemes.oneDark,
        additionalLanguages: ['bash', 'yaml', 'json', 'toml', 'promql'],
      },
      mermaid: {
        theme: { light: 'neutral', dark: 'dark' },
      },
    }),
};

export default config;
