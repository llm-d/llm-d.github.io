import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'llm-d',
  tagline: 'Kubernetes-native distributed inference serving for LLMs',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  headTags: [
    {
      tagName: 'meta',
      attributes: {name: 'robots', content: 'noindex, nofollow'},
    },
  ],

  url: 'https://llm-d.ai',
  baseUrl: '/docs/',

  organizationName: 'llm-d',
  projectName: 'llm-d.github.io',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  onBrokenAnchors: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  plugins: [require.resolve('./plugins/versions-plugin')],

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: ({docPath}) => {
            // Remove the extra 'docs/' prefix that Docusaurus adds
            const cleanPath = docPath.replace(/^docs\//, '');
            // Map index.md back to README.md (sync script renames these)
            const sourcePath = cleanPath.replace(/\/index\.md$/, '/README.md');
            return `https://github.com/llm-d/llm-d/blob/main/docs/${sourcePath}`;
          },
          showLastUpdateTime: true,
          // No Docusaurus versioning - dev (main) is always at /docs/
          // Stable releases link to GitHub via custom version dropdown
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/llm-d-logo.png',
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
      disableSwitch: true,
    },
    announcementBar: {
      id: 'dev_preview_banner',
      content:
        'You are viewing the <strong>latest developer preview</strong> docs. ' +
        'For stable release docs, use the version picker.',
      backgroundColor: '#1a0b1e',
      textColor: '#c9b3d4',
      isCloseable: false,
    },
    navbar: {
      style: 'dark',
      logo: {
        alt: 'llm-d',
        src: 'img/llm-d-logo-navbar.png',
      },
      items: [
        {
          to: '/',
          position: 'left',
          label: 'Documentation',
        },
        {
          to: '/blog',
          label: 'Blog',
          position: 'left',
        },
        {
          to: '/community',
          label: 'Community',
          position: 'left',
        },
        {
          type: 'custom-version-dropdown' as any,
          position: 'left',
        },
        {
          type: 'custom-github-stars' as any,
          position: 'right',
        },
        {
          type: 'custom-slack-button' as any,
          position: 'right',
        },
        {
          type: 'custom-color-mode-toggle' as any,
          position: 'right',
        },
        // Mobile-only fallbacks — hidden on desktop via CSS, surface in the
        // hamburger drawer at <997px where the custom pills are hidden.
        {
          href: 'https://github.com/llm-d/llm-d',
          label: 'GitHub',
          position: 'right',
          className: 'navbar-mobile-only',
        },
        {
          href: 'https://llm-d.slack.com',
          label: 'Join Slack',
          position: 'right',
          className: 'navbar-mobile-only',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'Getting Started', to: '/getting-started'},
            {label: 'Architecture', to: '/architecture'},
            {label: 'Guides', to: '/guides'},
            {label: 'Resources', to: '/resources/gateway'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'Slack', href: 'https://llm-d.slack.com'},
            {label: 'GitHub', href: 'https://github.com/llm-d'},
            {label: 'Current Site', href: 'https://llm-d.ai'},
          ],
        },
        {
          title: 'Repositories',
          items: [
            {label: 'llm-d', href: 'https://github.com/llm-d/llm-d'},
            {label: 'Inference Scheduler', href: 'https://github.com/llm-d/llm-d-inference-scheduler'},
            {label: 'KV Cache', href: 'https://github.com/llm-d/llm-d-kv-cache'},
          ],
        },
        {
          title: 'Social',
          items: [
            {
              html: `
<div class="footer-social-icons">
  <a href="https://github.com/llm-d/" aria-label="GitHub" target="_blank" rel="noopener noreferrer"><img src="/preview/img/social/github.svg" alt="GitHub" /></a>
  <a href="https://linkedin.com/company/llm-d" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer"><img src="/preview/img/social/linkedin.svg" alt="LinkedIn" /></a>
  <a href="https://llm-d.slack.com" aria-label="Slack" target="_blank" rel="noopener noreferrer"><img src="/preview/img/social/slack.svg" alt="Slack" /></a>
  <a href="https://www.reddit.com/r/llm_d/" aria-label="Reddit" target="_blank" rel="noopener noreferrer"><img src="/preview/img/social/reddit.svg" alt="Reddit" /></a>
  <a href="https://bsky.app/profile/llm-d.ai" aria-label="Bluesky" target="_blank" rel="noopener noreferrer"><img src="/preview/img/social/bluesky.svg" alt="Bluesky" /></a>
  <a href="https://x.com/_llm_d_" aria-label="X" target="_blank" rel="noopener noreferrer"><img src="/preview/img/social/x.svg" alt="X" /></a>
  <a href="https://www.youtube.com/@llm-d-project" aria-label="YouTube" target="_blank" rel="noopener noreferrer"><img src="/preview/img/social/youtube.svg" alt="YouTube" /></a>
</div>
              `,
            },
            {label: 'Join our Slack', href: 'https://llm-d.slack.com'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} llm-d project. Apache 2.0 License.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'json', 'go', 'python'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
