// Vehicle Lease CF Worker
// SSR for vehicle-lease.co.uk

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Route handlers
    if (pathname === '/') {
      return handleHome(env);
    } else if (pathname === '/vehicles') {
      return handleVehiclesList(env, url);
    } else if (pathname.startsWith('/vehicles/')) {
      const slug = pathname.slice('/vehicles/'.length).replace(/\/$/, '');
      return handleVehicleDetail(env, slug);
    } else if (pathname === '/lenders') {
      return handleLendersList(env);
    } else if (pathname.startsWith('/lenders/')) {
      const slug = pathname.slice('/lenders/'.length).replace(/\/$/, '');
      return handleLenderDetail(env, slug);
    } else if (pathname.startsWith('/compare/')) {
      const comparePart = pathname.slice('/compare/'.length).replace(/\/$/, '');
      const [id1, id2] = comparePart.split('-vs-');
      return handleComparison(env, id1, id2);
    } else if (pathname.startsWith('/categories/')) {
      const slug = pathname.slice('/categories/'.length).replace(/\/$/, '');
      return handleCategory(env, slug);
    } else if (pathname === '/sitemap.xml') {
      return handleSitemap(env);
    } else if (pathname === '/llms.txt') {
      return handleLlmsTxt(env);
    } else if (pathname === '/admin/seed' && request.method === 'POST') {
      return handleSeed(env, request);
    } else {
      return html404();
    }
  }
};

// ============================================================================
// Page Handlers
// ============================================================================

async function handleHome(env) {
  const db = env.DB;

  // Get featured vehicles (hybrid/electric + under £400/month)
  const featured = await db
    .prepare(`
      SELECT DISTINCT v.*, MIN(ld.monthly_price_gbp) as min_price
      FROM vehicles v
      LEFT JOIN lease_deals ld ON v.id = ld.vehicle_id
      WHERE v.fuel_type IN ('Hybrid', 'Electric')
      GROUP BY v.id
      ORDER BY min_price ASC
      LIMIT 6
    `)
    .all();

  // Get budget deals (under £300/month)
  const budgetDeals = await db
    .prepare(`
      SELECT v.make, v.model, v.year, MIN(ld.monthly_price_gbp) as min_price
      FROM vehicles v
      JOIN lease_deals ld ON v.id = ld.vehicle_id
      GROUP BY v.id
      HAVING min_price < 300
      ORDER BY min_price ASC
      LIMIT 8
    `)
    .all();

  // Get categories
  const categories = await db
    .prepare('SELECT slug, name, description FROM categories ORDER BY name ASC')
    .all();

  const content = `
    <div class="hero">
      <h1>Find Your Perfect Lease Deal</h1>
      <p>Search over 500 UK car models and compare lease offers from 8+ lenders</p>
      <form method="GET" action="/vehicles" class="search-bar">
        <input type="text" name="q" placeholder="Search by make or model..." required>
        <button type="submit">Search</button>
      </form>
    </div>

    <section class="section">
      <h2>Budget-Friendly Deals (Under £300/month)</h2>
      <div class="vehicle-grid">
        ${budgetDeals.results.map(v => `
          <a href="/vehicles/${slugify(v.make)}-${slugify(v.model)}-${v.year}" class="vehicle-card">
            <h3>${v.make} ${v.model}</h3>
            <p class="price">From £${v.min_price}/month</p>
          </a>
        `).join('')}
      </div>
    </section>

    <section class="section">
      <h2>Eco-Friendly Options</h2>
      <div class="vehicle-grid">
        ${featured.results.map(v => `
          <a href="/vehicles/${slugify(v.make)}-${slugify(v.model)}-${v.year}" class="vehicle-card">
            <h3>${v.make} ${v.model}</h3>
            <p class="badge">${v.fuel_type}</p>
            <p class="price">From £${Math.round(v.min_price)}/month</p>
          </a>
        `).join('')}
      </div>
    </section>

    <section class="section">
      <h2>Browse by Category</h2>
      <div class="category-grid">
        ${categories.results.map(c => `
          <a href="/categories/${c.slug}" class="category-card">
            <h3>${c.name}</h3>
            <p>${c.description}</p>
          </a>
        `).join('')}
      </div>
    </section>
  `;

  return htmlResponse('Vehicle Lease - Find Your Perfect Lease Deal', content);
}

