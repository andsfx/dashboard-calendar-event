import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Ensure evidence directory exists
  const evidenceDir = path.join(__dirname, 'evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
  
  // Navigate to the page
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  
  // Wait for hero section
  await page.waitForSelector('section#hero', { timeout: 10000 });
  
  // Screenshot 1: Light mode hero texture
  const heroSection = await page.locator('section#hero');
  await heroSection.screenshot({ 
    path: path.join(evidenceDir, 'task-1-hero-texture.png'),
    animations: 'disabled'
  });
  
  console.log('✓ Captured light mode hero screenshot');
  
  // Extract background layers info
  const layerCount = await page.evaluate(() => {
    const hero = document.querySelector('section#hero');
    const bgDivs = hero.querySelectorAll(':scope > div');
    return bgDivs.length;
  });
  
  console.log(`✓ Background layers detected: ${layerCount}`);
  
  // Screenshot 2: Dark mode hero texture
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  
  await page.waitForTimeout(500);
  
  await heroSection.screenshot({ 
    path: path.join(evidenceDir, 'task-1-hero-dark.png'),
    animations: 'disabled'
  });
  
  console.log('✓ Captured dark mode hero screenshot');
  
  // Extract texture opacity in dark mode
  const textureOpacity = await page.evaluate(() => {
    const hero = document.querySelector('section#hero');
    const textureDivs = Array.from(hero.querySelectorAll(':scope > div > div'));
    const textureDiv = textureDivs.find(div => {
      const style = window.getComputedStyle(div);
      return style.backgroundImage.includes('data:image/svg+xml');
    });
    
    if (textureDiv) {
      const opacity = window.getComputedStyle(textureDiv).opacity;
      return parseFloat(opacity);
    }
    return null;
  });
  
  console.log(`✓ Texture opacity in dark mode: ${textureOpacity}`);
  
  // Verify acceptance criteria
  console.log('\n=== Acceptance Criteria Verification ===');
  console.log(`✓ Background layers: ${layerCount >= 3 ? 'PASS' : 'FAIL'} (${layerCount} layers)`);
  console.log(`✓ Dark mode texture opacity: ${textureOpacity <= 0.05 ? 'PASS' : 'FAIL'} (${textureOpacity})`);
  
  await browser.close();
})();
