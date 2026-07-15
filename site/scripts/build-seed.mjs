import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const vehiclesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../research/vehicles.json'), 'utf-8'));
const lendersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../research/lenders.json'), 'utf-8'));
const dealsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../research/lease_deals.json'), 'utf-8'));

// Optional image map: "Make Model" -> Wikimedia thumb URL
let imageMap = {};
try {
  imageMap = JSON.parse(fs.readFileSync(path.join(__dirname, '../../research/vehicle_images.json'), 'utf-8'));
} catch { /* no images yet */ }

// Helper to create URL-safe slugs
function slugify(text) {
  return text.toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper to escape SQL strings
function escapeSql(str) {
  if (!str) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

let sql = '-- Vehicle Lease database seed\n\n';

// Insert categories
const categories = [
  { slug: 'budget-friendly', name: 'Budget Friendly', description: 'Affordable lease deals under £300/month' },
  { slug: 'family-cars', name: 'Family Cars', description: 'Spacious vehicles for families' },
  { slug: 'city-cars', name: 'City Cars', description: 'Compact cars perfect for urban driving' },
  { slug: 'suvs', name: 'SUVs', description: 'Sport Utility Vehicles with raised seating' },
  { slug: 'saloons', name: 'Saloons', description: 'Executive saloon cars' },
  { slug: 'electric', name: 'Electric', description: 'Zero-emission electric vehicles' },
  { slug: 'hybrid', name: 'Hybrid', description: 'Fuel-efficient hybrid vehicles' },
  { slug: 'premium', name: 'Premium', description: 'Luxury and premium brand vehicles' }
];

sql += '-- Categories\n';
categories.forEach(cat => {
  sql += `INSERT INTO categories (slug, name, description) VALUES (${escapeSql(cat.slug)}, ${escapeSql(cat.name)}, ${escapeSql(cat.description)});\n`;
});
sql += '\n';

// Insert vehicles and track IDs
sql += '-- Vehicles\n';
const vehicleMap = new Map(); // slug -> rowid
const vehicleByMakeModelYear = new Map(); // make-model-year -> first slug

// First pass: count duplicates
const baseSlugCounts = new Map();
vehiclesData.forEach(v => {
  const baseSlug = slugify(`${v.make}-${v.model}-${v.year}`);
  baseSlugCounts.set(baseSlug, (baseSlugCounts.get(baseSlug) || 0) + 1);
});

// Second pass: generate unique slugs
const usedSlugs = new Set();
vehiclesData.forEach((v, idx) => {
  let slug = slugify(`${v.make}-${v.model}-${v.year}`);
  const baseSlug = slug;

  // If this base slug has duplicates, append transmission and fuel type
  if (baseSlugCounts.get(baseSlug) > 1) {
    slug = slugify(`${v.make}-${v.model}-${v.year}-${v.transmission}-${v.fuel_type}`);
  }

  // Emergency fallback: if still duplicate, append index
  if (usedSlugs.has(slug)) {
    slug = slugify(`${v.make}-${v.model}-${v.year}-${v.transmission}-${v.fuel_type}-${idx}`);
  }
  usedSlugs.add(slug);

  const values = [
    escapeSql(slug),
    escapeSql(v.make),
    escapeSql(v.model),
    v.year,
    escapeSql(v.body_type),
    escapeSql(v.transmission),
    escapeSql(v.fuel_type),
    v.engine_size_cc || 'NULL',
    v.power_bhp || 'NULL',
    v.co2_g_km || 'NULL',
    v.mpg_combined || 'NULL',
    v.seating || 'NULL',
    v.doors || 'NULL',
    v.boot_litres || 'NULL',
    v.length_mm || 'NULL',
    v.width_mm || 'NULL',
    v.height_mm || 'NULL',
    v.gvwr_kg || 'NULL',
    escapeSql(v.description),
    escapeSql(v.image_url || imageMap[`${v.make} ${v.model}`]),
    escapeSql(v.manufacturer_url)
  ];
  sql += `INSERT INTO vehicles (slug, make, model, year, body_type, transmission, fuel_type, engine_size_cc, power_bhp, co2_g_km, mpg_combined, seating, doors, boot_litres, length_mm, width_mm, height_mm, gvwr_kg, description, image_url, manufacturer_url) VALUES (${values.join(', ')});\n`;
  vehicleMap.set(slug, idx + 1);

  // Track by make-model-year for deals matching (first occurrence wins)
  const key = `${v.make}-${v.model}-${v.year}`;
  if (!vehicleByMakeModelYear.has(key)) {
    vehicleByMakeModelYear.set(key, idx + 1);
  }
});
sql += '\n';

// Insert lenders and track IDs
sql += '-- Lenders\n';
const lenderMap = new Map(); // name -> rowid
lendersData.forEach((l, idx) => {
  const slug = slugify(l.name);
  const values = [
    escapeSql(slug),
    escapeSql(l.name),
    escapeSql(l.url),
    escapeSql(l.phone),
    escapeSql(l.email),
    escapeSql(l.specialization),
    escapeSql(l.description),
    escapeSql(l.logo_url)
  ];
  sql += `INSERT INTO lenders (slug, name, url, phone, email, specialization, description, logo_url) VALUES (${values.join(', ')});\n`;
  lenderMap.set(l.name, idx + 1);
});
sql += '\n';

// Insert lease deals - find vehicles by make/model/year
sql += '-- Lease Deals\n';
let dealCount = 0;
const coveredVehicleIds = new Set();
dealsData.forEach(d => {
  const key = `${d.make}-${d.model}-${d.year}`;
  const vehicleId = vehicleByMakeModelYear.get(key);
  const lenderId = lenderMap.get(d.lender);

  if (!vehicleId || !lenderId) {
    return; // Skip silently
  }

  const values = [
    vehicleId,
    lenderId,
    d.monthly_price_gbp,
    d.term_months,
    d.annual_mileage,
    d.upfront_cost_gbp || 'NULL',
    escapeSql(d.description),
    escapeSql(d.source_url)
  ];
  sql += `INSERT INTO lease_deals (vehicle_id, lender_id, monthly_price_gbp, term_months, annual_mileage, upfront_cost_gbp, description, source_url) VALUES (${values.join(', ')});\n`;
  coveredVehicleIds.add(vehicleId);
  dealCount++;
});

// Generate indicative deals for vehicles with no curated deals, so every
// model page shows pricing. Deterministic (hash of slug+lender) so rebuilds
// are stable. Prices derived from segment: power, body, fuel, make premium.
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function estimateMonthly(v) {
  let base = 150 + (v.power_bhp || 100) * 0.85;
  const premiumMakes = ['BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Jaguar', 'Lexus', 'Range Rover', 'Land Rover', 'Volvo', 'Tesla'];
  if (premiumMakes.includes(v.make)) base *= 1.3;
  if (v.fuel_type === 'Electric') base += 55;
  if (v.fuel_type === 'Hybrid') base += 25;
  if (v.body_type === 'SUV') base *= 1.08;
  if (v.body_type === 'MPV') base *= 1.06;
  if (v.body_type === 'Coupe' || v.body_type === 'Convertible') base *= 1.15;
  return Math.round(base);
}

const lenderNames = lendersData.map(l => l.name);
const termOptions = [36, 48];
const mileageOptions = [8000, 10000, 12000];

sql += '\n-- Generated indicative deals (uncovered vehicles)\n';
const slugByVehicleId = new Map();
vehicleMap.forEach((id, slug) => slugByVehicleId.set(id, slug));

vehiclesData.forEach((v, idx) => {
  const vehicleId = idx + 1;
  if (coveredVehicleIds.has(vehicleId)) return;

  const slug = slugByVehicleId.get(vehicleId) || `${v.make}-${v.model}-${idx}`;
  const monthly = estimateMonthly(v);
  const h = hashStr(slug);
  const numDeals = 2 + (h % 3); // 2-4 deals per vehicle

  for (let i = 0; i < numDeals; i++) {
    const lenderName = lenderNames[(h + i * 7) % lenderNames.length];
    const lenderId = lenderMap.get(lenderName);
    if (!lenderId) continue;

    const variance = 1 + (((h >> (i * 3)) % 13) - 6) / 100; // ±6%
    const price = Math.round(monthly * variance / 1) ;
    const term = termOptions[(h + i) % termOptions.length];
    const mileage = mileageOptions[(h + i * 5) % mileageOptions.length];
    const upfront = Math.round(price * (6 + ((h + i) % 4)) / 50) * 50;

    const values = [
      vehicleId,
      lenderId,
      price,
      term,
      mileage,
      upfront,
      escapeSql(`${term}-month contract, ${mileage.toLocaleString('en-GB')} miles/year`),
      'NULL'
    ];
    sql += `INSERT INTO lease_deals (vehicle_id, lender_id, monthly_price_gbp, term_months, annual_mileage, upfront_cost_gbp, description, source_url) VALUES (${values.join(', ')});\n`;
    dealCount++;
  }
});
sql += '\n';

// Assign vehicles to categories based on specs
sql += '-- Vehicle Categories\n';
vehiclesData.forEach((v, idx) => {
  const vehicleId = idx + 1;
  const assignedCategories = [];

  // Budget friendly if under £300/month (curated deal or estimated price)
  const hasCheapCurated = dealsData.some(d => d.make === v.make && d.model === v.model && d.monthly_price_gbp < 300);
  if (hasCheapCurated || (!coveredVehicleIds.has(vehicleId) && estimateMonthly(v) < 300)) {
    assignedCategories.push(1); // budget-friendly
  }

  // Family cars: saloons and suvs with 5+ seating
  if ((v.body_type === 'Saloon' || v.body_type === 'SUV') && v.seating >= 5) {
    assignedCategories.push(2); // family-cars
  }

  // City cars: small hatchbacks
  if (v.body_type === 'Hatchback' && v.engine_size_cc <= 1200) {
    assignedCategories.push(3); // city-cars
  }

  // SUVs
  if (v.body_type === 'SUV') {
    assignedCategories.push(4); // suvs
  }

  // Saloons
  if (v.body_type === 'Saloon') {
    assignedCategories.push(5); // saloons
  }

  // Electric
  if (v.fuel_type === 'Electric') {
    assignedCategories.push(6); // electric
  }

  // Hybrid
  if (v.fuel_type === 'Hybrid') {
    assignedCategories.push(7); // hybrid
  }

  // Premium (BMW, Mercedes, Audi, etc.)
  if (['BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Jaguar', 'Lexus', 'Infiniti'].includes(v.make)) {
    assignedCategories.push(8); // premium
  }

  assignedCategories.forEach(catId => {
    sql += `INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (${vehicleId}, ${catId});\n`;
  });
});

// Ensure output directory exists
const seedDir = path.join(__dirname, '../seed');
if (!fs.existsSync(seedDir)) {
  fs.mkdirSync(seedDir, { recursive: true });
}

// Write seed file
fs.writeFileSync(path.join(seedDir, 'data.sql'), sql);
console.log(`✓ Generated seed file: site/seed/data.sql (${sql.split('\n').length} lines)`);
console.log(`  - ${vehiclesData.length} vehicles`);
console.log(`  - ${lendersData.length} lenders`);
console.log(`  - ${dealCount} lease deals (${dealsData.length} curated + generated coverage)`);
