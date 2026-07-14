-- Vehicle Lease database seed

-- Categories
INSERT INTO categories (slug, name, description) VALUES ('budget-friendly', 'Budget Friendly', 'Affordable lease deals under £300/month');
INSERT INTO categories (slug, name, description) VALUES ('family-cars', 'Family Cars', 'Spacious vehicles for families');
INSERT INTO categories (slug, name, description) VALUES ('city-cars', 'City Cars', 'Compact cars perfect for urban driving');
INSERT INTO categories (slug, name, description) VALUES ('suvs', 'SUVs', 'Sport Utility Vehicles with raised seating');
INSERT INTO categories (slug, name, description) VALUES ('saloons', 'Saloons', 'Executive saloon cars');
INSERT INTO categories (slug, name, description) VALUES ('electric', 'Electric', 'Zero-emission electric vehicles');
INSERT INTO categories (slug, name, description) VALUES ('hybrid', 'Hybrid', 'Fuel-efficient hybrid vehicles');
INSERT INTO categories (slug, name, description) VALUES ('premium', 'Premium', 'Luxury and premium brand vehicles');

-- Vehicles
INSERT INTO vehicles (slug, make, model, year, body_type, transmission, fuel_type, engine_size_cc, power_bhp, co2_g_km, mpg_combined, seating, doors, boot_litres, length_mm, width_mm, height_mm, gvwr_kg, description, image_url, manufacturer_url) VALUES ('ford-fiesta-2024', 'Ford', 'Fiesta', 2024, 'Hatchback', 'Manual', 'Petrol', 1200, 85, 125, 47, 5, 5, 311, NULL, NULL, NULL, NULL, 'Compact and economical city car, perfect for urban driving', NULL, 'https://www.ford.co.uk/vehicles/new-fiesta');
INSERT INTO vehicles (slug, make, model, year, body_type, transmission, fuel_type, engine_size_cc, power_bhp, co2_g_km, mpg_combined, seating, doors, boot_litres, length_mm, width_mm, height_mm, gvwr_kg, description, image_url, manufacturer_url) VALUES ('ford-focus-2024', 'Ford', 'Focus', 2024, 'Hatchback', 'Automatic', 'Petrol', 1500, 125, 135, 45, 5, 5, 356, NULL, NULL, NULL, NULL, 'Best-selling family hatchback with excellent handling', NULL, 'https://www.ford.co.uk/vehicles/new-focus');
INSERT INTO vehicles (slug, make, model, year, body_type, transmission, fuel_type, engine_size_cc, power_bhp, co2_g_km, mpg_combined, seating, doors, boot_litres, length_mm, width_mm, height_mm, gvwr_kg, description, image_url, manufacturer_url) VALUES ('ford-mondeo-2024', 'Ford', 'Mondeo', 2024, 'Saloon', 'Automatic', 'Hybrid', 1500, 187, 95, 62, 5, 4, 525, NULL, NULL, NULL, NULL, 'Executive saloon combining comfort and efficiency', NULL, 'https://www.ford.co.uk/vehicles/new-mondeo');
INSERT INTO vehicles (slug, make, model, year, body_type, transmission, fuel_type, engine_size_cc, power_bhp, co2_g_km, mpg_combined, seating, doors, boot_litres, length_mm, width_mm, height_mm, gvwr_kg, description, image_url, manufacturer_url) VALUES ('ford-kuga-2024', 'Ford', 'Kuga', 2024, 'SUV', 'Automatic', 'Hybrid', 1500, 187, 105, 55, 5, 5, 456, NULL, NULL, NULL, NULL, 'Mid-size SUV with hybrid efficiency and spacious interior', NULL, 'https://www.ford.co.uk/vehicles/new-kuga');
INSERT INTO vehicles (slug, make, model, year, body_type, transmission, fuel_type, engine_size_cc, power_bhp, co2_g_km, mpg_combined, seating, doors, boot_litres, length_mm, width_mm, height_mm, gvwr_kg, description, image_url, manufacturer_url) VALUES ('vauxhall-corsa-2024', 'Vauxhall', 'Corsa', 2024, 'Hatchback', 'Manual', 'Petrol', 1200, 100, 128, 46, 5, 5, 309, NULL, NULL, NULL, NULL, 'Stylish city car with modern technology', NULL, 'https://www.vauxhall.co.uk/vehicles/new-corsa');
INSERT INTO vehicles (slug, make, model, year, body_type, transmission, fuel_type, engine_size_cc, power_bhp, co2_g_km, mpg_combined, seating, doors, boot_litres, length_mm, width_mm, height_mm, gvwr_kg, description, image_url, manufacturer_url) VALUES ('vauxhall-astra-2024', 'Vauxhall', 'Astra', 2024, 'Hatchback', 'Automatic', 'Petrol', 1400, 130, 135, 44, 5, 5, 370, NULL, NULL, NULL, NULL, 'Practical family hatchback with spacious cabin', NULL, 'https://www.vauxhall.co.uk/vehicles/new-astra');
INSERT INTO vehicles (slug, make, model, year, body_type, transmission, fuel_type, engine_size_cc, power_bhp, co2_g_km, mpg_combined, seating, doors, boot_litres, length_mm, width_mm, height_mm, gvwr_kg, description, image_url, manufacturer_url) VALUES ('bmw-3-series-2024', 'BMW', '3 Series', 2024, 'Saloon', 'Automatic', 'Petrol', 1998, 255, 155, 38, 5, 4, 460, NULL, NULL, NULL, NULL, 'Premium executive saloon with superior dynamics', NULL, 'https://www.bmw.co.uk/en/models/sedans/3-series');
INSERT INTO vehicles (slug, make, model, year, body_type, transmission, fuel_type, engine_size_cc, power_bhp, co2_g_km, mpg_combined, seating, doors, boot_litres, length_mm, width_mm, height_mm, gvwr_kg, description, image_url, manufacturer_url) VALUES ('bmw-x3-2024', 'BMW', 'X3', 2024, 'SUV', 'Automatic', 'Petrol', 1998, 255, 175, 34, 5, 5, 553, NULL, NULL, NULL, NULL, 'Premium compact SUV with luxury appointments', NULL, 'https://www.bmw.co.uk/en/models/suvs/x3');
INSERT INTO vehicles (slug, make, model, year, body_type, transmission, fuel_type, engine_size_cc, power_bhp, co2_g_km, mpg_combined, seating, doors, boot_litres, length_mm, width_mm, height_mm, gvwr_kg, description, image_url, manufacturer_url) VALUES ('nissan-qashqai-2024', 'Nissan', 'Qashqai', 2024, 'SUV', 'Automatic', 'Petrol', 1600, 158, 145, 42, 5, 5, 430, NULL, NULL, NULL, NULL, 'Popular compact crossover with raised seating position', NULL, 'https://www.nissan.co.uk/vehicles/new-qashqai.html');
INSERT INTO vehicles (slug, make, model, year, body_type, transmission, fuel_type, engine_size_cc, power_bhp, co2_g_km, mpg_combined, seating, doors, boot_litres, length_mm, width_mm, height_mm, gvwr_kg, description, image_url, manufacturer_url) VALUES ('tesla-model-3-2024', 'Tesla', 'Model 3', 2024, 'Saloon', 'Automatic', 'Electric', NULL, 325, NULL, 120, 5, 4, 578, NULL, NULL, NULL, NULL, 'Premium electric saloon with cutting-edge technology', NULL, 'https://www.tesla.com/en_gb/models/3');

