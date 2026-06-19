import { chromium } from 'playwright';

async function screenshotAllViews() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Config
  const baseUrl = 'https://metmal-community-hub.vercel.app';
  const delayMs = 10000; // 10 detik
  const screenshotDir = './public/screenshots';

  // Helper - capture specific element with fallback selectors
  const captureElement = async (selectors, name) => {
    console.log(`📸 ${name}... tunggu ${delayMs/1000}s`);
    await new Promise(r => setTimeout(r, delayMs));
    
    let element = null;
    for (const selector of selectors) {
      element = await page.$(selector);
      if (element) break;
    }
    
    if (!element) {
      console.log(`⚠️ Element not found for: ${name}`);
      return;
    }
    
    await element.screenshot({ path: `${screenshotDir}/${name}.png` });
    console.log(`✅ ${name}`);
  };

  try {
    // Landing Page - Hero Section
    await page.goto(baseUrl);
    await captureElement([
      '#hero',
      'section#hero',
      'main > section:first-child'
    ], 'landing-hero');

    // Landing Page - Upcoming Events
    await page.evaluate(() => {
      const el = document.querySelector('#upcoming-events');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await captureElement([
      '#upcoming-events',
      'section#upcoming-events',
      '[id="upcoming-events"]'
    ], 'landing-upcoming-events');

    // Dashboard - Search & Filter Bar
    await page.goto(`${baseUrl}/dashboard`);
    await captureElement([
      '.ui-dashboard-surface',
      '[class*="ui-dashboard-surface"]',
      'div[class*="surface"]',
      'div.p-3'
    ], 'dashboard-search-filter');

    // Dashboard - Table View (content only)
    await captureElement([
      'table',
      'table[class]',
      'div[role="table"]',
      '.EventTable'
    ], 'dashboard-table-content');

    // Switch to Timeline View
    await page.click('button[aria-label="Tampilan Timeline"]');
    
    // Dashboard - Timeline View (content only)
    await captureElement([
      '.TimelineView',
      '[class*="TimelineView"]',
      'div[class*="timeline"]',
      '[id="views"] > div:last-child'
    ], 'dashboard-timeline-content');

    console.log('🎉 Semua screenshot section selesai!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

screenshotAllViews();