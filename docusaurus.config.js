// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import { themes as prismThemes } from "prism-react-renderer";
import remoteContentPlugins from "./remote-content/remote-content.js";


// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "llm-d",
  tagline: "Powered by Docusaurus",
  favicon: "img/llm-d-favicon.png",

  // Set the production url of your site here
  //url: "https://kproche.github.io/",
  // url: "https://jessicachitas.github.io/",
  url: "https://llm-d.ai/",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  //baseUrl: "/llm-d.github.io/",
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.

  //IF YOU ARE DEPLOYING PREVIEW PAGES via GITHUB PAGES FOR THE MAIN REPO
  // UNCOMMENT THE NEXT TWO LINES AND COMMENT OUT THE FORK SECTION BELOW
  organizationName: "llm-d", // Usually your GitHub org/user name.
  //projectName: "webdocs", // Usually your repo name.

  //IF YOU ARE DEPLOYING PREVIEW PAGES VIA GITHUB PAGES FOR A BRANCH OF A FORK IN YOUR ACCOUNT
  //EDIT THESE LINES APPROPRIATELY
  //organizationName: "jessicachitas", // Usually your GitHub org/user name.
  //organizationName: "kproche", // Usually your GitHub org/user name.
  projectName: "llm-d.github.io", // Usually your repo name.
  deploymentBranch: "gh-pages",

  trailingSlash: false,
  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: "./sidebars.js",
          sidebarCollapsible: false,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          //  editUrl:
          //    "https://github.com/llm-d/llm-d-website.github.io/tree/main/",
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ["rss", "atom"],
            xslt: true,
          },

          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          //  editUrl:
          //  "https://github.com/llm-d/llm-d-website.github.io/tree/main/",

          // Useful options to enforce blogging best practices
          onInlineTags: "warn",
          onInlineAuthors: "warn",
          onUntruncatedBlogPosts: "warn",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      }),
    ],
  ],

  // Client modules - run on every page
  clientModules: [
    require.resolve('./src/clientModules/analytics.js'),
  ],
  
  // Plugins configuration
  plugins: [
    // Remote content plugins (managed independently)
    ...remoteContentPlugins,

    // Other site plugins
    [
      require.resolve("docusaurus-lunr-search"),
      {
        languages: ["en"],
      },
    ],

    // Examples:
    // ['@docusaurus/plugin-google-analytics', { trackingID: 'UA-XXXXXX-X' }],
    // ['docusaurus-plugin-sass', {}],
    // Add any other plugins you need
  ],
  
  markdown: { mermaid: true },
  themes: ["@docusaurus/theme-mermaid"],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      
      // Announcement banner for v0.2 release
      announcementBar: {
        id: 'llm-d-v0-3-release',
        content:
          '🎉 <b>llm-d 0.3 is now released!</b> Check out high scale DeepSeek serving with wide expert-parallelism, predicted latency balancing, and better prefix cache routing. <a target="_self" rel="noopener noreferrer" href="/blog/llm-d-v0.3-expanded-hardware-faster-perf-and-igw-ga"><b>Read the announcement →</b></a>',
        backgroundColor: '#7f317f',
        textColor: '#fff',
        isCloseable: true,
      },

      navbar: {
        // title: "My Site",
        logo: {
          alt: "llm-d Logo",
          src: "img/llm-d-icon.png",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "structureSidebar",
            position: "left",
            label: "What is llm-d?",
          },
          {
            type: "docSidebar",
            sidebarId: "guideSidebar",
            position: "left",
            label: "Guides",
          },
          {
            type: "docSidebar",
            sidebarId: "commSidebar",
            position: "left",
            label: "Community",
          },
          { to: "/blog", label: "Blog", position: "left" },
          {
            type: 'html',
            position: 'right',
            value: '<iframe src="https://ghbtns.com/github-btn.html?user=llm-d&repo=llm-d&type=star&count=true&size=large" frameborder="0" scrolling="0" width="170" height="30" title="GitHub Star" style="vertical-align: middle;"></iframe>',
          },
        ],
      },

      // Config for footer here
      footer: {
        style: "dark",
        links: [
          {
            title: "Architecture",
            items: [
              {
                label: "Overview",
                to: "docs/architecture",
              },
              {
                label: "Inference Scheduler",
                to: "docs/architecture/Components/inference-scheduler",
              },
              {
                label: "KV Cache Manager",
                to: "docs/architecture/Components/kv-cache-manager",
              },
              {
                label: "Model Service",
                to: "docs/architecture/Components/modelservice",
              },
              {
                label: "Benchmark Tools",
                to: "docs/architecture/Components/benchmark",
              },
            ],
          },
          {
            title: "Guides",
            items: [
              {
                label: "Getting Started",
                to: "docs/guide",
              },
              {
                label: "Prerequisites",
                to: "docs/guide/Installation/prerequisites",
              },
              {
                label: "Inference Scheduling",
                to: "docs/guide/Installation/inference-scheduling",
              },
              {
                label: "Prefill/Decode Disaggregation",
                to: "docs/guide/Installation/pd-disaggregation",
              },
              {
                label: "Wide Expert Parallelism",
                to: "docs/guide/Installation/wide-ep-lws",
              },
            ],
          },
          {
            title: "Community",
            items: [
              {
                label: "Contact us",
                href: "/docs/community",
              },

              { 
                label: "Contributing",
                href: "/docs/community/contribute"
              },
              {
                label: "Code of Conduct",
                href: "/docs/community/code-of-conduct",
              },
            ],
          },
          {
            title: "More",
            items: [
              {
                label: "Blog",
                to: "/blog",
              },
              {
                label: "Privacy Policy",
                href: "https://www.redhat.com/en/about/privacy-policy",
              },
            ],
          },
          {
            title: "Social",
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
                    <a href="https://x.com/_llm_d_" target="_blank" rel="noreferrer noopener" aria-label="X / Twitter">
                      <img src="/img/new-social/x-mark-white.png" alt="X / Twitter" />
                    </a>
                  </div>
                  <div class="footer-socials-cta">
                    <a href="/slack" target="_self" rel="noreferrer noopener" aria-label="Join our Slack">
                      <span class="button-link">Join our Slack</span>
                      <img src="/img/new-social/inviter-logo.png" alt="Slack Invite" />
                    </a>
                  </div>
                </div>
              `,
              },
            ],
          },
        ],
      },
      prism: {
        theme: prismThemes.vsLight,
        darkTheme: prismThemes.vsDark,
        additionalLanguages: ['yaml'],
      },
    }),
};

export default config;


