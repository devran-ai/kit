#!/usr/bin/env node

/**
 * Devran AI Kit — OG Image Generator
 *
 * Generates a pixel-perfect 1200x630 PNG OG image from og-image.html.
 * Uses Puppeteer for headless Chrome rendering.
 *
 * Usage:
 *   node scripts/generate-og-image.js
 *
 * Output:
 *   docs/assets/og-image.png
 */

'use strict';

const path = require('path');

async function generate() {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    console.error('❌ puppeteer not found. Installing...');
    const { execSync } = require('child_process');
    execSync('npm install --no-save puppeteer', { stdio: 'inherit' });
    puppeteer = require('puppeteer');
  }

  const ROOT = path.resolve(__dirname, '..');
  const htmlPath = path.join(__dirname, 'og-image.html');
  const outputPath = path.join(ROOT, 'docs', 'assets', 'og-image.png');

  console.log('🎨 Generating OG image...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  await page.setViewport({
    width: 1200,
    height: 630,
    deviceScaleFactor: 2, // 2x for retina-quality output
  });

  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  // Wait for fonts to load
  await page.evaluateHandle('document.fonts.ready');

  await page.screenshot({
    path: outputPath,
    type: 'png',
    clip: { x: 0, y: 0, width: 1200, height: 630 },
  });

  await browser.close();

  const fs = require('fs');
  const stats = fs.statSync(outputPath);
  const sizeKB = Math.round(stats.size / 1024);

  console.log(`✅ OG image generated: ${path.relative(ROOT, outputPath)} (${sizeKB} KB)`);
  console.log('   Dimensions: 2400x1260 @2x (renders as 1200x630)');
}

generate().catch((err) => {
  console.error('❌ Failed to generate OG image:', err.message);
  process.exit(1);
});
