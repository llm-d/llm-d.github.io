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
    // Cross-app theme sync: the main site and each docs build use distinct
    // localStorage keys for the color-mode preference — Docusaurus appends a
    // hash of baseUrl to "theme" ("theme", "theme-23d", "theme-1a2",
    // "theme-2af", …). Mirror across every theme* key so dark/light persists
    // when the user navigates from one Docusaurus instance to another.
    {
      tagName: 'script',
      attributes: {},
      innerHTML: `(function(){try{var keys=[],v=null;for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k==='theme'||/^theme-[a-z0-9]+$/.test(k)){keys.push(k);var x=localStorage.getItem(k);if(x)v=x;}}['theme','theme-23d','theme-1a2','theme-2af'].forEach(function(k){if(keys.indexOf(k)===-1)keys.push(k);});if(v)keys.forEach(function(k){localStorage.setItem(k,v);});}catch(e){}})();`,
    },
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
            // Map index.md/index.mdx back to README.md/README.mdx (sync script renames these)
            const sourcePath = cleanPath
              .replace(/\/index\.mdx$/, '/README.mdx')
              .replace(/\/index\.md$/, '/README.md');

            // Guide pages: flat .md files are overview pages from docs/well-lit-paths/ subdirs;
            // directory-based guides (*/index.md at depth >2) may also be from well-lit-paths/.
            // Maps local guide filename → new well-lit-paths subdirectory path (without .md).
            if (cleanPath.startsWith('guides/')) {
              const parts = cleanPath.split('/');
              const flatGuideToWellLitPath: Record<string, string> = {
                // section overview pages (Foundations / Workloads)
                'capabilities.md':                   'foundations/README',
                'workloads.md':                      'workloads/README',
                // foundations/
                'optimized-baseline.md':             'foundations/optimized-baseline',
                'precise-prefix-cache-routing.md':   'foundations/precise-prefix-cache-routing',
                'tiered-prefix-cache.md':            'foundations/tiered-prefix-cache',
                'pd-disaggregation.md':              'foundations/pd-disaggregation',
                'predicted-latency.md':              'foundations/predicted-latency',
                'wide-expert-parallelism.md':        'foundations/wide-expert-parallelism',
                // flow-control + workload-autoscaling now live in foundations/ (folded in from traffic-control/)
                'flow-control.md':                   'foundations/flow-control',
                'workload-autoscaling.md':            'foundations/workload-autoscaling',
                // workloads/
                'multimodal-serving.md':             'workloads/multimodal-serving',
                // workloads/batch-serving/ (README = the "Serve Batch Workloads" section landing page)
                'batch-serving.md':                  'workloads/batch-serving/README',
                'asynchronous-processing.md':        'workloads/batch-serving/asynchronous-processing',
                'batch-gateway.md':                  'workloads/batch-serving/batch-gateway',
                // legacy filename aliases
                'precise-prefix-cache-aware.md':     'foundations/precise-prefix-cache-routing',
                'predicted-latency-routing.md':      'foundations/predicted-latency',
                'wide-ep-lws.md':                    'foundations/wide-expert-parallelism',
                'experimental/batch-gateway.md':     'workloads/batch-serving/batch-gateway',
              };
              const guideDirToWellLitPath: Record<string, string> = {
                'agentic-serving': 'workloads/agentic-serving',
              };
              if (cleanPath.endsWith('/index.md') && parts.length > 2) {
                const wellLitSubPath = guideDirToWellLitPath[parts[1]];
                if (wellLitSubPath) {
                  return `https://github.com/llm-d/llm-d/blob/main/docs/well-lit-paths/${wellLitSubPath}.md`;
                }
                // Non Well-Lit directory content (e.g. recipes) still lives under guides/
                return `https://github.com/llm-d/llm-d/blob/main/${sourcePath}`;
              }
              const flatGuideName = parts.slice(1).join('/');
              // no-kubernetes-deployment moved out of well-lit-paths entirely in llm-d/llm-d#1836
              if (flatGuideName === 'no-kubernetes-deployment.md') {
                return 'https://github.com/llm-d/llm-d/blob/main/docs/infrastructure/no-kubernetes-deployment.md';
              }
              const wellLitSubPath = flatGuideToWellLitPath[flatGuideName];
              if (wellLitSubPath) {
                return `https://github.com/llm-d/llm-d/blob/main/docs/well-lit-paths/${wellLitSubPath}.md`;
              }
              // Fallback: derive path (for any unmapped guide files)
              const wellLitPath = sourcePath.replace(/^guides\//, 'docs/well-lit-paths/');
              return `https://github.com/llm-d/llm-d/blob/main/${wellLitPath}`;
            }

            // Gateway pages come from docs/infrastructure/gateway/ (moved from docs/resources/gateway/ in llm-d/llm-d#1836)
            if (cleanPath.startsWith('resources/gateway/')) {
              return `https://github.com/llm-d/llm-d/blob/main/docs/infrastructure/gateway/${sourcePath.replace(/^resources\/gateway\//, '')}`;
            }

            // Infra-provider pages come from docs/infrastructure/providers/ (moved from docs/infra-providers/ in llm-d/llm-d#1836)
            if (cleanPath.startsWith('resources/infra-providers/')) {
              if (cleanPath === 'resources/infra-providers/index.md') {
                return 'https://github.com/llm-d/llm-d/blob/main/docs/infrastructure/providers/README.md';
              }
              const providerName = cleanPath.replace(/^resources\/infra-providers\//, '').replace(/\.md$/, '');
              return `https://github.com/llm-d/llm-d/blob/main/docs/infrastructure/providers/${providerName}/README.md`;
            }

            // Renamed files: source file names differ from local file names
            // rdma moved from docs/resources/rdma/ to docs/infrastructure/rdma/ in llm-d/llm-d#1836
            if (cleanPath === 'resources/rdma/rdma-configuration.md') {
              return 'https://github.com/llm-d/llm-d/blob/main/docs/infrastructure/rdma/README.md';
            }
            if (cleanPath === 'architecture/advanced/autoscaling/workload-variant-autoscaling.md') {
              return 'https://github.com/llm-d/llm-d/blob/main/docs/architecture/advanced/autoscaling/hpa-wva.md';
            }
            if (cleanPath === 'architecture/advanced/autoscaling/igw-hpa.md') {
              return 'https://github.com/llm-d/llm-d/blob/main/docs/architecture/advanced/autoscaling/hpa-epp.md';
            }

            // Accelerators page is synced from docs/getting-started/accelerators.md (not docs/accelerators/)
            if (cleanPath === 'accelerators/index.md') {
              return 'https://github.com/llm-d/llm-d/blob/main/docs/getting-started/accelerators.md';
            }

            // Operations files were reorganized: site uses resources/operations/ but upstream uses operations/
            if (cleanPath.startsWith('resources/operations/')) {
              const opPath = cleanPath.replace(/^resources\/operations\//, '');
              const sourceFile = opPath === 'index.md' ? 'README.md' : opPath.replace(/\/index\.md$/, '/README.md');
              return `https://github.com/llm-d/llm-d/blob/main/docs/operations/${sourceFile}`;
            }

            // Infrastructure files: site uses resources/infrastructure/ but upstream uses infrastructure/
            if (cleanPath.startsWith('resources/infrastructure/')) {
              const infraPath = cleanPath.replace(/^resources\/infrastructure\//, '');
              const sourceFile = infraPath === 'index.md' ? 'README.md' : infraPath.replace(/\/index\.md$/, '/README.md');
              return `https://github.com/llm-d/llm-d/blob/main/docs/infrastructure/${sourceFile}`;
            }

            // getting-started/README was renamed to README.mdx on main
            if (cleanPath === 'getting-started/index.md') {
              return 'https://github.com/llm-d/llm-d/blob/main/docs/getting-started/README.mdx';
            }

            // getting-started/artifacts.md was moved to api-reference/artifacts.md on main
            if (cleanPath === 'getting-started/artifacts.md') {
              return 'https://github.com/llm-d/llm-d/blob/main/docs/api-reference/artifacts.md';
            }

            // llm-d#1542: monitoring/ renamed to observability/ on main. Release doc
            // branches may still build legacy resources/monitoring/* paths.
            // llm-d#1836: observability moved from docs/resources/observability/ to docs/operations/observability/.
            if (cleanPath.startsWith('resources/monitoring/')) {
              const observabilityFile = cleanPath.replace(
                /^resources\/monitoring\//,
                '',
              );
              return `https://github.com/llm-d/llm-d/blob/main/docs/operations/observability/${observabilityFile}`;
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
              return `https://github.com/llm-d/llm-d/blob/main/docs/operations/observability/${sourceFile}`;
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
      id: 'llm-d-v0-8-release',
      content:
        '🎉 <b>llm-d 0.8 is here!</b> Multimodal, batch &amp; flow-control graduate to production, with broader accelerator support and initial RL. <a target="_self" rel="noopener noreferrer" href="/docs/getting-started/quickstart"><b>See what\'s new →</b></a>',
      backgroundColor: '#000000',
      textColor: '#fff',
      isCloseable: true,
    },
    navbar: {
      logo: {
        alt: 'llm-d',
        src: 'img/llm-d-logotype-and-icon.svg',
        srcDark: 'img/llm-d-logotype-and-icon.svg',
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
      // Mirror of the main app's footer (docusaurus.config.js) so the same
      // columns + Social/CNCF block appear on every page in every Docusaurus
      // instance. Asset paths are absolute (/img/...) so they resolve from
      // the root deploy regardless of which baseUrl this build runs at.
      links: [
        {
          title: 'Documentation',
          items: [
            {html: '<a href="/docs/getting-started" class="footer__link-item">Getting Started</a>'},
            {html: '<a href="/docs/architecture" class="footer__link-item">Architecture</a>'},
            {html: '<a href="/docs/guides" class="footer__link-item">Guides</a>'},
          ],
        },
        {
          title: 'Community',
          items: [
            {html: '<a href="/community" class="footer__link-item">Contact us</a>'},
            {html: '<a href="/community/contribute" class="footer__link-item">Contributing</a>'},
            {html: '<a href="/community/code-of-conduct" class="footer__link-item">Code of Conduct</a>'},
          ],
        },
        {
          title: 'More',
          items: [
            {html: '<a href="/blog" class="footer__link-item">Blog</a>'},
            {label: 'Privacy Policy', href: 'https://www.redhat.com/en/about/privacy-policy'},
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
      copyright: `Copyright © ${new Date().getFullYear()} llm-d project. Apache 2.0 License.<br />\
        We are a Cloud Native Computing Foundation sandbox project.<br />\
        For website terms of use, trademark policy and other project policies please see <a href="https://lfprojects.org/policies/" target="_blank" rel="noreferrer noopener">https://lfprojects.org/policies/</a>`,
      logo: {
        alt: "llm-d Logo",
        src: "img/cncf-white.png",
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