async function handleVehiclesList(env, url) {
  const db = env.DB;
  const q = url.searchParams.get('q') || '';
  const fuelType = url.searchParams.get('fuel') || '';
  const bodyType = url.searchParams.get('body') || '';

  let query = `
    SELECT v.*, MIN(ld.monthly_price_gbp) as min_price
    FROM vehicles v
    LEFT JOIN lease_deals ld ON v.id = ld.vehicle_id
    WHERE 1=1
  `;

  if (q) {
    query += ` AND (v.make LIKE '%${q}%' OR v.model LIKE '%${q}%')`;
  }
  if (fuelType) {
    query += ` AND v.fuel_type = '${fuelType}'`;
  }
  if (bodyType) {
    query += ` AND v.body_type = '${bodyType}'`;
  }

  query += ` GROUP BY v.id ORDER BY v.make, v.model LIMIT 100`;

  const vehicles = await db.prepare(query).all();

  const content = `
    <h1>Browse Vehicles</h1>
    <form method="GET" class="filter-form">
      <input type="text" name="q" placeholder="Search..." value="${q}">
      <select name="fuel">
        <option value="">All Fuel Types</option>
        <option value="Petrol" ${fuelType === 'Petrol' ? 'selected' : ''}>Petrol</option>
        <option value="Diesel" ${fuelType === 'Diesel' ? 'selected' : ''}>Diesel</option>
        <option value="Hybrid" ${fuelType === 'Hybrid' ? 'selected' : ''}>Hybrid</option>
        <option value="Electric" ${fuelType === 'Electric' ? 'selected' : ''}>Electric</option>
      </select>
      <button type="submit">Filter</button>
    </form>

    <div class="vehicle-grid">
      ${vehicles.results.map(v => `
        <a href="/vehicles/${slugify(v.make)}-${slugify(v.model)}-${v.year}" class="vehicle-card">
          <h3>${v.make} ${v.model}</h3>
          <p class="meta">${v.year} • ${v.body_type}</p>
          <p class="price">From £${Math.round(v.min_price || 0)}/month</p>
        </a>
      `).join('')}
    </div>
  `;

  return htmlResponse('Browse Vehicles', content);
}

