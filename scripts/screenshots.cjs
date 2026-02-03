const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

const screens = [
  { name: 'home', path: '/', delay: 1000 },
  { name: 'chores', path: '/chores', delay: 1000 },
  { name: 'calendar', path: '/calendar', delay: 1500 },
  { name: 'weather', path: '/weather', delay: 1500 },
  { name: 'dinner-plan', path: '/dinner', delay: 1000 },
  { name: 'fitness', path: '/fitness', delay: 1000 },
  { name: 'rewards', path: '/rewards', delay: 1000 },
];

async function takeScreenshots() {
  // Ensure screenshots directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  for (const screen of screens) {
    console.log(`Taking screenshot: ${screen.name}`);
    try {
      await page.goto(`${BASE_URL}${screen.path}`, { waitUntil: 'networkidle0', timeout: 10000 });
      await new Promise(r => setTimeout(r, screen.delay));
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${screen.name}.png`),
        fullPage: false,
      });
      console.log(`  ✓ ${screen.name}.png saved`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    }
  }

  await browser.close();
  console.log('\nDone! Screenshots saved to:', SCREENSHOT_DIR);
}

takeScreenshots().catch(console.error);
