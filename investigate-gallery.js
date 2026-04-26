import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function investigateGallery() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const evidence = {
    consoleLogs: [],
    networkRequests: [],
    albumsData: null,
    themesData: null,
    timestamp: new Date().toISOString(),
    errors: []
  };

  // Capture console logs
  page.on('console', msg => {
    evidence.consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  // Capture network requests
  page.on('request', request => {
    evidence.networkRequests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType()
    });
  });

  page.on('response', async response => {
    const request = evidence.networkRequests.find(r => r.url === response.url());
    if (request) {
      request.status = response.status();
      request.statusText = response.statusText();
      
      // Capture Supabase responses
      if (response.url().includes('supabase.co')) {
        try {
          const body = await response.text();
          request.responseBody = body.substring(0, 5000); // Limit size
        } catch (e) {
          request.responseError = e.message;
        }
      }
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    evidence.errors.push({
      message: error.message,
      stack: error.stack
    });
  });

  try {
    console.log('Navigating to gallery page...');
    await page.goto('https://metmal-community-hub.vercel.app/gallery', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    console.log('Page loaded, waiting for data...');
    await page.waitForTimeout(3000);

    // Try to extract albums data
    console.log('Extracting albums data...');
    evidence.albumsData = await page.evaluate(() => {
      // Try multiple ways to get albums data
      const results = {
        windowAlbums: window.__ALBUMS_DATA__ || null,
        domAlbums: null,
        reactState: null
      };

      // Try to find albums in DOM
      const albumElements = document.querySelectorAll('[data-album-id], [data-testid*="album"]');
      if (albumElements.length > 0) {
        results.domAlbums = Array.from(albumElements).map(el => ({
          id: el.getAttribute('data-album-id') || el.id,
          text: el.textContent?.substring(0, 100)
        }));
      }

      // Try to find React state
      const root = document.getElementById('root');
      if (root && root._reactRootContainer) {
        results.reactState = 'React root found but state not accessible';
      }

      return results;
    });

    // Try to extract themes data
    console.log('Extracting themes data...');
    evidence.themesData = await page.evaluate(() => {
      return window.__THEMES_DATA__ || null;
    });

    // Get page content info
    console.log('Getting page content...');
    evidence.pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyText: document.body.innerText.substring(0, 1000),
        albumCount: document.querySelectorAll('[data-album-id], .album-card, [class*="album"]').length
      };
    });

    // Take screenshot
    console.log('Taking screenshot...');
    await page.screenshot({
      path: path.join(__dirname, '.sisyphus', 'evidence', 'gallery-investigation.png'),
      fullPage: true
    });

    console.log('Investigation complete!');
  } catch (error) {
    evidence.errors.push({
      message: error.message,
      stack: error.stack,
      phase: 'navigation'
    });
    console.error('Error during investigation:', error);
  } finally {
    await browser.close();

    // Save evidence
    const evidencePath = path.join(__dirname, '.sisyphus', 'evidence', 'gallery-investigation.json');
    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
    console.log(`Evidence saved to: ${evidencePath}`);

    // Print summary
    console.log('\n=== INVESTIGATION SUMMARY ===');
    console.log(`Console logs: ${evidence.consoleLogs.length}`);
    console.log(`Network requests: ${evidence.networkRequests.length}`);
    console.log(`Errors: ${evidence.errors.length}`);
    console.log(`Albums data: ${evidence.albumsData ? 'Found' : 'Not found'}`);
    console.log(`Themes data: ${evidence.themesData ? 'Found' : 'Not found'}`);
    
    // Check for target album
    const supabaseRequests = evidence.networkRequests.filter(r => r.url.includes('supabase.co'));
    console.log(`\nSupabase requests: ${supabaseRequests.length}`);
    
    const albumRequests = supabaseRequests.filter(r => r.url.includes('photo_albums'));
    console.log(`Album-related requests: ${albumRequests.length}`);
    
    if (albumRequests.length > 0) {
      console.log('\nAlbum requests:');
      albumRequests.forEach(req => {
        console.log(`  ${req.method} ${req.url.substring(0, 100)}...`);
        console.log(`  Status: ${req.status}`);
        if (req.responseBody) {
          console.log(`  Response preview: ${req.responseBody.substring(0, 200)}...`);
        }
      });
    }
  }
}

investigateGallery().catch(console.error);
