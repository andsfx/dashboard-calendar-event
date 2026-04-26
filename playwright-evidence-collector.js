import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Storage for evidence
  const consoleLogs = [];
  const networkRequests = [];
  const landingConsoleLogs = [];

  // Capture console messages
  page.on('console', msg => {
    const logEntry = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(logEntry);
    console.log(logEntry);
  });

  // Capture network requests (filter for Supabase)
  page.on('request', request => {
    if (request.url().includes('supabase.co')) {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData()
      });
      console.log(`[NETWORK] ${request.method()} ${request.url()}`);
    }
  });

  console.log('\n=== SCENARIO 1: Testing 404 URL ===\n');
  
  // Navigate to 404 URL
  const url404 = 'https://metmal-community-hub.vercel.app/gallery/lomba-fashion-show-kebaya-pakaian-adat-happy-play-kids';
  console.log(`Navigating to: ${url404}`);
  
  try {
    await page.goto(url404, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for any delayed logs
    
    // Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/task-3-screenshot.png', fullPage: true });
    console.log('Screenshot saved: task-3-screenshot.png');
    
    // Save console logs
    fs.writeFileSync('.sisyphus/evidence/task-3-console.txt', consoleLogs.join('\n'));
    console.log('Console logs saved: task-3-console.txt');
    console.log(`Total console messages: ${consoleLogs.length}`);
    
    // Save network requests
    fs.writeFileSync('.sisyphus/evidence/task-3-network.json', JSON.stringify(networkRequests, null, 2));
    console.log('Network requests saved: task-3-network.json');
    console.log(`Total Supabase requests: ${networkRequests.length}`);
    
  } catch (error) {
    console.error('Error during 404 page test:', error.message);
  }

  console.log('\n=== SCENARIO 2: Testing Landing Page ===\n');
  
  // Clear previous console logs for landing page
  const landingStartIndex = consoleLogs.length;
  
  // Navigate to landing page
  const landingUrl = 'https://metmal-community-hub.vercel.app/';
  console.log(`Navigating to: ${landingUrl}`);
  
  try {
    await page.goto(landingUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for any delayed logs
    
    // Try to scroll to gallery section
    try {
      await page.locator('#gallery').scrollIntoViewIfNeeded({ timeout: 5000 });
      console.log('Scrolled to #gallery section');
    } catch (e) {
      console.log('Could not find #gallery section, continuing...');
    }
    
    // Check if album link exists
    const albumLinkSelector = 'a[href="/gallery/lomba-fashion-show-kebaya-pakaian-adat-happy-play-kids"]';
    const albumExists = await page.locator(albumLinkSelector).count() > 0;
    console.log(`Album link exists: ${albumExists}`);
    
    // Search for album title text
    const albumTitleExists = await page.getByText('Lomba Fashion Show Kebaya', { exact: false }).count() > 0;
    console.log(`Album title "Lomba Fashion Show Kebaya" found: ${albumTitleExists}`);
    
    // Take screenshot
    await page.screenshot({ path: '.sisyphus/evidence/task-3-landing-screenshot.png', fullPage: true });
    console.log('Landing screenshot saved: task-3-landing-screenshot.png');
    
    // Extract landing page console logs (from landingStartIndex onwards)
    const landingLogs = consoleLogs.slice(landingStartIndex);
    fs.writeFileSync('.sisyphus/evidence/task-3-landing-console.txt', landingLogs.join('\n'));
    console.log('Landing console logs saved: task-3-landing-console.txt');
    console.log(`Landing page console messages: ${landingLogs.length}`);
    
  } catch (error) {
    console.error('Error during landing page test:', error.message);
  }

  console.log('\n=== Evidence Collection Complete ===\n');
  console.log('Files created:');
  console.log('- .sisyphus/evidence/task-3-console.txt');
  console.log('- .sisyphus/evidence/task-3-network.json');
  console.log('- .sisyphus/evidence/task-3-screenshot.png');
  console.log('- .sisyphus/evidence/task-3-landing-console.txt');
  console.log('- .sisyphus/evidence/task-3-landing-screenshot.png');

  await browser.close();
})();
