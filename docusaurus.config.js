// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import { themes as prismThemes } from "prism-react-renderer";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "llm-d Website",
  tagline: "Powered by Docusaurus",
  favicon: "img/llm-d-favicon.png",

  // Set the production url of your site here
  //url: "https://kproche.github.io/",
  // url: "https://jessicachitas.github.io/",
  url: "https://llm-d.github.io/",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  //baseUrl: "/",
    baseUrl: "/webdocs/",

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
  projectName: "webdocs", // Usually your repo name.

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
  markdown: { mermaid: true },
  themes: ["@docusaurus/theme-mermaid"],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      navbar: {
        // title: "My Site",
        logo: {
          alt: "llm-d Logo",
          src: "img/llm-d-icon.png",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "guideSidebar",
            position: "left",
            label: "User Guide",
          },
          {
            type: "docSidebar",
            sidebarId: "structureSidebar",
            position: "left",
            label: "What is llm-d?",
          },
          {
            type: "docSidebar",
            sidebarId: "commSidebar",
            position: "left",
            label: "Community",
          },
          { to: "/blog", label: "News", position: "left" },
          //{ to: "./community", label: "Community", position: "left"},
          {
            href: "https://github.com/llm-d/llm-d-website.github.io/tree/main/",
            label: "GitHub",
            position: "right",
          },
        ],
      },

      // Config for footer here
      footer: {
        style: "dark",
        links: [
          {
            title: "User Guide",
            items: [
              {
                label: "How to Use",
                to: "docs/guide",
              },
            ],
          },
          {
            title: "Architecture",
            items: [
              {
                label: "Overview",
                to: "docs/architecture",
              },
              {
                label: "FAQ",
                to: "docs/architecture/faq.md",
              },
            ],
          },
          {
            title: "Community",
            items: [
              {
                label: "How to Join in",
                href: "docs/community",
              },
              {
                label: "Partners",
                href: "docs/partners",
              },
              //     {
              //       label: "X",
              //       href: "https://x.com/docusaurus",
              //     },
            ],
          },
          {
            title: "More",
            items: [
              {
                label: "News",
                to: "/blog",
              },
              {
                label: "GitHub",
                href: "https://github.com/llm-d/llm-d-website.github.io/tree/main/",
              },
            ],
          },
          {
            title: "Social",
            items: [
              {
                label: "LinkedIn",
                href: "https://linkedin.com/company/llm-d",
              },
              {
                label: "Slack",
                href: "https://llm-d.slack.com",
              },
              {
                label: "GitHub",
                href: "https://github.com/llm-d/llm-d-website.github.io/tree/main/",
              },
              {
                label: "X"
                href: "https://x.com/_llm_d_",
              },
            ],
          },
        ],
        // copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.vsLight,
        darkTheme: prismThemes.vsDark,
      },
    }),
};

export default config;
