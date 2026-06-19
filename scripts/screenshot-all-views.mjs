import { chromium } from 'playwright';

async function screenshotAllViews() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Config
  const baseUrl = 'https://metmal-community-hub.vercel.app';
  const delayMs = 10000; // 10 detik
  const screenshotDir = './public/screenshots';

  // Helper
  const capture = async (name) => {
    console.log(`📸 ${name}... tunggu ${delayMs/1000}s`);
    await new Promise(r => setTimeout(r, delayMs));
    await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: true });
    console.log(`✅ ${name}`);
  };

  try {
    // Landing Page
    await page.goto(baseUrl);
    await capture('landing');

    // Dashboard - Table View (default)
    await page.goto(`${baseUrl}/dashboard`);
    await capture('dashboard-table');

    // Switch to Timeline (available for public)
    await page.click('button[aria-label="Tampilan Timeline"]');
    await capture('dashboard-timeline');

    // Open Add Event Modal (if available)
    const addEventButton = await page.$('button:has-text("Tambah Event")');
    if (addEventButton) {
      await addEventButton.click();
      await capture('modal-add-event');
      await page.keyboard.press('Escape');
    }

    console.log('🎉 Semua screenshot selesai!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

screenshotAllViews();