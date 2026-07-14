import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const vehiclesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../research/vehicles.json'), 'utf-8'));
const lendersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../research/lenders.json'), 'utf-8'));
const dealsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../research/lease_deals.json'), 'utf-8'));

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
vehiclesData.forEach((v, idx) => {
  const slug = slugify(`${v.make}-${v.model}-${v.year}`);
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
    escapeSql(v.image_url),
    escapeSql(v.manufacturer_url)
  ];
  sql += `INSERT INTO vehicles (slug, make, model, year, body_type, transmission, fuel_type, engine_size_cc, power_bhp, co2_g_km, mpg_combined, seating, doors, boot_litres, length_mm, width_mm, height_mm, gvwr_kg, description, image_url, manufacturer_url) VALUES (${values.join(', ')});\n`;
  vehicleMap.set(slug, idx + 1);
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

// Insert lease deals
sql += '-- Lease Deals\n';
dealsData.forEach(d => {
  const vehicleSlug = slugify(`${d.make}-${d.model}-${d.year}`);
  const vehicleId = vehicleMap.get(vehicleSlug);
  const lenderId = lenderMap.get(d.lender);

  if (!vehicleId || !lenderId) {
    console.warn(`Skipping deal: could not find vehicle ${vehicleSlug} or lender ${d.lender}`);
    return;
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
});
sql += '\n';

// Assign vehicles to categories based on specs
sql += '-- Vehicle Categories\n';
vehiclesData.forEach((v, idx) => {
  const vehicleId = idx + 1;
  const assignedCategories = [];

  // Budget friendly if under £300/month
  if (dealsData.some(d => d.make === v.make && d.model === v.model && d.monthly_price_gbp < 300)) {
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
console.log(`  - ${dealsData.length} lease deals`);
