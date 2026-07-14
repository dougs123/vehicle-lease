#!/usr/bin/env node
// Lease deal harvester: scrapes Lease Loco, You Drive, Leasing.com, etc.
// Deduplicates and POSTs to ingest worker.
//   node lease-harvester.mjs --dry-run [--only leaseloco]

import { chromium } from 'playwright';
import fetch from 'node-fetch';
import fs from 'fs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const INGEST_URL = process.env.INGEST_URL || 'https://vehicle-lease.rewardspy.workers.dev/ingest-batch';
const INGEST_KEY = process.env.INGEST_KEY || '';
const ARGV = process.argv.slice(2);
const DRY = ARGV.includes('--dry-run');
const ONLY = (() => {
  const i = ARGV.indexOf('--only');
  return i >= 0 && ARGV[i + 1] ? ARGV[i + 1].split(',') : null;
})();

// Sites to scrape: { name, url, scraper: (page) => [{ make, model, lender, price, ... }] }
const SITES = [
  {
    name: 'leaseloco',
    url: 'https://www.leaseloco.com',
    scraper: scrapeLeaseLoco,
  },
  {
    name: 'youdrive',
    url: 'https://www.youdrive.com/search',
    scraper: scrapeYouDrive,
  },
  {
    name: 'leasing-com',
    url: 'https://www.leasing.com/lease-deals',
    scraper: scrapeLeasingCom,
  },
];

// Lease Loco scraper
async function scrapeLeaseLoco(page) {
  try {
    await page.goto('https://www.leaseloco.com/search', { waitUntil: 'networkidle', timeout: 30000 });
    // Look for deal cards in the page
    const deals = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-testid*="deal"], .deal-card, .car-result'));
      return cards
        .map((card) => {
          const makeModel = card.querySelector('[data-testid*="vehicle-name"], .vehicle-name, h2, h3')?.textContent || '';
          const [make, model] = makeModel.split(/\s+/, 2);
          const price = card.querySelector('[data-testid*="price"], .price, .monthly-price')?.textContent || '';
          const priceNum = parseInt(price.match(/\d+/)?.[0] || 0);
          return make && priceNum > 0
            ? {
                make: make.trim(),
                model: model?.trim() || '',
                lender: 'Lease Loco',
                monthly_price_gbp: priceNum,
                source: 'leaseloco',
              }
            : null;
        })
        .filter(Boolean);
    });
    return deals;
  } catch (e) {
    console.error('[leaseloco] ERROR', String(e.message).slice(0, 100));
    return [];
  }
}

// You Drive scraper
async function scrapeYouDrive(page) {
  try {
    await page.goto('https://www.youdrive.com/search?sort=price', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    const deals = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-testid*="car"], .car-item, .result-item'));
      return cards
        .map((card) => {
          const makeModel = card.querySelector('[data-testid*="name"], .name, .vehicle-name')?.textContent || '';
          const [make, model] = makeModel.split(/\s+/, 2);
          const price = card.querySelector('[data-testid*="price"], .price, [class*="price"]')?.textContent || '';
          const priceNum = parseInt(price.match(/\d+/)?.[0] || 0);
          return make && priceNum > 0
            ? {
                make: make.trim(),
                model: model?.trim() || '',
                lender: 'You Drive',
                monthly_price_gbp: priceNum,
                source: 'youdrive',
              }
            : null;
        })
        .filter(Boolean);
    });
    return deals;
  } catch (e) {
    console.error('[youdrive] ERROR', String(e.message).slice(0, 100));
    return [];
  }
}

// Leasing.com scraper
async function scrapeLeasingCom(page) {
  try {
    await page.goto('https://www.leasing.com/lease-deals?sort=price_asc', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    const deals = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-cy*="vehicle"], .vehicle-card, .listing-item'));
      return cards
        .map((card) => {
          const makeModel = card.querySelector('[data-cy*="model"], .model-name, h2, h3')?.textContent || '';
          const [make, model] = makeModel.split(/\s+/, 2);
          const price = card.querySelector('[data-cy*="price"], .price, .monthly-price')?.textContent || '';
          const priceNum = parseInt(price.match(/\d+/)?.[0] || 0);
          return make && priceNum > 0
            ? {
                make: make.trim(),
                model: model?.trim() || '',
                lender: 'Leasing.com',
                monthly_price_gbp: priceNum,
                source: 'leasing-com',
              }
            : null;
        })
        .filter(Boolean);
    });
    return deals;
  } catch (e) {
    console.error('[leasing-com] ERROR', String(e.message).slice(0, 100));
    return [];
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: UA,
    locale: 'en-GB',
    viewport: { width: 1366, height: 1000 },
  });

  const sites = SITES.filter((s) => !ONLY || ONLY.includes(s.name));
  const allDeals = [];

  for (const site of sites) {
    const page = await context.newPage();
    try {
      console.error(`[${site.name}] Starting...`);
      const deals = await site.scraper(page);
      const count = deals.length;
      console.error(`[${site.name}] Found ${count} deals`);
      allDeals.push(...deals);
      deals.slice(0, 3).forEach((d) => console.error(`  ${d.make} ${d.model} @ £${d.monthly_price_gbp}/mo`));
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();

  // Deduplicate by make|model|lender|price combo
  const seen = new Set();
  const dedup = [];
  for (const deal of allDeals) {
    const key = `${deal.make}|${deal.model}|${deal.lender}|${deal.monthly_price_gbp}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(deal);
  }

  fs.writeFileSync('/tmp/lease-deals.json', JSON.stringify(dedup, null, 2));
  console.error('TOTAL', dedup.length, 'unique deals');

  // Ingest if not dry-run
  if (!DRY && INGEST_KEY && dedup.length) {
    for (let i = 0; i < dedup.length; i += 100) {
      const batch = dedup.slice(i, i + 100);
      try {
        const res = await fetch(INGEST_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-ingest-key': INGEST_KEY,
          },
          body: JSON.stringify(batch),
        });
        const json = await res.json().catch(() => ({}));
        console.error(`ingest batch ${Math.floor(i / 100)}: HTTP ${res.status}, written=${json.written}`);
      } catch (e) {
        console.error(`ingest batch ${Math.floor(i / 100)}: ERROR`, String(e.message).slice(0, 80));
      }
    }
  }
}

main().catch(console.error);
