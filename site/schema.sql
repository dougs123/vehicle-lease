-- Vehicles: UK car models with specs
CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  body_type TEXT,
  transmission TEXT,
  fuel_type TEXT,
  engine_size_cc INTEGER,
  power_bhp INTEGER,
  co2_g_km INTEGER,
  mpg_combined REAL,
  seating INTEGER,
  doors INTEGER,
  boot_litres INTEGER,
  length_mm INTEGER,
  width_mm INTEGER,
  height_mm INTEGER,
  gvwr_kg INTEGER,
  description TEXT,
  image_url TEXT,
  manufacturer_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Lenders/Brokers: companies offering lease deals
CREATE TABLE IF NOT EXISTS lenders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  phone TEXT,
  email TEXT,
  specialization TEXT,
  description TEXT,
  logo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Lease deals: typical monthly rates for vehicle + lender combos
CREATE TABLE IF NOT EXISTS lease_deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  lender_id INTEGER NOT NULL,
  monthly_price_gbp REAL NOT NULL,
  term_months INTEGER,
  annual_mileage INTEGER,
  upfront_cost_gbp REAL,
  description TEXT,
  source_url TEXT,
  last_verified DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (lender_id) REFERENCES lenders(id),
  UNIQUE(vehicle_id, lender_id, term_months, annual_mileage)
);

-- Categories for hub pages (best deals, by segment, etc.)
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT
);

-- Many-to-many: vehicles in categories
CREATE TABLE IF NOT EXISTS vehicle_categories (
  vehicle_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  PRIMARY KEY (vehicle_id, category_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles(make, model);
CREATE INDEX IF NOT EXISTS idx_vehicles_body_type ON vehicles(body_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_fuel_type ON vehicles(fuel_type);
CREATE INDEX IF NOT EXISTS idx_lease_deals_vehicle ON lease_deals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_lease_deals_lender ON lease_deals(lender_id);
CREATE INDEX IF NOT EXISTS idx_lease_deals_price ON lease_deals(monthly_price_gbp);
CREATE INDEX IF NOT EXISTS idx_vehicle_categories ON vehicle_categories(category_id);