-- Lenders
INSERT INTO lenders (slug, name, url, phone, email, specialization, description, logo_url) VALUES ('lease-loco', 'Lease Loco', 'https://www.leaseloco.com', '0333 300 0370', 'info@leaseloco.com', 'Personal lease deals', 'UK''s biggest car lease deal comparison site with offers from multiple lenders', NULL);
INSERT INTO lenders (slug, name, url, phone, email, specialization, description, logo_url) VALUES ('you-drive', 'You Drive', 'https://www.youdrive.com', '0203 744 3000', 'enquiries@youdrive.com', 'Personal car leasing', 'Award-winning personal car lease provider', NULL);
INSERT INTO lenders (slug, name, url, phone, email, specialization, description, logo_url) VALUES ('enterprise-rent-a-car', 'Enterprise Rent-A-Car', 'https://www.enterprise.co.uk', '0800 800 227', NULL, 'Car rental and lease', 'Long-term lease and short-term rental options', NULL);
INSERT INTO lenders (slug, name, url, phone, email, specialization, description, logo_url) VALUES ('leasingcom', 'Leasing.com', 'https://www.leasing.com', '01628 770055', 'hello@leasing.com', 'Vehicle leasing platform', 'Lease deals from multiple lenders on one platform', NULL);
INSERT INTO lenders (slug, name, url, phone, email, specialization, description, logo_url) VALUES ('cazoo', 'Cazoo', 'https://www.cazoo.co.uk', '0330 180 0046', NULL, 'Online car dealer with lease options', 'Buy or lease cars online with delivery options', NULL);
INSERT INTO lenders (slug, name, url, phone, email, specialization, description, logo_url) VALUES ('like-you-drive', 'Like You Drive', 'https://likeyoudrive.com', '0800 130 3636', NULL, 'Personal car leasing', 'Personal leasing contracts with flexible options', NULL);
INSERT INTO lenders (slug, name, url, phone, email, specialization, description, logo_url) VALUES ('vanarama', 'Vanarama', 'https://www.vanarama.com', '0330 111 0222', 'sales@vanarama.com', 'Van and car leasing', 'Wide range of vehicles for personal and business lease', NULL);
INSERT INTO lenders (slug, name, url, phone, email, specialization, description, logo_url) VALUES ('choosemycar', 'ChooseMyCar', 'https://www.choosemycar.com', '0800 043 8000', 'hello@choosemycar.com', 'Personal and business leasing', 'Flexible car lease contracts with comprehensive packages', NULL);

