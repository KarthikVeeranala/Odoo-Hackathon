import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve('screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runPhase2DomTest() {
  console.log('==================================================');
  console.log('🚀 RUNNING PHASE 2 CHROME DOM BROWSER TEST');
  console.log('==================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  try {
    // 1. Login
    console.log('Logging in to application...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    const inputs = await page.$$('input');
    await inputs[0].type('admin@stocksense.com');
    await inputs[1].type('newadminpassword123');
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 10000 });
    console.log(`✅ Logged in successfully. Current URL: ${page.url()}`);

    // 2. Navigate to Products
    console.log('\n--- VERIFYING PRODUCTS PAGE IN CHROME DOM ---');
    await page.click('a[href="/products"]');
    await page.waitForFunction(() => window.location.pathname === '/products');
    await page.waitForSelector('header h1');
    const prodHeader = await page.$eval('header h1', el => el.innerText);
    console.log(`Header: ${prodHeader}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p2_01_products_page.png') });
    console.log('✅ PASS: Products page rendered in Chrome DOM');

    // 3. Navigate to Visual Warehouse
    console.log('\n--- VERIFYING WAREHOUSE MAP IN CHROME DOM ---');
    await page.click('a[href="/warehouse"]');
    await page.waitForFunction(() => window.location.pathname === '/warehouse');
    await page.waitForSelector('header h1');
    const whHeader = await page.$eval('header h1', el => el.innerText);
    console.log(`Header: ${whHeader}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p2_02_warehouse_page.png') });
    console.log('✅ PASS: Visual Warehouse page rendered in Chrome DOM');

    console.log('\n==================================================');
    console.log('🎉 PHASE 2 CHROME DOM VERIFICATION COMPLETED 100%!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('❌ Phase 2 DOM Test Failed:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p2_error.png') });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runPhase2DomTest();
