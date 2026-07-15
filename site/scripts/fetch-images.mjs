// Fetch car images from Wikipedia (PageImages API → Wikimedia Commons thumbs).
// Writes research/vehicle_images.json mapping "Make Model" -> image URL.
// Run: node site/scripts/fetch-images.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vehicles = JSON.parse(fs.readFileSync(path.join(__dirname, '../../research/vehicles.json'), 'utf-8'));
const outPath = path.join(__dirname, '../../research/vehicle_images.json');

// Unique make+model combos (variants share one photo)
const combos = [...new Map(vehicles.map(v => [`${v.make} ${v.model}`, v])).keys()];

// Wikipedia article title overrides where "Make Model" doesn't resolve well
const overrides = {
  'MG MG3': 'MG 3',
  'MG MG4': 'MG 4',
  'MG 4': 'MG 4',
  'Vauxhall Mokka': 'Opel Mokka',
  'Vauxhall Grandland': 'Opel Grandland',
  'Range Rover Evoque': 'Range Rover Evoque',
  'Range Rover Sport': 'Range Rover Sport'
};

async function fetchImage(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail&pithumbsize=640&redirects=1&titles=${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'vehicle-lease.co.uk image fetcher (doug.scott@asapventures.co.uk)' } });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages || {};
  for (const p of Object.values(pages)) {
    if (p?.thumbnail?.source) return p.thumbnail.source;
  }
  return null;
}

const results = {};
let found = 0;

for (const combo of combos) {
  const candidates = [
    overrides[combo] || combo,
    `${combo} (car)`,
    combo.split(' ').slice(1).join(' ') // model only, last resort
  ];
  let img = null;
  for (const title of candidates) {
    img = await fetchImage(title);
    if (img) break;
    await new Promise(r => setTimeout(r, 120));
  }
  if (img) {
    results[combo] = img;
    found++;
    console.log(`✓ ${combo}`);
  } else {
    console.log(`✗ ${combo} — no image, will use silhouette`);
  }
  await new Promise(r => setTimeout(r, 120));
}

fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`\nSaved ${found}/${combos.length} images to research/vehicle_images.json`);