-- Lease Deals
INSERT INTO lease_deals (vehicle_id, lender_id, monthly_price_gbp, term_months, annual_mileage, upfront_cost_gbp, description, source_url) VALUES (1, 1, 249, 48, 10000, 1500, '48-month contract with 10k miles/year', NULL);
INSERT INTO lease_deals (vehicle_id, lender_id, monthly_price_gbp, term_months, annual_mileage, upfront_cost_gbp, description, source_url) VALUES (1, 2, 265, 36, 12000, 2000, '36-month contract with 12k miles/year', NULL);
INSERT INTO lease_deals (vehicle_id, lender_id, monthly_price_gbp, term_months, annual_mileage, upfront_cost_gbp, description, source_url) VALUES (2, 1, 319, 48, 10000, 1500, '48-month contract with 10k miles/year', NULL);
INSERT INTO lease_deals (vehicle_id, lender_id, monthly_price_gbp, term_months, annual_mileage, upfront_cost_gbp, description, source_url) VALUES (2, 2, 335, 36, 12000, 2000, '36-month contract with 12k miles/year', NULL);
INSERT INTO lease_deals (vehicle_id, lender_id, monthly_price_gbp, term_months, annual_mileage, upfront_cost_gbp, description, source_url) VALUES (3, 4, 449, 48, 15000, 2500, '48-month contract with 15k miles/year', NULL);
INSERT INTO lease_deals (vehicle_id, lender_id, monthly_price_gbp, term_months, annual_mileage, upfront_cost_gbp, description, source_url) VALUES (4, 1, 389, 48, 12000, 2000, '48-month contract with 12k miles/year', NULL);
INSERT INTO lease_deals (vehicle_id, lender_id, monthly_price_gbp, term_months, annual_mileage, upfront_cost_gbp, description, source_url) VALUES (5, 2, 259, 48, 10000, 1500, '48-month contract with 10k miles/year', NULL);
INSERT INTO lease_deals (vehicle_id, lender_id, monthly_price_gbp, term_months, annual_mileage, upfront_cost_gbp, description, source_url) VALUES (6, 4, 329, 48, 12000, 1500, '48-month contract with 12k miles/year', NULL);
INSERT INTO lease_deals (vehicle_id, lender_id, monthly_price_gbp, term_months, annual_mileage, upfront_cost_gbp, description, source_url) VALUES (7, 4, 499, 48, 15000, 3000, '48-month contract with 15k miles/year', NULL);
INSERT INTO lease_deals (vehicle_id, lender_id, monthly_price_gbp, term_months, annual_mileage, upfront_cost_gbp, description, source_url) VALUES (8, 8, 579, 48, 15000, 3500, '48-month contract with 15k miles/year', NULL);
INSERT INTO lease_deals (vehicle_id, lender_id, monthly_price_gbp, term_months, annual_mileage, upfront_cost_gbp, description, source_url) VALUES (9, 1, 369, 48, 12000, 2000, '48-month contract with 12k miles/year', NULL);
INSERT INTO lease_deals (vehicle_id, lender_id, monthly_price_gbp, term_months, annual_mileage, upfront_cost_gbp, description, source_url) VALUES (10, 7, 549, 48, 15000, 4000, '48-month contract with 15k miles/year', NULL);

-- Vehicle Categories
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (1, 1);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (1, 3);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (3, 2);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (3, 5);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (3, 7);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (4, 2);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (4, 4);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (4, 7);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (5, 1);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (5, 3);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (7, 2);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (7, 5);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (7, 8);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (8, 2);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (8, 4);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (8, 8);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (9, 2);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (9, 4);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (10, 2);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (10, 5);
INSERT INTO vehicle_categories (vehicle_id, category_id) VALUES (10, 6);
