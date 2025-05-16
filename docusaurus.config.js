// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import { themes as prismThemes } from "prism-react-renderer";

//import GHiconUrl from "./docs/assets/github-mark-white.svg";
//import LIiconURL from "./docs/assets/linkedin-mark-white.svg";
//import SlackiconURL from "./docs/assets/slack-mark-white.png";
//import RedditiconURL from "./docs/assets/reddit-mark-white-png";
//import XiconURL from "./docs/assets/x-mark-white.png";



// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "llm-d",
  tagline: "Powered by Docusaurus",
  favicon: "img/llm-d-favicon.png",

  // Set the production url of your site here
  //url: "https://kproche.github.io/",
  // url: "https://jessicachitas.github.io/",
  url: "https://llm-d.github.io/",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
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
            sidebarId: "structureSidebar",
            position: "left",
            label: "What is llm-d?",
          },
          {
            type: "docSidebar",
            sidebarId: "guideSidebar",
            position: "left",
            label: "User Guide",
          },
          {
            type: "docSidebar",
            sidebarId: "commSidebar",
            position: "left",
            label: "Community",
          },
          { to: "/blog", label: "News", position: "left" },
          {
            href: "https://github.com/llm-d/webdocs",
            position: "right",
            className: "github",
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
                to: "docs/architecture/architecture",
              },
/*              {
                label: "FAQ",
                to: "docs/architecture/faq.md",
              },
*/
              ],
          },
          {
            title: "Community",
            items: [
              {
                label: "Contact us",
                href: "/docs/community/contact_us",
              },

              { 
                label: "Contributing",
                href: "/docs/community/contribute"
              },
              {
                label: "Code of Conduct",
                href: "https://github.com/llm-d/llm-d/blob/dev/CODE_OF_CONDUCT.md",
              },
  
              {
                  label: "X",
                  href: "https://x.com/docusaurus",
              },
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
                html: `
                <a href="https://github.com/llm-d/" target="_blank" rel="noreferrer noopener" aria-label="GitHub Icon">
                  <img class="github-footer" 
                  src="https://raw.githubusercontent.com/KPRoche/iconography/refs/heads/main/assets/github-mark-white.png" 
                  alt="GitHub Icon" width="30px" height="auto" margin="5px"/>
                </a>
              `,
              },
            ],
          },
          {
            title: "Social",
            items: [
              {
                html: `
                <a href="https://linkedin.com/company/llm-d" target="_blank" rel="noreferrer noopener" aria-label="LinkedIn Icon">
                  <img 
                    class="linkedin" 
                    src="https://raw.githubusercontent.com/KPRoche/iconography/refs/heads/main/assets/linkedin-mark-white.png" 
                    alt="LinkedIn Icon" 
                    width="30px" 
                    height="auto" 
                    margin="5px"/>

                </a>
              `,
              },
              {
                html: `
                <a href="https://llm-d.slack.com" target="_blank" rel="noreferrer noopener" aria-label="Slack Icon">
                  <img class="slack" 
                  src="https://raw.githubusercontent.com/KPRoche/iconography/refs/heads/main/assets/slack-mark-white.png" 
                  alt="Slack Icon" width="30px" height="auto" margin="5px"/>
                </a>
              `,
              },
              {
                html: `
                <a href="https://www.reddit.com/r/llm_d/" target="_blank" rel="noreferrer noopener" aria-label="Reddit Icon">
                  <img class="reddit" 
                    src="https://raw.githubusercontent.com/KPRoche/iconography/refs/heads/main/assets/reddit-mark-white.png" 
                    alt="Reddit Icon" 
                    width="30px" 
                    height="auto" 
                    margin="5px"/>
                </a>
              `,
              },
              {
                html: `
                <a href="https://x.com/_llm_d_" target="_blank" rel="noreferrer noopener" aria-label="X Icon">
                  <img class="x" 
                  src="https://raw.githubusercontent.com/KPRoche/iconography/refs/heads/main/assets/x-mark-white.png" 
                  alt="X Icon" 
                  width="30px" 
                  height="auto" margin="5px"/>
                </a>
              `,
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

// {
//             title: "Social",
//             items: [
//               {
//                 className: "linkedin",
//                 href: "https://linkedin.com/company/llm-d",
//               },
//               {
//                 className: "slack",
//                 href: "https://llm-d.slack.com",
//               },
//               {
//                 className: "reddit",
//                 href: "https://www.reddit.com/r/llm_d/",
//               },
//               {
//                 className: "x",
//                 href: "https://x.com/_llm_d_",
//               },
//             ],
//           },
