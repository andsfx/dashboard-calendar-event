import { chromium } from 'playwright';

async function screenshotAllViews() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Config
  const baseUrl = 'https://metmal-community-hub.vercel.app';
  const delayMs = 10000; // 10 detik
  const screenshotDir = './public/screenshots';

  // Helper - capture by selectors
  const captureBySelector = async (selector, name) => {
    console.log(`📸 ${name}... tunggu ${delayMs/1000}s`);
    await new Promise(r => setTimeout(r, delayMs));
    
    const element = await page.$(selector);
    if (!element) {
      console.log(`⚠️ Element not found: ${selector}`);
      return;
    }
    
    await element.screenshot({ path: `${screenshotDir}/${name}.png` });
    console.log(`✅ ${name}`);
  };

  // Helper - capture by viewport (full visible area)
  const captureByViewport = async (name) => {
    console.log(`📸 ${name}... tunggu ${delayMs/1000}s`);
    await new Promise(r => setTimeout(r, delayMs));
    
    await page.screenshot({ path: `${screenshotDir}/${name}.png` });
    console.log(`✅ ${name}`);
  };

  try {
    // Landing Page - Hero (capture by viewport)
    await page.goto(baseUrl);
    await captureByViewport('landing-hero');

    // Scroll to Featured Events
    await page.evaluate(() => {
      const el = document.querySelector('[id="featured"]');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await captureByViewport('landing-featured');

    // Scroll to Calendar
    await page.evaluate(() => {
      const el = document.querySelector('[id="calendar"]');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await captureByViewport('landing-calendar');

    // Dashboard - Table View
    await page.goto(`${baseUrl}/dashboard`);
    await captureBySelector('section#views', 'dashboard-table-section');
    
    // Switch to Timeline View
    await page.click('button[aria-label="Tampilan Timeline"]');
    await captureBySelector('section#views', 'dashboard-timeline-section');

    console.log('🎉 Semua screenshot section selesai!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

screenshotAllViews();