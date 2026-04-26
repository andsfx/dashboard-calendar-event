const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const albumUrl = 'https://metmal-community-hub.vercel.app/gallery/lomba-fashion-show-kebaya-pakaian-adat-happy-play-kids';
  const evidenceDir = path.join(__dirname);
  
  console.log('=== SCENARIO 1: Album page loads successfully ===');
  
  try {
    // Navigate to album page
    const response = await page.goto(albumUrl, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`✓ Page loaded with status: ${response.status()}`);
    
    if (response.status() !== 200) {
      throw new Error(`Expected HTTP 200, got ${response.status()}`);
    }

    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    
    // Check page title
    const title = await page.title();
    console.log(`✓ Page title: ${title}`);
    
    if (!title.includes('Lomba Fashion Show Kebaya')) {
      console.warn(`⚠ Title does not contain "Lomba Fashion Show Kebaya": ${title}`);
    }

    // Check for 404 errors
    const bodyText = await page.textContent('body');
    if (bodyText.includes('404') || bodyText.toLowerCase().includes('tidak ditemukan')) {
      throw new Error('Page shows 404 or "tidak ditemukan" error');
    }
    console.log('✓ No 404 error found');

    // Check for h1 with album name
    const h1Elements = await page.locator('h1').all();
    let albumNameFound = false;
    for (const h1 of h1Elements) {
      const text = await h1.textContent();
      if (text && text.includes('Lomba Fashion Show Kebaya')) {
        console.log(`✓ Album name found in h1: ${text.trim()}`);
        albumNameFound = true;
        break;
      }
    }
    
    if (!albumNameFound) {
      console.warn('⚠ Album name not found in h1 elements');
    }

    // Check for photo grid
    const photoElements = await page.locator('img[alt*="photo"], img[src*="supabase"], .photo, .gallery img').count();
    console.log(`✓ Found ${photoElements} photo elements`);
    
    if (photoElements === 0) {
      console.warn('⚠ No photo elements found');
    }

    // Take screenshot
    const screenshotPath = path.join(evidenceDir, 'task-8-success-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`✓ Screenshot saved: ${screenshotPath}`);

  } catch (error) {
    console.error(`✗ Scenario 1 failed: ${error.message}`);
    const screenshotPath = path.join(evidenceDir, 'task-8-error-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`✓ Error screenshot saved: ${screenshotPath}`);
  }

  console.log('\n=== SCENARIO 2: Navigation from landing page ===');
  
  try {
    // Navigate to landing page
    await page.goto('https://metmal-community-hub.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✓ Landed on homepage');

    // Scroll to gallery section
    await page.evaluate(() => {
      const gallerySection = document.querySelector('#gallery, [id*="gallery"], section:has(a[href*="/gallery/"])');
      if (gallerySection) {
        gallerySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await page.waitForTimeout(1000);
    console.log('✓ Scrolled to gallery section');

    // Find and click album link
    const albumLink = page.locator('a[href*="lomba-fashion-show-kebaya"]').first();
    const linkExists = await albumLink.count() > 0;
    
    if (!linkExists) {
      throw new Error('Album link not found on landing page');
    }
    console.log('✓ Album link found');

    await albumLink.click();
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    console.log('✓ Clicked album link');

    // Verify URL
    const currentUrl = page.url();
    if (!currentUrl.includes('/gallery/lomba-fashion-show-kebaya-pakaian-adat-happy-play-kids')) {
      throw new Error(`Expected URL to contain album slug, got: ${currentUrl}`);
    }
    console.log(`✓ Navigated to correct URL: ${currentUrl}`);

    // Check no 404
    const bodyText = await page.textContent('body');
    if (bodyText.includes('404') || bodyText.toLowerCase().includes('tidak ditemukan')) {
      throw new Error('Album page shows 404 after navigation');
    }
    console.log('✓ Album page loaded successfully (no 404)');

    // Take screenshot
    const navScreenshotPath = path.join(evidenceDir, 'task-8-navigation-screenshot.png');
    await page.screenshot({ path: navScreenshotPath, fullPage: true });
    console.log(`✓ Navigation screenshot saved: ${navScreenshotPath}`);

  } catch (error) {
    console.error(`✗ Scenario 2 failed: ${error.message}`);
  }

  console.log('\n=== SCENARIO 3: Album metadata ===');
  
  try {
    // Navigate back to album page
    await page.goto(albumUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Extract metadata
    const metadata = {
      url: albumUrl,
      timestamp: new Date().toISOString(),
      date: null,
      location: null,
      photoCount: 0,
      albumName: null
    };

    // Extract album name
    const h1Elements = await page.locator('h1').all();
    for (const h1 of h1Elements) {
      const text = await h1.textContent();
      if (text && text.includes('Lomba Fashion Show Kebaya')) {
        metadata.albumName = text.trim();
        break;
      }
    }
    console.log(`✓ Album name: ${metadata.albumName || 'Not found'}`);

    // Extract date (look for date patterns)
    const bodyText = await page.textContent('body');
    const dateMatch = bodyText.match(/2026-04-26|26.*April.*2026|April.*26.*2026/i);
    if (dateMatch) {
      metadata.date = dateMatch[0];
      console.log(`✓ Date found: ${metadata.date}`);
    } else {
      console.warn('⚠ Date not found');
    }

    // Extract location
    if (bodyText.includes('Panggung Funworld')) {
      const locationMatch = bodyText.match(/Panggung Funworld[^<\n]*/i);
      if (locationMatch) {
        metadata.location = locationMatch[0].trim();
        console.log(`✓ Location found: ${metadata.location}`);
      }
    } else {
      console.warn('⚠ Location not found');
    }

    // Count photos
    metadata.photoCount = await page.locator('img[alt*="photo"], img[src*="supabase"], .photo, .gallery img').count();
    console.log(`✓ Photo count: ${metadata.photoCount}`);

    // Save metadata
    const metadataPath = path.join(evidenceDir, 'task-8-metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`✓ Metadata saved: ${metadataPath}`);

  } catch (error) {
    console.error(`✗ Scenario 3 failed: ${error.message}`);
  }

  await browser.close();
  console.log('\n=== QA Testing Complete ===');
})();
