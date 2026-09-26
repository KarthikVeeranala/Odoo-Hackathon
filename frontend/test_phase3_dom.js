import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve('screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runPhase3DomTests() {
  console.log('==================================================');
  console.log('🚀 RUNNING PHASE 3 OPERATIONS CHROME DOM TEST SUITE');
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

    // Helper to select in React controlled components
    const reactSelect = async (selector, value) => {
      await page.evaluate((sel, val) => {
        const el = document.querySelector(sel);
        if (el) {
          el.value = val;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, selector, value);
    };

    // 2. Receipts Module
    console.log('\n2. Testing Receipts module (/receipts)...');
    await page.click('a[href="/receipts"]');
    await page.waitForFunction(() => window.location.pathname === '/receipts');
    await page.waitForSelector('table tbody tr');

    const receiptRows = await page.$$eval('table tbody tr', (rows) => rows.length);
    console.log(`✅ Loaded Receipts table with ${receiptRows} initial rows`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p3_01_receipts_loaded.png') });

    // Click "New Receipt" button
    console.log('Opening New Receipt Modal...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('New Receipt'));
      if (!btn) throw new Error('New Receipt button not found');
      btn.click();
    });
    await page.waitForSelector('form select');
    console.log('Filling New Receipt details...');

    // Fill supplier name
    await page.type('input[placeholder*="Acme Components"]', 'Apex Global Logistics');
    // Select destination location (e.g. WH1-REC)
    await reactSelect('form select', '3'); // ID 3 is WH1-REC

    // Ensure at least one line item is present
    await page.evaluate(() => {
      const addLineBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Add Item Line'));
      const lineRows = document.querySelectorAll('div[class*="bg-slate-50/80"]');
      if (lineRows.length === 0 && addLineBtn) {
        addLineBtn.click();
      }
    });
    await new Promise((r) => setTimeout(r, 400));

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p3_02_new_receipt_modal.png') });

    // Submit Receipt
    console.log('Clicking Create RECEIPT button...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Create RECEIPT'));
      if (btn) btn.click();
      else throw new Error('Create RECEIPT button not found');
    });
    await page.waitForFunction(() => !document.querySelector('form select'), { timeout: 8000 });
    console.log('✅ Inbound Receipt created successfully');
    await new Promise((r) => setTimeout(r, 600));

    // 3. Deliveries Module
    console.log('\n3. Testing Deliveries module (/deliveries)...');
    await page.click('a[href="/deliveries"]');
    await page.waitForFunction(() => window.location.pathname === '/deliveries');
    await page.waitForSelector('table tbody tr');

    const deliveryRows = await page.$$eval('table tbody tr', (rows) => rows.length);
    console.log(`✅ Loaded Deliveries table with ${deliveryRows} rows`);

    // Click "New Delivery" button
    console.log('Opening New Delivery Modal...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('New Delivery'));
      if (!btn) throw new Error('New Delivery button not found');
      btn.click();
    });
    await page.waitForSelector('form select');

    // Fill customer name
    await page.type('input[placeholder*="TechCorp Solutions"]', 'MegaFab Manufacturing');
    // Select source location
    await reactSelect('form select', '1'); // ID 1 is WH1-A1

    // Ensure line item is present
    await page.evaluate(() => {
      const addLineBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Add Item Line'));
      const lineRows = document.querySelectorAll('div[class*="bg-slate-50/80"]');
      if (lineRows.length === 0 && addLineBtn) {
        addLineBtn.click();
      }
    });
    await new Promise((r) => setTimeout(r, 400));

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p3_03_new_delivery_modal.png') });

    // Submit Delivery
    console.log('Submitting delivery order...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Create DELIVERY'));
      if (btn) btn.click();
      else throw new Error('Create DELIVERY button not found');
    });
    await page.waitForFunction(() => !document.querySelector('form select'), { timeout: 8000 });
    console.log('✅ Outbound Delivery order created successfully');
    await new Promise((r) => setTimeout(r, 600));

    // 4. Transfers Module
    console.log('\n4. Testing Transfers module (/transfers)...');
    await page.click('a[href="/transfers"]');
    await page.waitForFunction(() => window.location.pathname === '/transfers');
    await page.waitForSelector('table tbody tr');

    const transferRows = await page.$$eval('table tbody tr', (rows) => rows.length);
    console.log(`✅ Loaded Transfers table with ${transferRows} rows`);

    // Click "New Transfer" button
    console.log('Opening New Transfer Modal...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('New Transfer'));
      if (!btn) throw new Error('New Transfer button not found');
      btn.click();
    });
    await page.waitForSelector('form select');

    // Select source (WH1-REC = 3) and destination (WH1-A1 = 1)
    await page.evaluate(() => {
      const selects = document.querySelectorAll('form select');
      if (selects[0]) {
        selects[0].value = '3';
        selects[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (selects[1]) {
        selects[1].value = '1';
        selects[1].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Ensure line item is present
    await page.evaluate(() => {
      const addLineBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Add Item Line'));
      const lineRows = document.querySelectorAll('div[class*="bg-slate-50/80"]');
      if (lineRows.length === 0 && addLineBtn) {
        addLineBtn.click();
      }
    });
    await new Promise((r) => setTimeout(r, 400));

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p3_04_new_transfer_modal.png') });

    // Submit Transfer
    console.log('Submitting transfer operation...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Create TRANSFER'));
      if (btn) btn.click();
      else throw new Error('Create TRANSFER button not found');
    });
    await page.waitForFunction(() => !document.querySelector('form select'), { timeout: 8000 });
    console.log('✅ Stock Transfer operation created successfully');
    await new Promise((r) => setTimeout(r, 600));

    // 5. Adjustments Module
    console.log('\n5. Testing Adjustments module (/adjustments)...');
    await page.click('a[href="/adjustments"]');
    await page.waitForFunction(() => window.location.pathname === '/adjustments');
    await page.waitForSelector('table tbody tr');

    const adjustmentRows = await page.$$eval('table tbody tr', (rows) => rows.length);
    console.log(`✅ Loaded Adjustments table with ${adjustmentRows} rows`);

    // Click "New Adjustment" button
    console.log('Opening New Adjustment Modal...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('New Adjustment'));
      if (!btn) throw new Error('New Adjustment button not found');
      btn.click();
    });
    await page.waitForSelector('form select');

    // Select location
    await page.evaluate(() => {
      const selects = document.querySelectorAll('form select');
      if (selects[0]) {
        selects[0].value = '1';
        selects[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Fill physical count and reason
    const adjInputs = await page.$$('form input');
    // Set counted quantity
    await adjInputs[0].click({ clickCount: 3 });
    await adjInputs[0].type('95');
    // Set adjustment reason
    await adjInputs[1].type('Annual physical inventory audit - shelf discrepancy reconciliation');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p3_05_new_adjustment_modal.png') });

    // Submit Adjustment
    console.log('Submitting adjustment...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Create ADJUSTMENT'));
      if (btn) btn.click();
      else throw new Error('Create ADJUSTMENT button not found');
    });
    await page.waitForFunction(() => !document.querySelector('form select'), { timeout: 8000 });
    console.log('✅ Physical count adjustment recorded successfully');
    await new Promise((r) => setTimeout(r, 600));

    // 6. Inspect Operation & Validate
    console.log('\n6. Inspecting created adjustment and validating...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const inspectBtn = buttons.find((b) => b.textContent?.trim() === 'Inspect');
      if (inspectBtn) inspectBtn.click();
    });

    await page.waitForFunction(
      () => document.body.innerText.toLowerCase().includes('operation items'),
      { timeout: 8000 }
    );
    console.log('✅ Operation Detail Modal inspected in Chrome DOM');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p3_06_operation_detail_modal.png') });

    // Click "Validate & Complete"
    console.log('Clicking Validate & Complete...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const validateBtn = buttons.find((b) => b.textContent?.includes('Validate & Complete'));
      if (validateBtn) validateBtn.click();
      else throw new Error('Validate & Complete button not found');
    });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p3_07_operation_validated.png') });

    console.log('\n==================================================');
    console.log('🎉 ALL PHASE 3 CHROME DOM OPERATIONS TESTS PASSED 100%!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('❌ Phase 3 DOM Test Failed:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p3_error.png') });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runPhase3DomTests();
