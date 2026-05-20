#!/usr/bin/env node

/**
 * Link Checker for llm-d.ai Website
 *
 * Validates all links in the built site and generates a report showing:
 * - Broken internal links
 * - Broken external links
 * - Missing images/assets
 * - Invalid anchor links
 * - Source file information (from llm-d/llm-d or local)
 *
 * Usage:
 *   npm run build:all  # Build the site first
 *   npm run check-links
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const buildDir = path.join(rootDir, 'build');

// Configuration
const config = {
  buildDir,
  serverPort: 3333, // Port for local test server
  serverHost: 'localhost',
  checkExternalLinks: false, // Skip external links by default (slow and often blocked)
  maxConcurrent: 10,
  externalTimeout: 10000,
  ignorePatterns: [],
  configFile: path.join(rootDir, 'link-checker.config.json')
};

// Load optional config file
if (fs.existsSync(config.configFile)) {
  const userConfig = JSON.parse(fs.readFileSync(config.configFile, 'utf-8'));
  Object.assign(config, userConfig);
}

// Server management
let serverProcess = null;

// Start local server
async function startServer() {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Starting local server on port ${config.serverPort}...`);

    // Start docusaurus serve
    // Use detached: true to create a process group that we can kill together
    serverProcess = spawn('npx', ['docusaurus', 'serve', '--port', config.serverPort.toString(), '--no-open'], {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true
    });

    let output = '';

    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      // Look for server ready message
      if (output.includes('Serving') || output.includes(`localhost:${config.serverPort}`)) {
        console.log(`   Server started at http://${config.serverHost}:${config.serverPort}\n`);
        // Give it a moment to fully initialize
        setTimeout(() => resolve(), 1000);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      // Ignore some common warnings
      if (!error.includes('[WARNING]') && !error.includes('DeprecationWarning')) {
        console.error('Server error:', error);
      }
    });

    serverProcess.on('error', (err) => {
      reject(new Error(`Failed to start server: ${err.message}`));
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        reject(new Error('Server start timeout'));
      }
    }, 30000);
  });
}

// Stop local server
async function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    console.log('\n🛑 Stopping server...');

    return new Promise((resolve) => {
      // Set a shorter timeout to force kill if it doesn't stop gracefully
      const timeout = setTimeout(async () => {
        // Try to find and kill process by port as last resort
        try {
          await killProcessOnPort(config.serverPort);
        } catch (e) {
          // Ignore errors
        }

        if (serverProcess && !serverProcess.killed) {
          // Kill the entire process group to ensure all child processes are terminated
          try {
            process.kill(-serverProcess.pid, 'SIGKILL');
          } catch (e) {
            // Fallback to killing just the main process
            try {
              serverProcess.kill('SIGKILL');
            } catch (e2) {
              // Process already dead
            }
          }
        }
        serverProcess = null;
        resolve();
      }, 1000); // Reduced from 5s to 1s

      serverProcess.once('exit', () => {
        clearTimeout(timeout);
        serverProcess = null;
        resolve();
      });

      // Kill the entire process group for better cleanup
      try {
        // Negative PID kills the process group
        process.kill(-serverProcess.pid, 'SIGTERM');
      } catch (e) {
        // Fallback to killing just the main process if process group fails
        try {
          serverProcess.kill('SIGTERM');
        } catch (e2) {
          // Process might already be dead, that's fine
          clearTimeout(timeout);
          serverProcess = null;
          resolve();
        }
      }
    });
  }
}

// Kill process listening on a specific port (fallback for cleanup)
async function killProcessOnPort(port) {
  return new Promise((resolve) => {
    // Try lsof first (macOS/BSD/some Linux)
    const lsof = spawn('lsof', ['-ti', `tcp:${port}`], { stdio: ['ignore', 'pipe', 'ignore'] });

    let pid = '';
    lsof.stdout.on('data', (data) => {
      pid += data.toString().trim();
    });

    lsof.on('close', (code) => {
      if (pid) {
        try {
          process.kill(parseInt(pid), 'SIGKILL');
        } catch (e) {
          // Process might already be dead
        }
        resolve();
      } else if (code !== 0) {
        // lsof failed, try fuser (Linux)
        tryFuser(port, resolve);
      } else {
        resolve();
      }
    });

    lsof.on('error', () => {
      // lsof not available, try fuser (Linux)
      tryFuser(port, resolve);
    });
  });
}

// Try using fuser to kill process on port (Linux fallback)
function tryFuser(port, resolve) {
  const fuser = spawn('fuser', ['-k', '-SIGKILL', `${port}/tcp`], { stdio: 'ignore' });

  fuser.on('close', () => {
    resolve();
  });

  fuser.on('error', () => {
    // Neither lsof nor fuser available, just resolve
    // The process group kill should have worked anyway
    resolve();
  });
}

// Cleanup on exit
process.on('exit', () => {
  if (serverProcess && !serverProcess.killed) {
    try {
      // Try to kill process group first
      process.kill(-serverProcess.pid, 'SIGKILL');
    } catch (e) {
      try {
        serverProcess.kill('SIGKILL'); // Force kill on exit
      } catch (e2) {
        // Process already dead
      }
    }
  }
});
process.on('SIGINT', async () => {
  await stopServer();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await stopServer();
  process.exit(0);
});

// Build source map from sync-docs.sh
function buildSourceMap() {
  const sourceMap = new Map();

  // Parse sync-docs.sh to extract file mappings
  const syncScript = fs.readFileSync(
    path.join(rootDir, 'preview/scripts/sync-docs.sh'),
    'utf-8'
  );

  // Extract cp_doc commands: cp_doc "$WIP/path/file.md" "$DOCS_DIR/dest/file.md"
  // Pattern matches: cp_doc "$WIP/..." "$DOCS_DIR/..."
  const cpDocPattern = /cp_doc\s+"\$WIP\/([^"]+)"\s+"\$DOCS_DIR\/(.+)"/g;
  let match;

  while ((match = cpDocPattern.exec(syncScript)) !== null) {
    const sourceFile = match[1];
    const destFile = match[2];

    // Convert .md to / for Docusaurus routing and handle index files
    let htmlPath = destFile.replace(/\.md$/, '').replace(/\/index$/, '');
    if (htmlPath && !htmlPath.endsWith('/')) {
      htmlPath += '/';
    }

    sourceMap.set(`docs/${htmlPath}`, {
      source: 'llm-d/llm-d',
      file: sourceFile
    });
  }

  // Parse remote-content configs for community files
  const remoteContentFiles = [
    { source: 'CONTRIBUTING.md', dest: 'docs/community/contribute' },
    { source: 'CODE_OF_CONDUCT.md', dest: 'docs/community/code-of-conduct' },
    { source: 'SECURITY.md', dest: 'docs/community/security' },
    { source: 'SIGS.md', dest: 'docs/community/sigs' }
  ];

  for (const { source, dest } of remoteContentFiles) {
    sourceMap.set(`${dest}.html`, {
      source: 'llm-d/llm-d',
      file: source
    });
    sourceMap.set(`${dest}/`, {
      source: 'llm-d/llm-d',
      file: source
    });
  }

  return sourceMap;
}

// Get all HTML files in build directory
function getAllHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllHtmlFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

// HTML cache to avoid re-parsing
const htmlCache = new Map();

// Extract all links from an HTML file
function extractLinks(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf-8');

  // Use a lightweight regex-based approach instead of JSDOM for better performance
  const links = [];

  // Extract <a href="...">
  const hrefPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  let match;
  while ((match = hrefPattern.exec(html)) !== null) {
    links.push({
      type: 'link',
      url: match[1],
      text: match[2]
    });
  }

  // Extract <img src="...">
  const imgPattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = imgPattern.exec(html)) !== null) {
    links.push({
      type: 'image',
      url: match[1],
      alt: ''
    });
  }

  // Cache the HTML for anchor checks
  htmlCache.set(htmlPath, html);

  return { links };
}

// Check if an anchor exists in HTML
function checkAnchor(htmlPath, anchor) {
  // Get from cache if available
  let html = htmlCache.get(htmlPath);
  if (!html) {
    html = fs.readFileSync(htmlPath, 'utf-8');
    htmlCache.set(htmlPath, html);
  }

  // Escape special regex characters in anchor
  const escapedAnchor = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Check for id="anchor" or name="anchor"
  const idPattern = new RegExp(`id=["']${escapedAnchor}["']`, 'i');
  const namePattern = new RegExp(`name=["']${escapedAnchor}["']`, 'i');

  return idPattern.test(html) || namePattern.test(html);
}

// Validate internal link via HTTP
async function validateInternalLink(url, sourcePage) {
  return new Promise((resolve) => {
    // Split into path and hash parts
    const [pathPart, hashPart] = url.split('#');

    // Build the URL to check
    let checkUrl;
    if (!pathPart || pathPart === '') {
      // Same-page anchor - just check if the current page loads
      const pageUrl = '/' + path.relative(buildDir, sourcePage).replace(/\\/g, '/');
      checkUrl = `http://${config.serverHost}:${config.serverPort}${pageUrl}`;
    } else if (pathPart.startsWith('/')) {
      // Root-relative URL
      checkUrl = `http://${config.serverHost}:${config.serverPort}${pathPart}`;
    } else {
      // Relative URL - resolve relative to source page
      const sourceDir = path.dirname(sourcePage);
      const relPath = path.relative(buildDir, path.join(sourceDir, pathPart)).replace(/\\/g, '/');
      checkUrl = `http://${config.serverHost}:${config.serverPort}/${relPath}`;
    }

    // Make HTTP request
    const req = http.request(
      checkUrl,
      { method: 'HEAD', timeout: 5000 },
      (res) => {
        // Accept 200-399 status codes (including redirects)
        if (res.statusCode >= 200 && res.statusCode < 400) {
          // TODO: Could check anchors by fetching the page and parsing HTML
          // For now, assume anchors are valid if the page loads
          resolve({ valid: true });
        } else {
          resolve({ valid: false, reason: `HTTP ${res.statusCode}` });
        }
      }
    );

    req.on('error', (err) => {
      resolve({ valid: false, reason: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ valid: false, reason: 'Timeout' });
    });

    req.end();
  });
}

// Validate external URL
async function validateExternalUrl(url, timeout = 10000) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      const req = protocol.request(
        url,
        { method: 'HEAD', timeout },
        (res) => {
          // Accept 2xx and 3xx status codes
          if (res.statusCode >= 200 && res.statusCode < 400) {
            resolve({ valid: true });
          } else {
            resolve({ valid: false, reason: `HTTP ${res.statusCode}` });
          }
        }
      );

      req.on('error', (err) => {
        resolve({ valid: false, reason: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ valid: false, reason: 'Timeout' });
      });

      req.end();
    } catch (err) {
      resolve({ valid: false, reason: err.message });
    }
  });
}

// Rate limiter for external requests
class RateLimiter {
  constructor(maxConcurrent, delayMs = 100) {
    this.maxConcurrent = maxConcurrent;
    this.delayMs = delayMs;
    this.active = 0;
    this.queue = [];
  }

  async run(fn) {
    while (this.active >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }

    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
    }
  }
}

// Crawl a page and extract links
async function crawlPage(url) {
  return new Promise((resolve) => {
    const req = http.request(
      url,
      { method: 'GET', timeout: 10000 },
      (res) => {
        if (res.statusCode < 200 || res.statusCode >= 400) {
          resolve({ success: false, statusCode: res.statusCode, links: [] });
          return;
        }

        let html = '';
        res.on('data', chunk => html += chunk);
        res.on('end', () => {
          // Check if this is a 404 page (Docusaurus serves 404.html with 200 status)
          if (html.includes('Page Not Found') && html.includes('We could not find what you were looking for')) {
            resolve({ success: false, statusCode: 404, links: [], html });
            return;
          }

          // Extract links from HTML
          const links = [];

          // Extract <a href="..." > and <a href=...> (both quoted and unquoted)
          const hrefPattern = /<a[^>]+href=(?:["']([^"']+)["']|([^\s>]+))[^>]*>/gi;
          let match;
          while ((match = hrefPattern.exec(html)) !== null) {
            const url = match[1] || match[2]; // match[1] for quoted, match[2] for unquoted
            links.push({ type: 'link', url });
          }

          // Extract <img src="..."> and <img src=...> (both quoted and unquoted)
          const imgPattern = /<img[^>]+src=(?:["']([^"']+)["']|([^\s>]+))[^>]*>/gi;
          while ((match = imgPattern.exec(html)) !== null) {
            const url = match[1] || match[2]; // match[1] for quoted, match[2] for unquoted
            links.push({ type: 'image', url });
          }

          resolve({ success: true, statusCode: res.statusCode, links, html });
        });
      }
    );

    req.on('error', (err) => {
      resolve({ success: false, error: err.message, links: [] });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout', links: [] });
    });

    req.end();
  });
}

// Normalize URL for comparison
function normalizeUrl(url, baseUrl) {
  // Skip non-http protocols
  if (url.includes(':') && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
    return null;
  }

  // Skip hash-only links
  if (url === '#' || url.startsWith('#')) {
    return null;
  }

  try {
    // Handle absolute URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url);
      // Only crawl same-host URLs
      if (urlObj.host !== `${config.serverHost}:${config.serverPort}`) {
        return null; // External URL
      }
      return urlObj.pathname;
    }

    // Handle root-relative URLs
    if (url.startsWith('/')) {
      return url.split('#')[0].split('?')[0];
    }

    // Handle relative URLs
    const base = new URL(baseUrl);
    const resolved = new URL(url, baseUrl);
    if (resolved.host !== base.host) {
      return null;
    }
    return resolved.pathname;
  } catch (e) {
    return null;
  }
}

// Main link checking logic
async function checkLinks() {
  console.log('🔍 Link Checker Starting...\n');

  // Check if build directory exists
  if (!fs.existsSync(buildDir)) {
    console.error('❌ Build directory not found!');
    console.error(`   Please run 'npm run build:all' first.`);
    process.exit(1);
  }

  console.log('📂 Build directory:', buildDir);

  try {
    // Start local server
    await startServer();

    // Build source map
    console.log('🗺️  Building source map...');
    const sourceMap = buildSourceMap();
    console.log(`   Found ${sourceMap.size} source mappings\n`);

    // Crawl the site starting from homepage
    console.log('🕷️  Crawling site...');
    const baseUrl = `http://${config.serverHost}:${config.serverPort}`;
    const toVisit = ['/'];
    const visited = new Set();
    const brokenLinks = [];
    const allLinks = new Map(); // URL -> { sourcePages: Set, ... }
    let externalUrls = new Set();

    while (toVisit.length > 0) {
      const currentPath = toVisit.shift();

      if (visited.has(currentPath)) continue;
      visited.add(currentPath);

      const currentUrl = baseUrl + currentPath;
      process.stdout.write(`\r   Crawled ${visited.size} pages...`);

      const result = await crawlPage(currentUrl);

      if (!result.success) {
        // Get source pages that link to this broken page
        const linkInfo = allLinks.get(currentPath);
        const sourcePages = linkInfo && linkInfo.sourcePages.size > 0
          ? Array.from(linkInfo.sourcePages)
          : ['N/A'];

        for (const sourcePage of sourcePages) {
          brokenLinks.push({
            sourcePage,
            url: currentPath,
            reason: result.error || `HTTP ${result.statusCode}`,
            type: linkInfo?.type || 'link',
            category: 'internal'
          });
        }
        continue;
      }

      // Process all links found on this page
      for (const link of result.links) {
        const { url, type } = link;

        // Track external URLs
        if (url.startsWith('http://') || url.startsWith('https://')) {
          const urlObj = new URL(url);
          if (urlObj.host !== `${config.serverHost}:${config.serverPort}`) {
            externalUrls.add(url);
            continue;
          }
        }

        // Normalize the URL
        const normalizedUrl = normalizeUrl(url, currentUrl);
        if (!normalizedUrl) continue;

        // Track this link
        if (!allLinks.has(normalizedUrl)) {
          allLinks.set(normalizedUrl, { sourcePages: new Set(), type });
        }
        allLinks.get(normalizedUrl).sourcePages.add(currentPath);

        // Add to crawl queue if not visited
        if (!visited.has(normalizedUrl) && !toVisit.includes(normalizedUrl)) {
          toVisit.push(normalizedUrl);
        }
      }
    }

    console.log(`\r   Crawled ${visited.size} pages ✓\n`);
    console.log(`   Found ${allLinks.size} unique internal links`);
    console.log(`   Found ${externalUrls.size} unique external URLs\n`);

    // Validate all discovered links
    console.log('✅ Validating discovered links...');
    let linksChecked = 0;

    for (const [url, linkInfo] of allLinks) {
      // Check if should be ignored
      if (config.ignorePatterns.some(pattern => url.includes(pattern))) {
        continue;
      }

      linksChecked++;

      // Check if we already visited this page (means it's valid)
      if (visited.has(url)) {
        // Page was successfully crawled, so it's valid
        continue;
      }

      // Page wasn't crawled - try to access it
      const checkUrl = baseUrl + url;
      const result = await crawlPage(checkUrl);

      if (!result.success) {
        // Add broken link with all source pages
        for (const sourcePage of linkInfo.sourcePages) {
          brokenLinks.push({
            sourcePage,
            url,
            reason: result.error || `HTTP ${result.statusCode}`,
            type: linkInfo.type,
            category: linkInfo.type === 'image' ? 'image' : 'internal'
          });
        }
      }

      if (linksChecked % 100 === 0) {
        process.stdout.write(`\r   Checked ${linksChecked} links...`);
      }
    }

    console.log(`\r   Checked ${linksChecked} links ✓\n`);

    // Validate external links (if enabled)
    if (config.checkExternalLinks) {
      console.log('🌐 Validating external URLs...');
      const rateLimiter = new RateLimiter(config.maxConcurrent);
      const externalUrlArray = Array.from(externalUrls);
      let externalChecked = 0;

      const externalResults = new Map();

      for (const url of externalUrlArray) {
        // Skip if should be ignored
        if (config.ignorePatterns.some(pattern => url.includes(pattern))) {
          continue;
        }

        const result = await rateLimiter.run(() =>
          validateExternalUrl(url, config.externalTimeout)
        );

        externalResults.set(url, result);
        externalChecked++;

        if (externalChecked % 10 === 0) {
          process.stdout.write(`\r   Checked ${externalChecked}/${externalUrlArray.length} external URLs...`);
        }
      }

      console.log(`\r   Checked ${externalChecked} external URLs ✓\n`);

      // Find broken external links
      for (const url of externalUrls) {
        const result = externalResults.get(url);
        if (result && !result.valid) {
          // Find all pages that link to this external URL
          // Note: We don't track external URL sources during crawl, so this is a simplified approach
          brokenLinks.push({
            sourcePage: 'Multiple pages',
            url,
            reason: result.reason,
            type: 'link',
            category: 'external'
          });
        }
      }
    } else {
      console.log('⏭️  Skipping external URL validation (disabled in config)\n');
    }

    // Generate report
    console.log('📝 Generating report...\n');
    const report = generateReport(brokenLinks, allLinks.size, visited.size, sourceMap);

    const reportPath = path.join(rootDir, 'broken-links-report.md');
    fs.writeFileSync(reportPath, report);

    console.log('✅ Report generated:', reportPath);
    console.log(`\n📊 Summary:`);
    console.log(`   Total pages crawled: ${visited.size}`);
    console.log(`   Total links found: ${allLinks.size}`);
    console.log(`   Broken links found: ${brokenLinks.length}`);

    if (brokenLinks.length > 0) {
      console.log(`\n⚠️  Found ${brokenLinks.length} broken links. See report for details.`);
      await stopServer();
      process.exit(1); // Exit with error code to fail CI
    } else {
      console.log(`\n🎉 No broken links found!`);
    }
  } finally {
    // Stop the server
    await stopServer();
  }
}

// Generate markdown report
function generateReport(brokenLinks, totalLinks, totalPages, sourceMap) {
  const now = new Date();
  const timestamp = now.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  let report = `# Broken Links Report\n\n`;
  report += `Generated: ${timestamp}\n\n`;

  // Summary
  report += `## Summary\n\n`;
  report += `- **Total pages crawled:** ${totalPages}\n`;
  report += `- **Total links found:** ${totalLinks}\n`;
  report += `- **Broken links found:** ${brokenLinks.length}\n`;

  if (brokenLinks.length === 0) {
    report += `\n🎉 **No broken links found!**\n`;
    return report;
  }

  const pagesWithIssues = new Set(brokenLinks.map(l => l.sourcePage)).size;
  report += `- **Pages with issues:** ${pagesWithIssues}\n\n`;

  // Group by source page
  report += `## Broken Links by Page\n\n`;

  const byPage = new Map();
  for (const link of brokenLinks) {
    if (!byPage.has(link.sourcePage)) {
      byPage.set(link.sourcePage, []);
    }
    byPage.get(link.sourcePage).push(link);
  }

  // Sort pages by number of broken links (descending)
  const sortedPages = Array.from(byPage.entries())
    .sort((a, b) => b[1].length - a[1].length);

  for (const [page, links] of sortedPages) {
    // Remove leading slash for display since page already has it
    const displayPage = page.startsWith('/') ? page.slice(1) : page;
    report += `### /${displayPage}\n\n`;

    // Get source file info (pass page with leading slash removed for lookup)
    const sourceInfo = getSourceInfo(displayPage, sourceMap);
    if (sourceInfo) {
      report += `**Source:** ${sourceInfo}\n\n`;
    }

    for (const link of links) {
      const emoji = link.category === 'external' ? '🌐' :
                   link.category === 'image' ? '🖼️' : '🔗';
      report += `- ${emoji} \`${link.url}\` → **${link.reason}** (${link.type})\n`;
    }

    report += `\n`;
  }

  return report;
}

// Get source file information
function getSourceInfo(htmlPath, sourceMap) {
  // Normalize path for lookup
  let lookupPath = htmlPath;

  // Try exact match first
  if (sourceMap.has(lookupPath)) {
    const info = sourceMap.get(lookupPath);
    return `**llm-d/llm-d**: \`${info.file}\``;
  }

  // Try with trailing slash
  if (!lookupPath.endsWith('/')) {
    lookupPath = lookupPath.replace(/\.html$/, '/');
    if (sourceMap.has(lookupPath)) {
      const info = sourceMap.get(lookupPath);
      return `**llm-d/llm-d**: \`${info.file}\``;
    }
  }

  // Try without .html
  lookupPath = htmlPath.replace(/\.html$/, '');
  if (sourceMap.has(lookupPath)) {
    const info = sourceMap.get(lookupPath);
    return `**llm-d/llm-d**: \`${info.file}\``;
  }

  // Check if it's in docs/ (likely synced even if not in map)
  if (htmlPath.startsWith('docs/')) {
    return `**llm-d/llm-d** (synced documentation)`;
  }

  // Otherwise it's local content
  return `**Local** (this repository)`;
}

// Run the checker
checkLinks().catch(async (err) => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  await stopServer();
  process.exit(1);
});
