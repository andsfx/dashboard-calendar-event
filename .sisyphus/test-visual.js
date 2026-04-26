const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  
  console.log('Taking hero screenshot...');
  await page.locator('section').first().screenshot({ path: '.sisyphus/evidence/hero-section.png' });
  
  console.log('Scrolling to benefits...');
  await page.locator('#benefits').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  
  console.log('Taking benefits screenshot...');
  await page.locator('#benefits').screenshot({ path: '.sisyphus/evidence/benefits-section.png' });
  
  console.log('Testing dark mode...');
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(500);
  
  console.log('Taking dark mode screenshot...');
  await page.locator('section').first().screenshot({ path: '.sisyphus/evidence/hero-dark-mode.png' });
  
  console.log('✅ All screenshots captured!');
  await browser.close();
})();
