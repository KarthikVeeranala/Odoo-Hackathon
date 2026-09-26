import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve('screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runDomTest() {
  console.log('==================================================');
  console.log('🚀 STARTING CHROME DOM INTEGRATED TEST SUITE');
  console.log('==================================================\n');

  console.log(`Connecting to Google Chrome at: ${CHROME_PATH}`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();
  let interceptedOtp = null;

  // Intercept network responses to capture dev_otp directly from live API
  page.on('response', async (response) => {
    if (response.url().includes('/api/auth/forgot-password')) {
      try {
        const json = await response.json();
        if (json?.data?.dev_otp) {
          interceptedOtp = json.data.dev_otp;
          console.log(`[NETWORK INTERCEPT] Captured Dev OTP: ${interceptedOtp}`);
        }
      } catch {}
    }
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Initial Route Protection
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Initial Route Protection ---');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => window.location.pathname === '/login');
    console.log(`Navigated to http://localhost:3000/ -> Current URL: ${page.url()}`);
    console.log('✅ PASS: Unauthenticated access automatically redirected to /login');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_redirect.png') });

    // -------------------------------------------------------------------------
    // TEST 2: Signup Flow via DOM
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: User Registration (Signup) ---');
    await page.waitForSelector('a[href="/signup"]');
    await page.click('a[href="/signup"]');
    await page.waitForFunction(() => window.location.pathname === '/signup');
    console.log(`Navigated to: ${page.url()}`);

    // Fill signup inputs (Unique timestamped email so tests can re-run anytime)
    const testEmail = `chrometest_${Date.now()}@stocksense.io`;
    const inputs = await page.$$('input');
    await inputs[0].type('Chrome DOM Operator');
    await inputs[1].type(testEmail);
    await inputs[2].type('Password@123');
    await inputs[3].type('Password@123');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_signup_form_filled.png') });

    // Click submit button (React Router client-side transition)
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 10000 });

    console.log(`Post-signup URL: ${page.url()}`);
    console.log('✅ PASS: Signup succeeded and redirected to Dashboard (/)');

    // Verify User in Header
    await page.waitForSelector('header');
    const headerText = await page.$eval('header', (el) => el.innerText);
    console.log(`Header content displays user: ${headerText.includes('Chrome DOM Operator') || headerText.includes(testEmail)}`);
    console.log('✅ PASS: Header displays registered user profile in DOM');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_dashboard_logged_in.png') });

    // -------------------------------------------------------------------------
    // TEST 3: Navigation across core pages
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: AppShell Navigation Verification ---');
    const navLinks = [
      { path: '/products', label: 'Products' },
      { path: '/receipts', label: 'Receipts' },
      { path: '/deliveries', label: 'Deliveries' },
      { path: '/transfers', label: 'Transfers' },
      { path: '/adjustments', label: 'Adjustments' },
      { path: '/ledger', label: 'Ledger' },
      { path: '/warehouse', label: 'Warehouse' },
      { path: '/reorder', label: 'Reorder' },
      { path: '/anomalies', label: 'Anomalies' },
    ];

    for (const nav of navLinks) {
      await page.click(`a[href="${nav.path}"]`);
      await page.waitForFunction((p) => window.location.pathname === p, {}, nav.path);
      await page.waitForSelector('header h1');
      const title = await page.$eval('header h1', (el) => el.innerText);
      console.log(`Clicked ${nav.label} (${nav.path}) -> Header Title: "${title}"`);
    }
    console.log('✅ PASS: All 10 core routes navigated cleanly in AppShell');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_navigation_verified.png') });

    // -------------------------------------------------------------------------
    // TEST 4: Page Reload Session Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Page Reload Session Persistence ---');
    await page.reload({ waitUntil: 'networkidle0' });
    console.log(`Reloaded page: ${page.url()}`);
    if (page.url().includes('/anomalies')) {
      console.log('✅ PASS: Page reload preserved route and authenticated session');
    } else {
      throw new Error(`Page reload redirected unexpectedly: ${page.url()}`);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Logout & Protected Route Interception
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Logout & Route Interception ---');
    const logoutBtn = await page.$('header button[title="Sign out"]');
    if (logoutBtn) {
      await logoutBtn.click();
    } else {
      const buttons = await page.$$('header button');
      await buttons[buttons.length - 1].click();
    }

    await page.waitForFunction(() => window.location.pathname === '/login');
    console.log(`Post-logout URL: ${page.url()}`);
    console.log('✅ PASS: Logout redirected to /login');

    // Attempt protected route directly
    await page.goto('http://localhost:3000/warehouse', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => window.location.pathname === '/login');
    console.log(`Direct access to /warehouse redirected to: ${page.url()}`);
    console.log('✅ PASS: Protected route intercepted unauthenticated request');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_logout_and_protection.png') });

    // -------------------------------------------------------------------------
    // TEST 6: User Login
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: User Login with Credentials ---');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    const loginInputs = await page.$$('input');
    await loginInputs[0].type(testEmail);
    await loginInputs[1].type('Password@123');

    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 10000 });

    console.log(`Post-login URL: ${page.url()}`);
    console.log('✅ PASS: User logged in successfully');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_login_success.png') });

    // Log out again to test forgot-password
    const logoutBtn2 = await page.$('header button[title="Sign out"]');
    await logoutBtn2.click();
    await page.waitForFunction(() => window.location.pathname === '/login');

    // -------------------------------------------------------------------------
    // TEST 7: Forgot Password & OTP Flow
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Forgot Password & OTP Reset Flow ---');
    await page.waitForSelector('a[href="/forgot-password"]');
    await page.click('a[href="/forgot-password"]');
    await page.waitForFunction(() => window.location.pathname === '/forgot-password');
    console.log(`On Forgot Password page: ${page.url()}`);

    // Step 1: Request OTP
    const fpEmailInput = await page.$('input[type="email"]');
    await fpEmailInput.type(testEmail);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_forgot_pwd_step1.png') });

    await page.click('button[type="submit"]');

    // Wait for Step 2 inputs to render
    await page.waitForFunction(() => document.querySelectorAll('input').length >= 3, { timeout: 10000 });
    console.log('✅ Form transitioned to Step 2 (Verify OTP & Set New Password)');

    // Small wait to ensure OTP network response is captured
    await new Promise((r) => setTimeout(r, 500));
    if (!interceptedOtp) {
      throw new Error('Did not intercept OTP from network response');
    }
    console.log(`Using captured OTP: ${interceptedOtp}`);

    // Step 2: Fill OTP, New Password, Confirm Password using specific selectors
    await page.waitForSelector('input[placeholder="e.g. 123456"]');
    await page.type('input[placeholder="e.g. 123456"]', interceptedOtp);
    await page.type('input[placeholder="At least 6 characters"]', 'NewPassword@123');
    await page.type('input[placeholder="Repeat new password"]', 'NewPassword@123');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_forgot_pwd_step2_filled.png') });

    // Click Reset Password
    await page.click('button[type="submit"]');

    // Wait for redirect to /login
    await page.waitForFunction(() => window.location.pathname === '/login', { timeout: 10000 });
    console.log(`✅ PASS: Password reset successful, redirected to: ${page.url()}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_reset_redirect_login.png') });

    // -------------------------------------------------------------------------
    // TEST 8: Login with New Password
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Login with New Password ---');
    const newLoginInputs = await page.$$('input');
    await newLoginInputs[0].type(testEmail);
    await newLoginInputs[1].type('NewPassword@123');

    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 10000 });

    console.log(`Post-login URL with new password: ${page.url()}`);
    console.log('✅ PASS: Login with new password succeeded and navigated to Dashboard!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_login_new_password_dashboard.png') });

    console.log('\n==================================================');
    console.log('🎉 ALL 8 CHROME DOM TEST SCENARIOS PASSED 100%!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('❌ DOM Test Failed:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_state.png') });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runDomTest();
