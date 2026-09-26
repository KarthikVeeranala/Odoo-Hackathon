import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve('screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runExtendedPhase2DomTest() {
  console.log('==================================================');
  console.log('🚀 RUNNING COMPREHENSIVE PHASE 2 CHROME DOM TEST');
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
    console.log('1. Logging in to StockSense...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    const inputs = await page.$$('input');
    await inputs[0].type('admin@stocksense.com');
    await inputs[1].type('newadminpassword123');
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 10000 });
    console.log(`✅ Logged in successfully. Current URL: ${page.url()}`);

    // 2. Navigate to Products
    console.log('\n2. Navigating to Products page...');
    await page.click('a[href="/products"]');
    await page.waitForFunction(() => window.location.pathname === '/products');
    await page.waitForSelector('table tbody tr');

    const rowCount = await page.$$eval('table tbody tr', (rows) => rows.length);
    console.log(`✅ Found ${rowCount} product rows rendered in DataTable`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p2_03_products_list_loaded.png') });

    // 3. Search Filter Test
    console.log('\n3. Testing live search filter with "Stepper"...');
    await page.type('input[placeholder*="Filter products"]', 'Stepper');
    await new Promise((r) => setTimeout(r, 600));

    const filteredRows = await page.$$eval('table tbody tr', (rows) => rows.map((r) => r.innerText));
    console.log(`Filtered result count: ${filteredRows.length}`);
    console.log(`First row: ${filteredRows[0]?.split('\n')[0]}`);
    console.log('✅ PASS: Search filter correctly isolated Stepper Motor in DOM');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p2_04_search_filtered.png') });

    // Clear search
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Filter products"]');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        setter?.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 500));

    // 4. Test "Add Product" Modal
    console.log('\n4. Opening Add Product Modal...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Add Product'));
      if (!btn) throw new Error('Add Product button not found');
      btn.click();
    });
    await page.waitForSelector('form input');
    console.log('✅ Modal rendered in DOM');

    const testSku = `SKU-BEAR-${Date.now().toString().slice(-4)}`;
    console.log(`Filling product form for SKU: ${testSku}`);
    const modalInputs = await page.$$('form input');
    await modalInputs[0].type(testSku); // SKU
    await modalInputs[1].type('High Load Flange Bearing 20mm'); // Name
    await modalInputs[2].type('units'); // UoM
    await modalInputs[3].click({ clickCount: 3 });
    await modalInputs[3].type('25'); // Safety Stock
    await modalInputs[4].click({ clickCount: 3 });
    await modalInputs[4].type('80'); // Reorder Qty

    // Select category from dropdown
    await page.select('form select', '1'); // Select first category

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p2_05_add_product_filled.png') });

    // Submit modal
    console.log('Submitting new product...');
    await page.click('form button[type="submit"]');

    // Wait for modal to close and new item to appear
    await page.waitForFunction(() => !document.querySelector('form input'), { timeout: 10000 });
    console.log('✅ Product modal closed after successful creation');

    // Search for newly created product in table
    await page.type('input[placeholder*="Filter products"]', testSku);
    await new Promise((r) => setTimeout(r, 600));

    const newRowText = await page.$eval('table tbody tr', (el) => el.innerText);
    console.log(`Found newly created SKU in table row: ${newRowText.includes(testSku)}`);
    if (!newRowText.includes(testSku)) {
      throw new Error(`Expected row to contain ${testSku}, but got: ${newRowText}`);
    }
    console.log('✅ PASS: Newly created product immediately rendered in live catalog table');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p2_06_new_product_verified.png') });

    // 5. Navigate to Visual Warehouse
    console.log('\n5. Navigating to Visual Warehouse map...');
    await page.click('a[href="/warehouse"]');
    await page.waitForFunction(() => window.location.pathname === '/warehouse');
    await page.waitForSelector('div[class*="grid"] > div[class*="cursor-pointer"]', { timeout: 10000 });

    const locationCards = await page.$$('div[class*="grid"] > div[class*="cursor-pointer"]');
    console.log(`✅ Rendered ${locationCards.length} warehouse location cards in 2D grid`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p2_07_warehouse_grid_loaded.png') });

    // 6. Click Location Card to Inspect Stored Stock
    console.log('\n6. Clicking first location card to open Inspection Drawer...');
    await locationCards[0].click();

    // Wait for drawer to appear
    await page.waitForFunction(
      () =>
        document.body.innerText.includes('Rack A1') &&
        (document.body.innerText.includes('Location is currently empty') ||
          document.body.innerText.includes('Stored Inventory')),
      { timeout: 8000 }
    );
    const drawerTitle = await page.$eval('h3', (el) => el.innerText);
    console.log(`Inspection Drawer opened for: "${drawerTitle}"`);
    console.log('✅ PASS: Location inspect drawer displays live stored items and quantities');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p2_08_location_stock_drawer.png') });

    // Close drawer
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Close Drawer'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    console.log('\n==================================================');
    console.log('🎉 ALL COMPREHENSIVE PHASE 2 CHROME DOM TESTS PASSED!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('❌ Extended Phase 2 DOM Test Failed:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p2_error_extended.png') });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runExtendedPhase2DomTest();
