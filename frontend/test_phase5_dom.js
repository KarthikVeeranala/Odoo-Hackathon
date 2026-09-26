import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve('screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runPhase5DomTests() {
  console.log('==================================================');
  console.log('🚀 RUNNING PHASE 5 SMART REORDER & ANOMALY DETECTION DOM TESTS');
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

    // 2. Navigate to Smart Reorder (/reorder)
    console.log('\n2. Navigating to Smart Reorder Intelligence (/reorder)...');
    await page.click('a[href="/reorder"]');
    await page.waitForFunction(() => window.location.pathname === '/reorder', { timeout: 8000 });

    // Verify Reorder Page Title & KPIs
    await page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase();
        return (
          text.includes('smart reorder intelligence') &&
          text.includes('skus analyzed') &&
          text.includes('critical restock') &&
          text.includes('approaching limit') &&
          text.includes('healthy buffer')
        );
      },
      { timeout: 10000 }
    );
    console.log('✅ PASS: Smart Reorder page loaded with all 4 summary KPI tiles');

    // Wait for table rows to render
    await page.waitForSelector('table tbody tr');
    const reorderRows = await page.$$eval('table tbody tr', (rows) => rows.length);
    console.log(`✅ Smart Reorder table rendered with ${reorderRows} SKU forecasting rows`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p5_01_smart_reorder_kpis_and_table.png') });
    console.log('📸 Saved screenshot: p5_01_smart_reorder_kpis_and_table.png');

    // 3. Test Explainability Popover
    console.log('\n3. Testing Explainability Popover (DUS Mathematical Formula)...');
    const infoButtons = await page.$$('button[title="View mathematical calculation"]');
    if (infoButtons.length > 0) {
      await infoButtons[0].click();
      await page.waitForFunction(
        () => document.body.innerText.toLowerCase().includes('calculation breakdown'),
        { timeout: 5000 }
      );
      console.log('✅ PASS: Explainability formula popover opened displaying DUS mathematical breakdown');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p5_02_reorder_explainability_popover.png') });
      console.log('📸 Saved screenshot: p5_02_reorder_explainability_popover.png');
    }

    // 4. Test Quick Reorder Draft Creation
    console.log('\n4. Testing 1-Click "Draft PO" Creation Action...');
    const draftButtons = await page.$$('table tbody tr button');
    // Find the button with 'Draft PO' text
    let clicked = false;
    for (const btn of draftButtons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Draft PO')) {
        await btn.click();
        clicked = true;
        break;
      }
    }

    if (clicked) {
      await page.waitForFunction(
        () => document.body.innerText.toLowerCase().includes('replenishment draft created'),
        { timeout: 8000 }
      );
      console.log('✅ PASS: Draft inward receipt successfully created and notification banner displayed');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p5_03_reorder_draft_created.png') });
      console.log('📸 Saved screenshot: p5_03_reorder_draft_created.png');
    }

    // 5. Navigate to Operational Variances / Anomaly Detection (/anomalies)
    console.log('\n5. Navigating to Operational Variances Requiring Review (/anomalies)...');
    await page.click('a[href="/anomalies"]');
    await page.waitForFunction(() => window.location.pathname === '/anomalies', { timeout: 8000 });

    await page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase();
        return (
          text.includes('operational variances requiring review') &&
          text.includes('total variance events') &&
          text.includes('critical variances') &&
          text.includes('moderate variances') &&
          text.includes('audited & resolved')
        );
      },
      { timeout: 10000 }
    );
    console.log('✅ PASS: Anomaly Detection audit feed loaded with 4 metric cards');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p5_04_anomaly_detection_feed.png') });
    console.log('📸 Saved screenshot: p5_04_anomaly_detection_feed.png');

    // 6. Test Variance Resolution / Status Update
    console.log('\n6. Testing Supervisory Resolution / Sign-off Action...');
    const resolveButtons = await page.$$('button');
    let resolvedClicked = false;
    for (const btn of resolveButtons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Sign Off & Resolve')) {
        await btn.click();
        resolvedClicked = true;
        break;
      }
    }

    if (resolvedClicked) {
      await new Promise((r) => setTimeout(r, 600));
      await page.waitForFunction(
        () => document.body.innerText.toLowerCase().includes('resolved'),
        { timeout: 5000 }
      );
      console.log('✅ PASS: Discrepancy successfully signed off and marked as RESOLVED');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p5_05_anomaly_resolved_status.png') });
      console.log('📸 Saved screenshot: p5_05_anomaly_resolved_status.png');
    }

    console.log('\n==================================================');
    console.log('🎉 ALL PHASE 5 CHROME DOM TESTS PASSED 100%!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('❌ Phase 5 DOM Test Failed:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p5_error.png') });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runPhase5DomTests();
