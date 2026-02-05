#!/usr/bin/env node

/**
 * Image Verifier - Crawls a website and verifies all images load correctly
 * 
 * Usage: node tests/image_verifier.js --url http://localhost:3000
 * 
 * This script:
 * 1. Crawls all pages starting from the base URL
 * 2. Extracts all <img src="..."> and CSS background-image references
 * 3. Verifies each image returns HTTP 200
 * 4. Reports broken images with page URL and image path
 * 5. Exits with code 1 if any broken images found
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Parse command line arguments
const args = process.argv.slice(2);
const urlIndex = args.indexOf('--url');
const baseUrl = urlIndex !== -1 ? args[urlIndex + 1] : 'http://localhost:3000';

// Track visited pages and found images
const visitedPages = new Set();
const checkedImages = new Set();
const brokenImages = [];
const workingImages = [];

// Pages to crawl (queue)
const pagesToVisit = [];

/**
 * Fetch a URL and return the response body
 * Follows redirects (3xx responses) up to maxRedirects times
 */
async function fetchUrl(url, expectHtml = false, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.get(url, { timeout: 10000 }, (res) => {
      // Handle redirects (3xx status codes)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) {
          resolve({ statusCode: res.statusCode, error: 'Too many redirects' });
          return;
        }
        // Follow the redirect
        res.resume(); // Consume response to free socket
        const redirectUrl = new URL(res.headers.location, url).href;
        fetchUrl(redirectUrl, expectHtml, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      // For images, we just need to check status code
      if (!expectHtml) {
        // Consume the response to free up the socket
        res.resume();
        resolve({ statusCode: res.statusCode, contentType: res.headers['content-type'] });
        return;
      }
      
      // For HTML pages, collect the body
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body, contentType: res.headers['content-type'] }));
    });
    
    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Extract image sources from HTML
 */
function extractImages(html, pageUrl) {
  const images = new Set();
  
  // Match <img src="..."> tags
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    if (src && !src.startsWith('data:')) {
      images.add(resolveUrl(src, pageUrl));
    }
  }
  
  // Match CSS background-image: url(...)
  const bgRegex = /background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)/gi;
  while ((match = bgRegex.exec(html)) !== null) {
    const src = match[1];
    if (src && !src.startsWith('data:')) {
      images.add(resolveUrl(src, pageUrl));
    }
  }
  
  // Match srcset attributes
  const srcsetRegex = /srcset=["']([^"']+)["']/gi;
  while ((match = srcsetRegex.exec(html)) !== null) {
    const srcset = match[1];
    // srcset can have multiple URLs separated by commas
    srcset.split(',').forEach(entry => {
      const src = entry.trim().split(/\s+/)[0];
      if (src && !src.startsWith('data:')) {
        images.add(resolveUrl(src, pageUrl));
      }
    });
  }
  
  return images;
}

/**
 * Extract internal links from HTML for crawling
 */
function extractLinks(html, pageUrl) {
  const links = new Set();
  const baseUrlObj = new URL(baseUrl);
  
  // Match <a href="..."> tags
  const linkRegex = /<a[^>]+href=["']([^"'#]+)["']/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (href) {
      try {
        const resolved = resolveUrl(href, pageUrl);
        const resolvedUrl = new URL(resolved);
        
        // Only follow internal links
        if (resolvedUrl.hostname === baseUrlObj.hostname) {
          // Skip non-HTML resources
          const path = resolvedUrl.pathname.toLowerCase();
          if (!path.match(/\.(png|jpg|jpeg|gif|svg|webp|pdf|css|js|ico|woff|woff2|ttf|eot)$/)) {
            links.add(resolved.split('#')[0]); // Remove hash
          }
        }
      } catch (e) {
        // Invalid URL, skip
      }
    }
  }
  
  return links;
}

/**
 * Resolve a potentially relative URL against a base URL
 */
function resolveUrl(src, pageUrl) {
  try {
    return new URL(src, pageUrl).href;
  } catch (e) {
    return src;
  }
}

/**
 * Check if an image URL is valid (returns HTTP 200)
 */
async function checkImage(imageUrl, sourcePageUrl) {
  if (checkedImages.has(imageUrl)) {
    return; // Already checked
  }
  checkedImages.add(imageUrl);
  
  try {
    const response = await fetchUrl(imageUrl, false);
    
    if (response.statusCode === 200) {
      workingImages.push({ url: imageUrl, source: sourcePageUrl });
    } else {
      brokenImages.push({
        url: imageUrl,
        source: sourcePageUrl,
        status: response.statusCode
      });
    }
  } catch (err) {
    brokenImages.push({
      url: imageUrl,
      source: sourcePageUrl,
      error: err.message
    });
  }
}

/**
 * Crawl a page and extract images and links
 */
async function crawlPage(pageUrl) {
  if (visitedPages.has(pageUrl)) {
    return;
  }
  visitedPages.add(pageUrl);
  
  try {
    const response = await fetchUrl(pageUrl, true);
    
    if (response.statusCode !== 200) {
      console.log(`  ⚠️  Skipping ${pageUrl} (status ${response.statusCode})`);
      return;
    }
    
    // Only process HTML pages
    if (!response.contentType || !response.contentType.includes('text/html')) {
      return;
    }
    
    console.log(`  📄 Crawling: ${pageUrl}`);
    
    // Extract and check images
    const images = extractImages(response.body, pageUrl);
    for (const imageUrl of images) {
      await checkImage(imageUrl, pageUrl);
    }
    
    // Extract links for further crawling
    const links = extractLinks(response.body, pageUrl);
    for (const link of links) {
      if (!visitedPages.has(link) && !pagesToVisit.includes(link)) {
        pagesToVisit.push(link);
      }
    }
  } catch (err) {
    console.log(`  ❌ Error crawling ${pageUrl}: ${err.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\n🔍 Image Verifier');
  console.log('='.repeat(50));
  console.log(`Base URL: ${baseUrl}\n`);
  
  // Start crawling from the base URL
  pagesToVisit.push(baseUrl);
  
  // Also add common entry points
  const commonPages = [
    '/blog',
    '/docs/architecture',
    '/docs/guide',
    '/docs/community',
    '/videos'
  ];
  
  for (const page of commonPages) {
    try {
      const fullUrl = new URL(page, baseUrl).href;
      if (!pagesToVisit.includes(fullUrl)) {
        pagesToVisit.push(fullUrl);
      }
    } catch (e) {
      // Invalid URL, skip
    }
  }
  
  // Crawl all pages
  while (pagesToVisit.length > 0) {
    const pageUrl = pagesToVisit.shift();
    await crawlPage(pageUrl);
  }
  
  // Report results
  console.log('\n' + '='.repeat(50));
  console.log('📊 Results\n');
  
  console.log(`Pages crawled: ${visitedPages.size}`);
  console.log(`Images checked: ${checkedImages.size}`);
  console.log(`Working images: ${workingImages.length}`);
  console.log(`Broken images: ${brokenImages.length}`);
  
  if (brokenImages.length > 0) {
    console.log('\n❌ Broken Images:\n');
    for (const img of brokenImages) {
      console.log(`  Image: ${img.url}`);
      console.log(`  Found on: ${img.source}`);
      if (img.status) {
        console.log(`  Status: ${img.status}`);
      }
      if (img.error) {
        console.log(`  Error: ${img.error}`);
      }
      console.log('');
    }
    
    console.log(`\n💥 FAILED: ${brokenImages.length} broken image(s) found\n`);
    process.exit(1);
  } else {
    console.log('\n✅ PASSED: All images are working\n');
    process.exit(0);
  }
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
