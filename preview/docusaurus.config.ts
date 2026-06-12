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
    [
      require.resolve('@docusaurus/plugin-client-redirects'),
      {
        createRedirects(existingPath: string) {
          if (existingPath.startsWith('/well-lit-paths')) {
            return [existingPath.replace('/well-lit-paths', '/guides')];
          }
          if (existingPath.startsWith('/guides')) {
            return [existingPath.replace('/guides', '/well-lit-paths')];
          }
          return undefined;
        },
      },
    ],
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
              const flatGuideToWellLitFile: Record<string, string> = {
                'precise-prefix-cache-aware.md': 'precise-prefix-cache-routing',
                'predicted-latency-routing.md': 'predicted-latency',
                'wide-ep-lws.md': 'wide-expert-parallelism',
                'batch-gateway.md': 'batch-gateway',
                'experimental/batch-gateway.md': 'batch-gateway',
              };
              const guideDirToWellLitFile: Record<string, string> = {
                'optimized-baseline': 'optimized-baseline',
                'precise-prefix-cache-routing': 'precise-prefix-cache-routing',
                'tiered-prefix-cache': 'tiered-prefix-cache',
                'asynchronous-processing': 'asynchronous-processing',
                'flow-control': 'flow-control',
                'pd-disaggregation': 'pd-disaggregation',
                'predicted-latency-routing': 'predicted-latency',
                'wide-ep-lws': 'wide-expert-parallelism',
                'workload-autoscaling': 'workload-autoscaling',
                'no-kubernetes-deployment': 'no-kubernetes-deployment',
              };
              if (cleanPath.endsWith('/index.md') && parts.length > 2) {
                const wellLitFile = guideDirToWellLitFile[parts[1]];
                if (wellLitFile) {
                  return `https://github.com/llm-d/llm-d/blob/main/docs/well-lit-paths/${wellLitFile}.md`;
                }
                // Non Well-Lit directory content (e.g. recipes) still lives under guides/
                return `https://github.com/llm-d/llm-d/blob/main/${sourcePath}`;
              }
              const flatGuideName = parts.slice(1).join('/');
              const flatWellLitFile = flatGuideToWellLitFile[flatGuideName];
              if (flatWellLitFile) {
                return `https://github.com/llm-d/llm-d/blob/main/docs/well-lit-paths/${flatWellLitFile}.md`;
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
              // sync-docs.sh copies README.md → index.md for the landing page
              const sourceFile =
                observabilityFile === 'index.md'
                  ? 'README.md'
                  : observabilityFile;
              return `https://github.com/llm-d/llm-d/blob/main/docs/resources/observability/${sourceFile}`;
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
            {label: 'Well-Lit Paths', to: '/well-lit-paths'},
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
      copyright: `Copyright © ${new Date().getFullYear()} llm-d project. Apache 2.0 License.<br />\
        We are a Cloud Native Computing Foundation sandbox project.<br />\
        For website terms of use, trademark policy and other project policies please see <a href="https://lfprojects.org/policies/" target="_blank" rel="noreferrer noopener">https://lfprojects.org/policies/</a>`,
      logo: {
        alt: "CNCF Logo",
        src: "/img/cncf-white.png",
        href: "https://cncf.io",
        target: "_blank",
        width: 240,
        className: "footer-logo",
        style: {
          marginRight: "10px",
        },
      },
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'json', 'go', 'python'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
