import { chromium } from 'playwright';

async function inspectLanding() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseUrl = 'https://metmal-community-hub.vercel.app';
  await page.goto(baseUrl);
  await new Promise(r => setTimeout(r, 10000));

  const html = await page.evaluate(() => {
    return document.querySelector('main')?.outerHTML?.slice(0, 2000) || 'no main';
  });
  console.log('=== Main HTML ===');
  console.log(html);

  const ids = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[id]')).map(el => el.id);
  });
  console.log('=== IDs ===');
  console.log(ids);

  await browser.close();
}

inspectLanding();