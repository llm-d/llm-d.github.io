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
                'batch-gateway.md': 'experimental/batch-gateway',
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
              const flatGuideName = parts[1];
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
      respectPrefersColorScheme: true,
    },
    announcementBar: {
      id: 'llm-d-v0-7-release',
      content:
        '🎉 <b>llm-d 0.7 is now available!</b> Explore our completely revamped documentation with comprehensive guides, architecture deep-dives, and production deployment patterns. <a target="_self" rel="noopener noreferrer" href="/docs/getting-started/quickstart"><b>Browse the docs →</b></a>',
      backgroundColor: '#7f317f',
      textColor: '#fff',
      isCloseable: true,
    },
    navbar: {
      logo: {
        alt: 'llm-d',
        src: 'img/llm-d-logo-light.svg',
        srcDark: 'img/llm-d-logo-dark.svg',
      },
      items: [
        {
          to: '/getting-started',
          position: 'left',
          label: 'Documentation',
        },
        {
          type: 'html',
          position: 'left',
          value: '<a href="/blog" class="navbar__item navbar__link">Blog</a>',
        },
        {
          type: 'html',
          position: 'left',
          value: '<a href="/community" class="navbar__item navbar__link">Community</a>',
        },
        {
          type: 'custom-version-dropdown' as any,
          position: 'left',
        },
        {
          type: 'html',
          position: 'right',
          className: 'navbar-github-stars',
          value: '<iframe src="https://ghbtns.com/github-btn.html?user=llm-d&repo=llm-d&type=star&count=true&size=large" frameborder="0" scrolling="0" width="170" height="30" title="GitHub Star" style="vertical-align: middle;"></iframe>',
        },
        {
          type: 'html',
          position: 'right',
          className: 'navbar-slack-item',
          value: '<a href="/slack" class="navbar-slack-button"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><title>Slack</title><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"></path></svg><span class="slack-label">Join Slack</span></a>',
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