async function handleVehicleDetail(env, slug) {
  const db = env.DB;

  const vehicle = await db
    .prepare('SELECT * FROM vehicles WHERE slug = ?')
    .bind(slug)
    .first();

  if (!vehicle) return html404();

  const deals = await db
    .prepare(`
      SELECT ld.*, l.name as lender_name, l.url as lender_url
      FROM lease_deals ld
      JOIN lenders l ON ld.lender_id = l.id
      WHERE ld.vehicle_id = ?
      ORDER BY ld.monthly_price_gbp ASC
    `)
    .bind(vehicle.id)
    .all();

  const title = `${vehicle.make} ${vehicle.model} ${vehicle.year} - Lease Deals`;
  const content = `
    <div class="vehicle-hero">
      <h1>${vehicle.make} ${vehicle.model}</h1>
      <p class="year">${vehicle.year} • ${vehicle.body_type}</p>
    </div>

    <div class="specs-grid">
      <div class="spec">
        <strong>Transmission</strong>
        <p>${vehicle.transmission}</p>
      </div>
      <div class="spec">
        <strong>Fuel Type</strong>
        <p>${vehicle.fuel_type}</p>
      </div>
      <div class="spec">
        <strong>CO2 Emissions</strong>
        <p>${vehicle.co2_g_km}g/km</p>
      </div>
      <div class="spec">
        <strong>Combined MPG</strong>
        <p>${vehicle.mpg_combined}</p>
      </div>
      <div class="spec">
        <strong>Power</strong>
        <p>${vehicle.power_bhp}bhp</p>
      </div>
      <div class="spec">
        <strong>Seating</strong>
        <p>${vehicle.seating} seats</p>
      </div>
    </div>

    <h2>Available Lease Deals</h2>
    <div class="deals-table">
      <table>
        <thead>
          <tr>
            <th>Lender</th>
            <th>Monthly Price</th>
            <th>Term</th>
            <th>Annual Mileage</th>
            <th>Upfront</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${deals.results.map(d => `
            <tr>
              <td><strong>${d.lender_name}</strong></td>
              <td>£${d.monthly_price_gbp}</td>
              <td>${d.term_months}m</td>
              <td>${d.annual_mileage.toLocaleString()}/yr</td>
              <td>${d.upfront_cost_gbp ? '£' + d.upfront_cost_gbp : 'N/A'}</td>
              <td><a href="${d.lender_url}" target="_blank">View Deal</a></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="manufacturer-link">
      <a href="${vehicle.manufacturer_url}" target="_blank">View on Manufacturer Site</a>
    </div>
  `;

  return htmlResponse(title, content);
}

async function handleLendersList(env) {
  const db = env.DB;

  const lenders = await db
    .prepare(`
      SELECT l.*, COUNT(DISTINCT ld.vehicle_id) as vehicle_count
      FROM lenders l
      LEFT JOIN lease_deals ld ON l.id = ld.lender_id
      GROUP BY l.id
      ORDER BY l.name ASC
    `)
    .all();

  const content = `
    <h1>Browse Lenders</h1>
    <p>Find the perfect lease partner for your next car</p>

    <div class="lender-list">
      ${lenders.results.map(l => `
        <div class="lender-card">
          <h3><a href="/lenders/${l.slug}">${l.name}</a></h3>
          <p>${l.description}</p>
          <p class="meta">${l.vehicle_count} vehicles available</p>
          ${l.phone ? `<p class="contact">📞 ${l.phone}</p>` : ''}
          ${l.url ? `<a href="${l.url}" target="_blank">Visit Website</a>` : ''}
        </div>
      `).join('')}
    </div>
  `;

  return htmlResponse('Browse Lenders', content);
}

async function handleLenderDetail(env, slug) {
  const db = env.DB;

  const lender = await db
    .prepare('SELECT * FROM lenders WHERE slug = ?')
    .bind(slug)
    .first();

  if (!lender) return html404();

  const deals = await db
    .prepare(`
      SELECT v.*, ld.monthly_price_gbp
      FROM lease_deals ld
      JOIN vehicles v ON ld.vehicle_id = v.id
      WHERE ld.lender_id = ?
      ORDER BY ld.monthly_price_gbp ASC
      LIMIT 50
    `)
    .bind(lender.id)
    .all();

  const title = `${lender.name} - Vehicle Leasing`;
  const content = `
    <div class="lender-hero">
      <h1>${lender.name}</h1>
      <p>${lender.description}</p>
    </div>

    ${lender.phone ? `<p>📞 <a href="tel:${lender.phone}">${lender.phone}</a></p>` : ''}
    ${lender.email ? `<p>✉️ <a href="mailto:${lender.email}">${lender.email}</a></p>` : ''}
    ${lender.url ? `<p><a href="${lender.url}" target="_blank">Visit Website →</a></p>` : ''}

    <h2>Available Vehicles</h2>
    <div class="vehicle-grid">
      ${deals.results.map(v => `
        <a href="/vehicles/${slugify(v.make)}-${slugify(v.model)}-${v.year}" class="vehicle-card">
          <h3>${v.make} ${v.model}</h3>
          <p class="price">£${v.monthly_price_gbp}/month</p>
        </a>
      `).join('')}
    </div>
  `;

  return htmlResponse(title, content);
}

async function handleComparison(env, id1, id2) {
  const db = env.DB;

  const v1 = await db.prepare('SELECT * FROM vehicles WHERE slug = ?').bind(id1).first();
  const v2 = await db.prepare('SELECT * FROM vehicles WHERE slug = ?').bind(id2).first();

  if (!v1 || !v2) return html404();

  const deals1 = await db
    .prepare('SELECT MIN(monthly_price_gbp) as price FROM lease_deals WHERE vehicle_id = ?')
    .bind(v1.id)
    .first();
  const deals2 = await db
    .prepare('SELECT MIN(monthly_price_gbp) as price FROM lease_deals WHERE vehicle_id = ?')
    .bind(v2.id)
    .first();

  const title = `${v1.make} ${v1.model} vs ${v2.make} ${v2.model}`;
  const content = `
    <h1>${title}</h1>

    <table class="comparison-table">
      <thead>
        <tr>
          <th></th>
          <th>${v1.make} ${v1.model}</th>
          <th>${v2.make} ${v2.model}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Body Type</strong></td>
          <td>${v1.body_type}</td>
          <td>${v2.body_type}</td>
        </tr>
        <tr>
          <td><strong>Fuel Type</strong></td>
          <td>${v1.fuel_type}</td>
          <td>${v2.fuel_type}</td>
        </tr>
        <tr>
          <td><strong>Power</strong></td>
          <td>${v1.power_bhp}bhp</td>
          <td>${v2.power_bhp}bhp</td>
        </tr>
        <tr>
          <td><strong>CO2 Emissions</strong></td>
          <td>${v1.co2_g_km}g/km</td>
          <td>${v2.co2_g_km}g/km</td>
        </tr>
        <tr>
          <td><strong>From £/month</strong></td>
          <td>£${deals1.price}</td>
          <td>£${deals2.price}</td>
        </tr>
      </tbody>
    </table>
  `;

  return htmlResponse(title, content);
}

async function handleCategory(env, slug) {
  const db = env.DB;

  const category = await db
    .prepare('SELECT * FROM categories WHERE slug = ?')
    .bind(slug)
    .first();

  if (!category) return html404();

  const vehicles = await db
    .prepare(`
      SELECT v.*, MIN(ld.monthly_price_gbp) as min_price
      FROM vehicles v
      JOIN vehicle_categories vc ON v.id = vc.vehicle_id
      LEFT JOIN lease_deals ld ON v.id = ld.vehicle_id
      WHERE vc.category_id = ?
      GROUP BY v.id
      ORDER BY min_price ASC
      LIMIT 50
    `)
    .bind(category.id)
    .all();

  const title = `${category.name} - Vehicle Leasing Deals`;
  const content = `
    <h1>${category.name}</h1>
    <p>${category.description}</p>

    <div class="vehicle-grid">
      ${vehicles.results.map(v => `
        <a href="/vehicles/${slugify(v.make)}-${slugify(v.model)}-${v.year}" class="vehicle-card">
          <h3>${v.make} ${v.model}</h3>
          <p class="price">From £${Math.round(v.min_price)}/month</p>
        </a>
      `).join('')}
    </div>
  `;

  return htmlResponse(title, content);
}

async function handleSitemap(env) {
  const db = env.DB;

  const vehicles = await db.prepare('SELECT slug FROM vehicles ORDER BY slug ASC').all();
  const lenders = await db.prepare('SELECT slug FROM lenders ORDER BY slug ASC').all();
  const categories = await db.prepare('SELECT slug FROM categories ORDER BY slug ASC').all();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${env.SITE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
`;

  vehicles.results.forEach(v => {
    xml += `  <url>
    <loc>${env.SITE_URL}/vehicles/${v.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
  });

  lenders.results.forEach(l => {
    xml += `  <url>
    <loc>${env.SITE_URL}/lenders/${l.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
  });

  categories.results.forEach(c => {
    xml += `  <url>
    <loc>${env.SITE_URL}/categories/${c.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>\n`;
  });

  xml += `</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
}

async function handleLlmsTxt(env) {
  const db = env.DB;

  const categories = await db.prepare('SELECT name FROM categories ORDER BY name ASC').all();
  const vehicleCount = await db.prepare('SELECT COUNT(*) as count FROM vehicles').first();
  const lenderCount = await db.prepare('SELECT COUNT(*) as count FROM lenders').first();

  let txt = `# Vehicle Lease Directory

A definitive UK vehicle lease database. Find your perfect car lease deal from multiple lenders.

## About

vehicle-lease.co.uk aggregates lease data for ${vehicleCount.count} UK car models from ${lenderCount.count} major lenders and brokers.

## Hub Pages

${categories.results.map(c => `- /${c.name.toLowerCase().replace(/\s+/g, '-')}`).join('\n')}

## Navigation

- /vehicles - Browse all vehicles
- /lenders - Browse all lenders
- /categories/:slug - Vehicles by category

## Data

- Monthly lease pricing from UK brokers (Lease Loco, You Drive, Leasing.com, and more)
- Vehicle specifications (power, CO2, MPG, seating)
- Comparison tools to find the best deal

Visit /api/items for raw JSON data export (when API is ready).
`;

  return new Response(txt, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

async function handleSeed(env, request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const seedToken = env.SEED_TOKEN || 'dev-seed-token';

  if (token !== seedToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Read and execute seed SQL
    const seedSql = await fetch(new URL('../../site/seed/data.sql', import.meta.url)).then(r => r.text());
    const statements = seedSql.split(';').filter(s => s.trim());

    for (const stmt of statements) {
      if (stmt.trim()) {
        await env.DB.prepare(stmt).run();
      }
    }

    return new Response(JSON.stringify({ success: true, rows: statements.length }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ============================================================================
// Helpers
// ============================================================================

function slugify(text) {
  return text.toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function htmlResponse(title, content) {
  return new Response(html(title, content), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function html(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Vehicle Lease</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f9f9f9;
    }
    header {
      background: #000;
      color: white;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    header h1 { font-size: 1.5rem; }
    header a { color: white; text-decoration: none; margin-left: 2rem; }
    main { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .hero { text-align: center; margin: 3rem 0; }
    .hero h1 { font-size: 2.5rem; margin: 1rem 0; }
    .hero p { font-size: 1.2rem; color: #666; }
    .search-bar {
      display: flex;
      gap: 0.5rem;
      margin-top: 1.5rem;
      justify-content: center;
    }
    .search-bar input {
      padding: 0.75rem 1rem;
      font-size: 1rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      width: 300px;
    }
    .search-bar button {
      padding: 0.75rem 1.5rem;
      background: #0066cc;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    .search-bar button:hover { background: #0052a3; }
    .section { margin: 3rem 0; }
    .section h2 { margin: 1.5rem 0; font-size: 1.8rem; }
    .vehicle-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1.5rem;
    }
    .vehicle-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      color: #333;
      border: 1px solid #eee;
      transition: all 0.2s;
    }
    .vehicle-card:hover {
      border-color: #0066cc;
      box-shadow: 0 2px 8px rgba(0,102,204,0.1);
    }
    .vehicle-card h3 { margin-bottom: 0.5rem; }
    .vehicle-card .price {
      font-weight: bold;
      color: #0066cc;
      font-size: 1.1rem;
      margin-top: 0.5rem;
    }
    .vehicle-card .badge {
      display: inline-block;
      background: #e8f4f8;
      color: #0066cc;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.9rem;
      margin-top: 0.5rem;
    }
    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 2rem;
    }
    .category-card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      text-decoration: none;
      color: #333;
      border: 1px solid #eee;
    }
    .category-card h3 { margin-bottom: 0.5rem; font-size: 1.3rem; }
    .specs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin: 2rem 0;
    }
    .spec {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      border: 1px solid #eee;
    }
    .spec strong { display: block; color: #666; font-size: 0.9rem; margin-bottom: 0.5rem; }
    .deals-table { overflow-x: auto; margin: 2rem 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
    }
    table th, table td {
      padding: 1rem;
      border-bottom: 1px solid #eee;
      text-align: left;
    }
    table th { background: #f5f5f5; font-weight: bold; }
    table a { color: #0066cc; text-decoration: none; }
    table a:hover { text-decoration: underline; }
    footer {
      background: #000;
      color: white;
      text-align: center;
      padding: 2rem;
      margin-top: 3rem;
    }
  </style>
</head>
<body>
  <header>
    <h1><a href="/">🚗 Vehicle Lease</a></h1>
    <nav>
      <a href="/vehicles">Vehicles</a>
      <a href="/lenders">Lenders</a>
      <a href="/sitemap.xml">Sitemap</a>
    </nav>
  </header>
  <main>
    ${content}
  </main>
  <footer>
    <p>Vehicle Lease © 2024. Find the best lease deals across the UK.</p>
  </footer>
</body>
</html>`;
}

function html404() {
  return htmlResponse('Not Found', '<h1>404 - Page Not Found</h1><p><a href="/">← Back to Home</a></p>');
}
