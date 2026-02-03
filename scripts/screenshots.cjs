const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function clickByText(page, text) {
  return page.evaluate((searchText) => {
    const elements = document.querySelectorAll('button, [role="tab"], a');
    for (const el of elements) {
      if (el.textContent && el.textContent.trim().toLowerCase().includes(searchText.toLowerCase())) {
        el.click();
        return true;
      }
    }
    return false;
  }, text);
}

async function main() {
  console.log('🚀 Starting screenshot capture...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  try {
    // Main views
    console.log('📸 Main views...');
    
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
    await delay(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'home.png') });
    console.log('  ✅ home.png');
    
    await page.goto(`${BASE_URL}/chores`, { waitUntil: 'networkidle0' });
    await delay(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'chores.png') });
    console.log('  ✅ chores.png');
    
    await page.goto(`${BASE_URL}/calendar`, { waitUntil: 'networkidle0' });
    await delay(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'calendar.png') });
    console.log('  ✅ calendar.png');
    
    await page.goto(`${BASE_URL}/weather`, { waitUntil: 'networkidle0' });
    await delay(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'weather.png') });
    console.log('  ✅ weather.png');
    
    await page.goto(`${BASE_URL}/dinner`, { waitUntil: 'networkidle0' });
    await delay(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dinner-plan.png') });
    console.log('  ✅ dinner-plan.png');
    
    await page.goto(`${BASE_URL}/fitness`, { waitUntil: 'networkidle0' });
    await delay(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fitness.png') });
    console.log('  ✅ fitness.png');
    
    await page.goto(`${BASE_URL}/rewards`, { waitUntil: 'networkidle0' });
    await delay(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'rewards.png') });
    console.log('  ✅ rewards.png');
    
    // Recipe view - go directly to recipe/1 if exists
    console.log('\n📸 Recipe view...');
    await page.goto(`${BASE_URL}/recipe/1`, { waitUntil: 'networkidle0' });
    await delay(500);
    const recipeContent = await page.content();
    if (!recipeContent.includes('404') && !recipeContent.includes('not found')) {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'recipe.png') });
      console.log('  ✅ recipe.png');
    } else {
      console.log('  ⚠️  No recipe with id 1, trying to find one...');
      // Try fetching recipes API to get an ID
      const response = await page.goto(`${BASE_URL}/api/recipes`, { waitUntil: 'networkidle0' });
      const recipes = await response.json().catch(() => []);
      if (recipes.length > 0) {
        await page.goto(`${BASE_URL}/recipe/${recipes[0].id}`, { waitUntil: 'networkidle0' });
        await delay(500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'recipe.png') });
        console.log(`  ✅ recipe.png (id: ${recipes[0].id})`);
      } else {
        console.log('  ⚠️  No recipes found in database');
      }
    }
    
    // Admin views
    console.log('\n📸 Admin views...');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle0' });
    await delay(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-members.png') });
    console.log('  ✅ admin-members.png');
    
    // Click Chores tab
    await clickByText(page, 'Chores');
    await delay(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-chores.png') });
    console.log('  ✅ admin-chores.png');
    
    // Click Activities tab
    await clickByText(page, 'Activities');
    await delay(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-activities.png') });
    console.log('  ✅ admin-activities.png');
    
    // Click Rewards tab
    await clickByText(page, 'Rewards');
    await delay(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-rewards.png') });
    console.log('  ✅ admin-rewards.png');
    
    // Click Recipes tab
    await clickByText(page, 'Recipes');
    await delay(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-recipes.png') });
    console.log('  ✅ admin-recipes.png');
    
    // Kiosk/POS views
    console.log('\n📸 Kiosk/POS views...');
    await page.goto(`${BASE_URL}/kiosk`, { waitUntil: 'networkidle0' });
    await delay(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'kiosk-member-select.png') });
    console.log('  ✅ kiosk-member-select.png');
    
    // Click first family member card
    const clicked = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="Card"], [class*="card"]');
      for (const card of cards) {
        if (card.querySelector('img') || card.textContent.includes('Matt') || card.textContent.includes('Erin')) {
          card.click();
          return true;
        }
      }
      // Fallback: click any clickable card-like element
      const clickables = document.querySelectorAll('[role="button"], button, .mantine-UnstyledButton-root');
      if (clickables.length > 0) {
        clickables[0].click();
        return true;
      }
      return false;
    });
    
    if (clicked) {
      await delay(500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'kiosk-chore-picker.png') });
      console.log('  ✅ kiosk-chore-picker.png');
    }
    
    // Fitness POS flow
    console.log('\n📸 Fitness POS views...');
    await page.goto(`${BASE_URL}/fitness`, { waitUntil: 'networkidle0' });
    await delay(500);
    
    // Click log activity button (look for + or "Log")
    const logClicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent || '';
        if (text.includes('Log') || text.includes('+') || text.includes('Activity')) {
          btn.click();
          return true;
        }
      }
      return false;
    });
    
    if (logClicked) {
      await delay(500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fitness-member-select.png') });
      console.log('  ✅ fitness-member-select.png');
      
      // Click a member
      const memberClicked = await page.evaluate(() => {
        const items = document.querySelectorAll('[class*="Card"], [role="button"], button');
        for (const item of items) {
          if (item.querySelector('img') || item.textContent.includes('Matt')) {
            item.click();
            return true;
          }
        }
        return false;
      });
      
      if (memberClicked) {
        await delay(500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fitness-activity-picker.png') });
        console.log('  ✅ fitness-activity-picker.png');
      }
    }
    
    console.log('\n✨ Screenshot capture complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
  
  // List all screenshots
  console.log('\n📁 All screenshots:');
  const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')).sort();
  files.forEach(f => console.log(`   ${f}`));
}

main();
