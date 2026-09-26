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
  console.log('🎬 STARTING AUTOMATED STOCKSENSE HIGH-DEF DEMO VIDEO RECORDER');
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

  // Start Screencast at 24fps HD quality
  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 90,
    everyNthFrame: 1,
  });
  console.log('🎥 Screencast recording initialized...');

  try {
    // -------------------------------------------------------------
    // SCENE 1: AUTHENTICATION
    // -------------------------------------------------------------
    console.log('\n[Scene 1] Navigating to Login Page...');
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle0' });
    await sleep(1500);

    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[0].click({ clickCount: 3 });
      await inputs[0].type('admin@stocksense.com', { delay: 40 });
      await sleep(400);
      await inputs[1].click({ clickCount: 3 });
      await inputs[1].type('Password@123', { delay: 40 });
      await sleep(800);
    }
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
    await sleep(2000);

    // -------------------------------------------------------------
    // SCENE 2: EXECUTIVE LOGISTICS DASHBOARD
    // -------------------------------------------------------------
    console.log('[Scene 2] Executive Logistics Dashboard Showcase...');
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle0' });
    await sleep(1500);
    // Smooth scroll down to view metrics & activities
    await page.evaluate(async () => {
      window.scrollBy({ top: 350, behavior: 'smooth' });
    });
    await sleep(2000);
    await page.evaluate(async () => {
      window.scrollBy({ top: -350, behavior: 'smooth' });
    });
    await sleep(1500);

    // -------------------------------------------------------------
    // SCENE 3: INDUSTRIAL PRODUCT CATALOG
    // -------------------------------------------------------------
    console.log('[Scene 3] Product Catalog & Stock Status...');
    await page.goto('http://127.0.0.1:3000/products', { waitUntil: 'networkidle0' });
    await sleep(2000);
    // Search for a product
    const searchInput = await page.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.type('Bolt', { delay: 60 });
      await sleep(1500);
      await searchInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await sleep(1500);
    }

    // -------------------------------------------------------------
    // SCENE 4: 2D VISUAL WAREHOUSE & LOCATION RACKS
    // -------------------------------------------------------------
    console.log('[Scene 4] Multi-Warehouse Visual Hierarchy & Rack Inspection...');
    await page.goto('http://127.0.0.1:3000/warehouses', { waitUntil: 'networkidle0' });
    await sleep(2500);
    await page.evaluate(async () => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    });
    await sleep(2000);
    await page.evaluate(async () => {
      window.scrollBy({ top: -300, behavior: 'smooth' });
    });
    await sleep(1000);

    // -------------------------------------------------------------
    // SCENE 5: OPERATIONS & MOVEMENTS (RECEIPTS, TRANSFERS, DELIVERIES)
    // -------------------------------------------------------------
    console.log('[Scene 5] Inventory Operations Management...');
    await page.goto('http://127.0.0.1:3000/operations', { waitUntil: 'networkidle0' });
    await sleep(2500);
    await page.evaluate(async () => {
      window.scrollBy({ top: 350, behavior: 'smooth' });
    });
    await sleep(2000);
    await page.evaluate(async () => {
      window.scrollBy({ top: -350, behavior: 'smooth' });
    });
    await sleep(1000);

    // -------------------------------------------------------------
    // SCENE 6: IMMUTABLE STOCK LEDGER AUDIT TRAIL
    // -------------------------------------------------------------
    console.log('[Scene 6] Immutable Stock Movement Ledger...');
    await page.goto('http://127.0.0.1:3000/ledger', { waitUntil: 'networkidle0' });
    await sleep(2500);
    await page.evaluate(async () => {
      window.scrollBy({ top: 400, behavior: 'smooth' });
    });
    await sleep(2000);
    await page.evaluate(async () => {
      window.scrollBy({ top: -400, behavior: 'smooth' });
    });
    await sleep(1000);

    // -------------------------------------------------------------
    // SCENE 7: SMART REORDER INTELLIGENCE (DUS RUNWAY & REORDER)
    // -------------------------------------------------------------
    console.log('[Scene 7] Smart Reorder Intelligence & Consumption Forecasting...');
    await page.goto('http://127.0.0.1:3000/reorder', { waitUntil: 'networkidle0' });
    await sleep(3000);
    await page.evaluate(async () => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    });
    await sleep(2000);
    await page.evaluate(async () => {
      window.scrollBy({ top: -300, behavior: 'smooth' });
    });
    await sleep(1500);

    // -------------------------------------------------------------
    // SCENE 8: ANOMALY DETECTION ENGINE
    // -------------------------------------------------------------
    console.log('[Scene 8] Real-Time Anomaly Detection & Discrepancy Diagnostics...');
    await page.goto('http://127.0.0.1:3000/anomalies', { waitUntil: 'networkidle0' });
    await sleep(3000);
    await page.evaluate(async () => {
      window.scrollBy({ top: 350, behavior: 'smooth' });
    });
    await sleep(2500);
    await page.evaluate(async () => {
      window.scrollBy({ top: -350, behavior: 'smooth' });
    });
    await sleep(2000);

    console.log('\n✅ All demo walkthrough scenes captured successfully!');
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
  console.log(`🎉 SUCCESS! Demo Walkthrough Video Created:`);
  console.log(`📁 File: ${OUTPUT_VIDEO}`);
  console.log(`📦 Size: ${sizeMb} MB`);
  console.log('===============================================================');
}

main().catch((err) => {
  console.error('❌ Video generation failed:', err);
  process.exit(1);
});
