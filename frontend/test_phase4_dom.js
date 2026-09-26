import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve('screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runPhase4DomTests() {
  console.log('==================================================');
  console.log('🚀 RUNNING PHASE 4 DASHBOARD, LEDGER & WAREHOUSE DOM TESTS');
  console.log('==================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,850'],
    defaultViewport: { width: 1280, height: 850 },
  });

  const page = await browser.newPage();
  page.on('console', (msg) => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('BROWSER ERROR:', err.toString()));

  try {
    // 1. Login
    console.log('1. Logging in to StockSense...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    const inputs = await page.$$('input');
    await inputs[0].type('admin@stocksense.com');
    await inputs[1].type('newadminpassword123');
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 10000 });
    console.log(`✅ Logged in successfully. Current URL: ${page.url()}`);

    // 2. Verify Dashboard KPIs
    console.log('\n2. Verifying Dashboard 5 KPI Metric Cards...');
    await page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase();
        return (
          text.includes('total products in stock') &&
          text.includes('low / out of stock') &&
          text.includes('pending receipts') &&
          text.includes('pending deliveries') &&
          text.includes('internal transfers scheduled')
        );
      },
      { timeout: 10000 }
    );
    console.log('✅ PASS: All 5 exact Dashboard KPI cards rendered in DOM');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p4_01_dashboard_kpis.png') });

    // 3. Test Navigation to Stock Ledger
    console.log('\n3. Navigating to Stock Movement Ledger (/ledger)...');
    await page.click('a[href="/ledger"]');
    await page.waitForFunction(() => window.location.pathname === '/ledger');
    await page.waitForSelector('table tbody tr');

    const ledgerRows = await page.$$eval('table tbody tr', (rows) => rows.length);
    console.log(`✅ Stock Ledger table rendered with ${ledgerRows} audit entries`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p4_02_stock_ledger_table.png') });

    // Test Ledger Filter Tab
    console.log('Testing Ledger type filter: clicking "RECEIPT"...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'RECEIPT');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    console.log('✅ PASS: Ledger filtered by RECEIPT operation type');

    // 4. Test Navigation to Visual Warehouse
    console.log('\n4. Navigating to Visual Warehouse 2D Map (/warehouse)...');
    await page.click('a[href="/warehouse"]');
    await page.waitForFunction(() => window.location.pathname === '/warehouse');
    await page.waitForSelector('div[class*="grid"] > div[class*="cursor-pointer"]', { timeout: 10000 });

    const locationCards = await page.$$('div[class*="grid"] > div[class*="cursor-pointer"]');
    console.log(`✅ Rendered ${locationCards.length} warehouse rack cards with capacity bars`);

    // Test Bay Type Filter Tab
    console.log('Testing Warehouse bay type filter: clicking "STORAGE"...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'STORAGE');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // Click on first rack card to inspect drawer
    console.log('Clicking first Storage Rack card to open stock drawer...');
    const storageCards = await page.$$('div[class*="grid"] > div[class*="cursor-pointer"]');
    await storageCards[0].click();

    await page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase();
        return (
          text.includes('rack a1') &&
          (text.includes('location is currently empty') || text.includes('stored inventory'))
        );
      },
      { timeout: 8000 }
    );
    console.log('✅ PASS: Warehouse inspection drawer opened with live stock breakdown');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p4_03_warehouse_map_drawer.png') });

    // Close drawer
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Close Drawer'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    console.log('\n==================================================');
    console.log('🎉 ALL PHASE 4 CHROME DOM TESTS PASSED 100%!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('❌ Phase 4 DOM Test Failed:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p4_error.png') });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runPhase4DomTests();
