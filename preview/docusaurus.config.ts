import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// Validate and normalize DOCS_BASE_URL to ensure it starts and ends with '/'
function getBaseUrl(): string {
  const envBaseUrl = process.env.DOCS_BASE_URL;
  const defaultBaseUrl = '/docs/';

  if (!envBaseUrl) {
    return defaultBaseUrl;
  }

  // Ensure leading and trailing slashes
  let normalized = envBaseUrl;
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  if (!normalized.endsWith('/')) {
    normalized = normalized + '/';
  }

  return normalized;
}

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
  baseUrl: getBaseUrl(),

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

  plugins: [
    require.resolve('./plugins/versions-plugin'),
    // Build docs search output so the site-root merge step can compose a
    // unified index from build/search-doc.json + build/docs/search-doc.json.
    [
      require.resolve('docusaurus-lunr-search'),
      {
        languages: ['en'],
      },
    ],
  ],

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

            // Guide pages: flat .md files are overview pages from docs/well-lit-paths/;
            // directory-based guides (*/index.md at depth >2) come from guides/*/README.md
            if (cleanPath.startsWith('guides/')) {
              const parts = cleanPath.split('/');
              if (cleanPath.endsWith('/index.md') && parts.length > 2) {
                // Directory-based guide: guides/[name]/index.md → guides/[name]/README.md
                return `https://github.com/llm-d/llm-d/blob/main/${sourcePath}`;
              }
              // Flat overview page synced from docs/well-lit-paths/
              // Special case: precise-prefix-cache-aware was renamed to precise-prefix-cache-routing
              if (cleanPath === 'guides/precise-prefix-cache-aware.md') {
                return 'https://github.com/llm-d/llm-d/blob/main/docs/well-lit-paths/precise-prefix-cache-routing.md';
              }
              const wellLitPath = sourcePath.replace(/^guides\//, 'docs/well-lit-paths/');
              return `https://github.com/llm-d/llm-d/blob/main/${wellLitPath}`;
            }

            // Gateway pages come from guides/prereq/gateways/ in the upstream repo
            if (cleanPath.startsWith('resources/gateway/')) {
              const gatewayFile = sourcePath.replace(/^resources\/gateway\//, '');
              return `https://github.com/llm-d/llm-d/blob/main/guides/prereq/gateways/${gatewayFile}`;
            }

            // Infra-provider pages come from docs/infra-providers/ (not docs/resources/infra-providers/)
            if (cleanPath.startsWith('resources/infra-providers/')) {
              if (cleanPath === 'resources/infra-providers/index.md') {
                return 'https://github.com/llm-d/llm-d/blob/main/docs/infra-providers/README.md';
              }
              const providerName = cleanPath.replace(/^resources\/infra-providers\//, '').replace(/\.md$/, '');
              return `https://github.com/llm-d/llm-d/blob/main/docs/infra-providers/${providerName}/README.md`;
            }

            // Renamed files: source file names differ from local file names
            if (cleanPath === 'resources/rdma/rdma-configuration.md') {
              return 'https://github.com/llm-d/llm-d/blob/main/docs/resources/rdma/README.md';
            }
            if (cleanPath === 'architecture/advanced/autoscaling/workload-variant-autoscaling.md') {
              return 'https://github.com/llm-d/llm-d/blob/main/docs/architecture/advanced/autoscaling/wva.md';
            }
            if (cleanPath === 'architecture/advanced/autoscaling/igw-hpa.md') {
              return 'https://github.com/llm-d/llm-d/blob/main/docs/architecture/advanced/autoscaling/hpa-keda.md';
            }

            // llm-d#1542: monitoring/ renamed to observability/ on main. Release doc
            // branches may still build legacy resources/monitoring/* paths.
            if (cleanPath.startsWith('resources/monitoring/')) {
              const observabilityFile = cleanPath.replace(
                /^resources\/monitoring\//,
                '',
              );
              return `https://github.com/llm-d/llm-d/blob/main/docs/resources/observability/${observabilityFile}`;
            }
            if (cleanPath.startsWith('resources/observability/')) {
              const observabilityFile = cleanPath.replace(
                /^resources\/observability\//,
                '',
              );
              return `https://github.com/llm-d/llm-d/blob/main/docs/resources/observability/${observabilityFile}`;
            }

            return `https://github.com/llm-d/llm-d/blob/main/docs/${sourcePath}`;
          },
          showLastUpdateTime: true,
          // No Docusaurus versioning. Versioning is handled at the build layer
          // (scripts/build-all.sh): the latest stable release is served at the
          // canonical /docs/ URL, dev lives at /docs/dev/, and each release-X.Y.Z
          // branch is also exposed at /docs/X.Y.Z/. The navbar dropdown
          // (preview/src/components/VersionDropdown.tsx) routes between them.
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
    },
    navbar: {
      style: 'dark',
      logo: {
        alt: 'llm-d',
        src: 'img/llm-d-logo-navbar.png',
        href: 'https://llm-d.ai',
        target: '_self',
      },
      items: [
        {
          to: '/getting-started',
          position: 'left',
          label: 'Documentation',
        },
        {
          type: 'custom-version-dropdown' as any,
          position: 'left',
        },
        {
          href: 'https://llm-d.ai',
          label: 'llm-d.ai',
          position: 'right',
        },
        {
          href: 'https://github.com/llm-d/llm-d',
          label: 'GitHub',
          position: 'right',
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
            {label: 'Router', href: 'https://github.com/llm-d/llm-d-router'},
            {label: 'KV Cache', href: 'https://github.com/llm-d/llm-d-kv-cache'},
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
