import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FFMPEG_PATH = 'D:\\ODOO\\Odoo-Hackathon\\backend\\.venv\\Lib\\site-packages\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v7.1.exe';
const FRAMES_DIR = path.resolve('temp_screencast_frames');
const OUTPUT_VIDEO = path.resolve('..', 'stocksense_demo_walkthrough.mp4');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('===============================================================');
  console.log('🎬 STARTING COMPLETE FULL-APPLICATION DEMO WALKTHROUGH RECORDER');
  console.log('===============================================================');

  if (fs.existsSync(FRAMES_DIR)) {
    fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--disable-dev-shm-usage',
    ],
    defaultViewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    },
  });

  const page = await browser.newPage();
  const client = await page.target().createCDPSession();

  let frameCount = 0;
  let isRecording = true;

  // Set up screencast frame listener
  client.on('Page.screencastFrame', async (event) => {
    if (!isRecording) return;
    try {
      const buffer = Buffer.from(event.data, 'base64');
      const frameIndex = String(frameCount++).padStart(6, '0');
      fs.writeFileSync(path.join(FRAMES_DIR, `frame_${frameIndex}.jpg`), buffer);
      await client.send('Page.screencastFrameAck', { sessionId: event.sessionId });
    } catch (e) {
      // Ignore frame ack errors on shutdown
    }
  });

  // Start Screencast at 18fps HD quality
  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 90,
    everyNthFrame: 1,
  });
  console.log('🎥 Screencast recording initialized...');

  try {
    // -------------------------------------------------------------
    // SCENE 1: AUTHENTICATION & 1-CLICK DEMO LOGIN
    // -------------------------------------------------------------
    console.log('\n[Scene 1] Navigating to Login Page with Evaluator Banner...');
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle0' });
    await sleep(2000);

    // Click 1-Click Demo Login button
    const demoBtn = await page.$('button[type="button"]');
    if (demoBtn) {
      await demoBtn.click();
    } else {
      await page.click('button[type="submit"]');
    }
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
    await sleep(2500);

    // -------------------------------------------------------------
    // SCENE 2: EXECUTIVE LOGISTICS DASHBOARD
    // -------------------------------------------------------------
    console.log('[Scene 2] Executive Dashboard & 5 Live KPIs...');
    await page.waitForSelector('main', { timeout: 8000 }).catch(() => {});
    await sleep(2000);
    // Smooth scroll down to view metrics & activities
    await page.evaluate(async () => {
      window.scrollBy({ top: 380, behavior: 'smooth' });
    });
    await sleep(2500);
    await page.evaluate(async () => {
      window.scrollBy({ top: -380, behavior: 'smooth' });
    });
    await sleep(1500);

    // -------------------------------------------------------------
    // SCENE 3: INDUSTRIAL PRODUCT CATALOG
    // -------------------------------------------------------------
    console.log('[Scene 3] Products Catalog Navigation & Search...');
    await page.click('a[href="/products"]');
    await sleep(2500);

    const searchInput = await page.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.type('Motor', { delay: 70 });
      await sleep(2000);
      await searchInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await sleep(1500);
    }

    // -------------------------------------------------------------
    // SCENE 4: INBOUND RECEIPTS
    // -------------------------------------------------------------
    console.log('[Scene 4] Inbound Receipts Management (/receipts)...');
    await page.click('a[href="/receipts"]');
    await sleep(2500);
    await page.evaluate(async () => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    });
    await sleep(2000);
    await page.evaluate(async () => {
      window.scrollBy({ top: -300, behavior: 'smooth' });
    });
    await sleep(1500);

    // -------------------------------------------------------------
    // SCENE 5: OUTBOUND DELIVERIES
    // -------------------------------------------------------------
    console.log('[Scene 5] Outbound Deliveries Management (/deliveries)...');
    await page.click('a[href="/deliveries"]');
    await sleep(2500);
    await page.evaluate(async () => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    });
    await sleep(2000);
    await page.evaluate(async () => {
      window.scrollBy({ top: -300, behavior: 'smooth' });
    });
    await sleep(1500);

    // -------------------------------------------------------------
    // SCENE 6: INTERNAL TRANSFERS
    // -------------------------------------------------------------
    console.log('[Scene 6] Internal Put-Away Transfers (/transfers)...');
    await page.click('a[href="/transfers"]');
    await sleep(2500);
    await page.evaluate(async () => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    });
    await sleep(2000);
    await page.evaluate(async () => {
      window.scrollBy({ top: -300, behavior: 'smooth' });
    });
    await sleep(1500);

    // -------------------------------------------------------------
    // SCENE 7: STOCK ADJUSTMENTS & PHYSICAL AUDITS
    // -------------------------------------------------------------
    console.log('[Scene 7] Stock Adjustments & Physical Audits (/adjustments)...');
    await page.click('a[href="/adjustments"]');
    await sleep(2500);
    await page.evaluate(async () => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    });
    await sleep(2000);
    await page.evaluate(async () => {
      window.scrollBy({ top: -300, behavior: 'smooth' });
    });
    await sleep(1500);

    // -------------------------------------------------------------
    // SCENE 8: 2D VISUAL WAREHOUSE & RACKS
    // -------------------------------------------------------------
    console.log('[Scene 8] 2D Visual Warehouse Map & Shelf Inspection (/warehouse)...');
    await page.click('a[href="/warehouse"]');
    await sleep(3000);

    // Click on a rack card/button to inspect its contents
    const rackEl = await page.$('.cursor-pointer, [role="button"]');
    if (rackEl) {
      await rackEl.click();
      await sleep(2500);
      // Close drawer/modal if opened
      await page.keyboard.press('Escape');
      await sleep(1000);
    }
    await page.evaluate(async () => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    });
    await sleep(2000);
    await page.evaluate(async () => {
      window.scrollBy({ top: -300, behavior: 'smooth' });
    });
    await sleep(1500);

    // -------------------------------------------------------------
    // SCENE 9: IMMUTABLE STOCK LEDGER AUDIT TRAIL
    // -------------------------------------------------------------
    console.log('[Scene 9] Double-Entry Immutable Stock Ledger (/ledger)...');
    await page.click('a[href="/ledger"]');
    await sleep(3000);
    await page.evaluate(async () => {
      window.scrollBy({ top: 400, behavior: 'smooth' });
    });
    await sleep(2500);
    await page.evaluate(async () => {
      window.scrollBy({ top: -400, behavior: 'smooth' });
    });
    await sleep(1500);

    // -------------------------------------------------------------
    // SCENE 10: SMART REORDER INTELLIGENCE (DUS RUNWAY)
    // -------------------------------------------------------------
    console.log('[Scene 10] Smart Reorder Intelligence & DUS Forecasts (/reorder)...');
    await page.click('a[href="/reorder"]');
    await sleep(3000);

    // Click a Restock button on a critical item
    const restockButtons = await page.$$('button');
    for (const btn of restockButtons) {
      const text = await (await btn.getProperty('innerText')).jsonValue().catch(() => '');
      if (text && (text.includes('Restock') || text.includes('Create') || text.includes('Draft'))) {
        await btn.click().catch(() => {});
        await sleep(2000);
        break;
      }
    }
    await page.evaluate(async () => {
      window.scrollBy({ top: 350, behavior: 'smooth' });
    });
    await sleep(2000);
    await page.evaluate(async () => {
      window.scrollBy({ top: -350, behavior: 'smooth' });
    });
    await sleep(1500);

    // -------------------------------------------------------------
    // SCENE 11: OPERATIONAL ANOMALY DETECTION
    // -------------------------------------------------------------
    console.log('[Scene 11] Deterministic Anomaly Detection Engine (/anomalies)...');
    await page.click('a[href="/anomalies"]');
    await sleep(3000);
    await page.evaluate(async () => {
      window.scrollBy({ top: 350, behavior: 'smooth' });
    });
    await sleep(2500);
    await page.evaluate(async () => {
      window.scrollBy({ top: -350, behavior: 'smooth' });
    });
    await sleep(1500);

    // -------------------------------------------------------------
    // SCENE 12: AI INVENTORY COPILOT
    // -------------------------------------------------------------
    console.log('[Scene 12] StockSense AI Inventory Copilot (/copilot)...');
    await page.click('a[href="/copilot"]');
    await sleep(3000);

    // Click starter prompt chip
    const chipBtns = await page.$$('button');
    for (const b of chipBtns) {
      const text = await (await b.getProperty('innerText')).jsonValue();
      if (text && text.includes('critically low')) {
        await b.click();
        break;
      }
    }
    await sleep(3500);

    // Type a second query
    const chatInput = await page.$('input[placeholder*="Ask a question"]');
    if (chatInput) {
      await chatInput.type('How much Cold Rolled Steel is available?', { delay: 45 });
      await sleep(500);
      await page.keyboard.press('Enter');
      await sleep(4000);
    }

    console.log('\n✅ All 12 demo walkthrough scenes captured successfully!');
  } finally {
    isRecording = false;
    await client.send('Page.stopScreencast').catch(() => {});
    await browser.close().catch(() => {});
  }

  console.log(`\n🎞️ Total frames captured: ${frameCount}`);
  if (frameCount === 0) {
    console.error('❌ Error: No frames were captured.');
    process.exit(1);
  }

  // -------------------------------------------------------------
  // VIDEO ENCODING VIA FFMPEG
  // -------------------------------------------------------------
  console.log('\n⚙️ Encoding video to MP4 via FFmpeg...');
  console.log(`Target: ${OUTPUT_VIDEO}`);

  await new Promise((resolve, reject) => {
    const ffmpegArgs = [
      '-y',
      '-framerate', '18',
      '-i', path.join(FRAMES_DIR, 'frame_%06d.jpg'),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'medium',
      '-crf', '22',
      OUTPUT_VIDEO,
    ];

    const proc = spawn(FFMPEG_PATH, ffmpegArgs, { stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
    proc.on('error', reject);
  });

  // Cleanup temp frames
  console.log('🧹 Cleaning up temporary screencast frames...');
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });

  const stats = fs.statSync(OUTPUT_VIDEO);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log('===============================================================');
  console.log(`🎉 SUCCESS! Complete Demo Walkthrough Video Created:`);
  console.log(`📁 File: ${OUTPUT_VIDEO}`);
  console.log(`📦 Size: ${sizeMb} MB`);
  console.log('===============================================================');
}

main().catch((err) => {
  console.error('❌ Video generation failed:', err);
  process.exit(1);
});
