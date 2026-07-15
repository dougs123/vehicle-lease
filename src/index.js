// Vehicle Lease CF Worker
// SSR for vehicle-lease.co.uk

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
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
      } else if (pathname === '/robots.txt') {
        return handleRobots(env);
      } else if (pathname === '/ingest-batch' && request.method === 'POST') {
        return handleIngestBatch(env, request);
      } else {
        return html404(env);
      }
    } catch (err) {
      return new Response(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:3rem"><h1>Something went wrong</h1><p><a href="/">Back to home</a></p></body></html>`, {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
  }
};

// ============================================================================
// Page Handlers
// ============================================================================

async function handleHome(env) {
  const db = env.DB;

  const [stats, cheapest, eco, categories, makes] = await Promise.all([
    db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM lenders) as lenders,
        (SELECT COUNT(*) FROM lease_deals) as deals
    `).first(),
    db.prepare(`
      SELECT v.slug, v.make, v.model, v.year, v.body_type, v.fuel_type,
             MIN(ld.monthly_price_gbp) as min_price, COUNT(ld.id) as deal_count
      FROM vehicles v
      JOIN lease_deals ld ON v.id = ld.vehicle_id
      GROUP BY v.id
      ORDER BY min_price ASC
      LIMIT 8
    `).all(),
    db.prepare(`
      SELECT v.slug, v.make, v.model, v.year, v.body_type, v.fuel_type,
             MIN(ld.monthly_price_gbp) as min_price, COUNT(ld.id) as deal_count
      FROM vehicles v
      JOIN lease_deals ld ON v.id = ld.vehicle_id
      WHERE v.fuel_type IN ('Hybrid', 'Electric')
      GROUP BY v.id
      ORDER BY min_price ASC
      LIMIT 8
    `).all(),
    db.prepare('SELECT slug, name, description FROM categories ORDER BY name ASC').all(),
    db.prepare('SELECT make, COUNT(*) as n FROM vehicles GROUP BY make ORDER BY n DESC, make ASC LIMIT 12').all()
  ]);

  const content = `
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-eyebrow">UK car leasing, compared</p>
        <h1>Lease your next car<br>for less.</h1>
        <p class="hero-sub">Compare monthly prices on <strong>${stats.vehicles} UK models</strong> across <strong>${stats.lenders} lease providers</strong> — hatchbacks to high-performance EVs.</p>
        <form method="GET" action="/vehicles" class="search-bar">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="text" name="q" placeholder="Try &quot;BMW&quot;, &quot;Corsa&quot; or &quot;Tesla&quot;..." aria-label="Search vehicles">
          <button type="submit">Search deals</button>
        </form>
        <div class="hero-chips">
          <a href="/categories/electric">⚡ Electric</a>
          <a href="/categories/suvs">SUVs</a>
          <a href="/vehicles?q=BMW">BMW</a>
          <a href="/vehicles?q=Tesla">Tesla</a>
          <a href="/categories/budget-friendly">Under £300</a>
        </div>
        <div class="hero-stats">
          <div><strong>${stats.vehicles}</strong><span>models</span></div>
          <div><strong>${stats.lenders}</strong><span>providers</span></div>
          <div><strong>${stats.deals}</strong><span>live deals</span></div>
          <div><strong>Daily</strong><span>price updates</span></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Cheapest deals right now</h2>
        <a class="see-all" href="/categories/budget-friendly">See all budget deals →</a>
      </div>
      <div class="vehicle-grid">
        ${cheapest.results.map((v, i) => vehicleCard(v, i < 3 ? i + 1 : null)).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Go electric (or hybrid)</h2>
        <a class="see-all" href="/categories/electric">See all EVs →</a>
      </div>
      <div class="vehicle-grid">
        ${eco.results.map(v => vehicleCard(v)).join('')}
      </div>
    </section>

    <section class="section">
      <h2>Browse by category</h2>
      <div class="category-grid">
        ${categories.results.map(c => `
          <a href="/categories/${c.slug}" class="category-card">
            <span class="cat-icon">${categoryIcon(c.slug)}</span>
            <div>
              <h3>${esc(c.name)}</h3>
              <p>${esc(c.description || '')}</p>
            </div>
          </a>
        `).join('')}
      </div>
    </section>

    <section class="section">
      <h2>Popular makes</h2>
      <div class="make-chips">
        ${makes.results.map(m => `<a href="/vehicles?q=${encodeURIComponent(m.make)}">${esc(m.make)} <span>${m.n}</span></a>`).join('')}
      </div>
    </section>

    <section class="section how-it-works">
      <h2>How it works</h2>
      <div class="steps">
        <div class="step"><span class="step-num">1</span><h3>Search &amp; compare</h3><p>Browse every mainstream UK model with full specs and monthly pricing side by side.</p></div>
        <div class="step"><span class="step-num">2</span><h3>Pick your deal</h3><p>Filter by fuel type, body style and budget. Compare terms, mileage caps and upfront costs.</p></div>
        <div class="step"><span class="step-num">3</span><h3>Go to the provider</h3><p>We link you straight to the lease provider to complete your application. No middleman fees.</p></div>
      </div>
    </section>
  `;

  return htmlResponse('Compare UK Car Lease Deals', content, env, {
    description: `Compare car lease deals on ${stats.vehicles} UK models from ${stats.lenders} providers. Prices from £179/month. Electric, hybrid, SUV and budget-friendly options.`,
    fullBleed: true
  });
}

async function handleVehiclesList(env, url) {
  const db = env.DB;
  const q = url.searchParams.get('q') || '';
  const fuelType = url.searchParams.get('fuel') || '';
  const bodyType = url.searchParams.get('body') || '';
  const sort = url.searchParams.get('sort') || '';

  let query = `
    SELECT v.*, MIN(ld.monthly_price_gbp) as min_price, COUNT(ld.id) as deal_count
    FROM vehicles v
    LEFT JOIN lease_deals ld ON v.id = ld.vehicle_id
    WHERE 1=1
  `;
  const binds = [];

  if (q) {
    query += ` AND (v.make LIKE ? OR v.model LIKE ? OR (v.make || ' ' || v.model) LIKE ?)`;
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (fuelType) {
    query += ` AND v.fuel_type = ?`;
    binds.push(fuelType);
  }
  if (bodyType) {
    query += ` AND v.body_type = ?`;
    binds.push(bodyType);
  }

  query += ` GROUP BY v.id`;

  if (sort === 'price') {
    query += ` ORDER BY (min_price IS NULL), min_price ASC`;
  } else if (sort === 'price-desc') {
    query += ` ORDER BY (min_price IS NULL), min_price DESC`;
  } else {
    query += ` ORDER BY v.make, v.model`;
  }
  query += ` LIMIT 200`;

  const vehicles = await db.prepare(query).bind(...binds).all();
  const n = vehicles.results.length;

  const heading = q ? `Results for “${esc(q)}”` : 'Browse vehicles';

  const content = `
    ${breadcrumbs([['Home', '/'], ['Vehicles', null]])}
    <h1 class="page-title">${heading}</h1>
    <p class="page-sub">${n} model${n === 1 ? '' : 's'}${fuelType ? ` · ${esc(fuelType)}` : ''}${bodyType ? ` · ${esc(bodyType)}` : ''}</p>

    <form method="GET" class="filter-form">
      <input type="text" name="q" placeholder="Search make or model..." value="${esc(q)}">
      <select name="fuel">
        <option value="">All fuel types</option>
        ${['Petrol', 'Diesel', 'Hybrid', 'Electric'].map(f => `<option value="${f}" ${fuelType === f ? 'selected' : ''}>${f}</option>`).join('')}
      </select>
      <select name="body">
        <option value="">All body types</option>
        ${['Hatchback', 'Saloon', 'SUV', 'Estate', 'MPV', 'Coupe', 'Convertible'].map(b => `<option value="${b}" ${bodyType === b ? 'selected' : ''}>${b}</option>`).join('')}
      </select>
      <select name="sort">
        <option value="">Sort: A–Z</option>
        <option value="price" ${sort === 'price' ? 'selected' : ''}>Price: low to high</option>
        <option value="price-desc" ${sort === 'price-desc' ? 'selected' : ''}>Price: high to low</option>
      </select>
      <button type="submit">Apply</button>
    </form>

    ${n === 0 ? `
      <div class="empty-state">
        <p>No vehicles match that search.</p>
        <a class="btn" href="/vehicles">Clear filters</a>
      </div>
    ` : `
      <div class="vehicle-grid">
        ${vehicles.results.map(v => vehicleCard(v)).join('')}
      </div>
    `}
  `;

  return htmlResponse(q ? `${q} lease deals` : 'Browse Vehicles', content, env, {
    description: `Browse and compare lease deals on UK car models. Filter by fuel type, body style and price.`
  });
}

async function handleVehicleDetail(env, slug) {
  const db = env.DB;

  const vehicle = await db
    .prepare('SELECT * FROM vehicles WHERE slug = ?')
    .bind(slug)
    .first();

  if (!vehicle) return html404(env);

  const [deals, similar] = await Promise.all([
    db.prepare(`
      SELECT ld.*, l.name as lender_name, l.url as lender_url, l.slug as lender_slug
      FROM lease_deals ld
      JOIN lenders l ON ld.lender_id = l.id
      WHERE ld.vehicle_id = ?
      ORDER BY ld.monthly_price_gbp ASC
    `).bind(vehicle.id).all(),
    db.prepare(`
      SELECT v.slug, v.make, v.model, v.year, v.body_type, v.fuel_type,
             MIN(ld.monthly_price_gbp) as min_price, COUNT(ld.id) as deal_count
      FROM vehicles v
      JOIN lease_deals ld ON v.id = ld.vehicle_id
      WHERE v.body_type = ? AND v.id != ?
      GROUP BY v.id
      ORDER BY min_price ASC
      LIMIT 4
    `).bind(vehicle.body_type, vehicle.id).all()
  ]);

  const minPrice = deals.results.length ? deals.results[0].monthly_price_gbp : null;
  const title = `${vehicle.make} ${vehicle.model} ${vehicle.year} Lease Deals`;

  const specs = [
    ['Transmission', vehicle.transmission],
    ['Fuel type', vehicle.fuel_type],
    ['Power', vehicle.power_bhp ? `${vehicle.power_bhp} bhp` : null],
    ['Engine', vehicle.fuel_type === 'Electric' ? 'Electric motor' : (vehicle.engine_size_cc ? `${(vehicle.engine_size_cc / 1000).toFixed(1)}L` : null)],
    ['CO₂', vehicle.co2_g_km != null ? `${vehicle.co2_g_km} g/km` : null],
    [vehicle.fuel_type === 'Electric' ? 'Efficiency (mpge)' : 'Combined MPG', vehicle.mpg_combined || null],
    ['Seats', vehicle.seating],
    ['Doors', vehicle.doors],
    ['Boot space', vehicle.boot_litres ? `${vehicle.boot_litres}L` : null]
  ].filter(([, v]) => v != null && v !== '');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${env.SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Vehicles', item: `${env.SITE_URL}/vehicles` },
          { '@type': 'ListItem', position: 3, name: `${vehicle.make} ${vehicle.model}` }
        ]
      },
      ...(minPrice ? [{
        '@type': 'Product',
        name: `${vehicle.make} ${vehicle.model} ${vehicle.year}`,
        description: vehicle.description || `${vehicle.make} ${vehicle.model} lease deals`,
        brand: { '@type': 'Brand', name: vehicle.make },
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'GBP',
          lowPrice: minPrice,
          offerCount: deals.results.length,
          availability: 'https://schema.org/InStock'
        }
      }] : [])
    ]
  };

  const content = `
    ${breadcrumbs([['Home', '/'], ['Vehicles', '/vehicles'], [`${vehicle.make} ${vehicle.model}`, null]])}

    <div class="detail-hero">
      <div class="detail-art">${carArt(vehicle)}</div>
      <div class="detail-info">
        <h1>${esc(vehicle.make)} ${esc(vehicle.model)} <span class="detail-year">${vehicle.year}</span></h1>
        <div class="detail-badges">
          <span class="badge ${fuelClass(vehicle.fuel_type)}">${esc(vehicle.fuel_type)}</span>
          <span class="badge badge-plain">${esc(vehicle.body_type)}</span>
          <span class="badge badge-plain">${esc(vehicle.transmission)}</span>
        </div>
        ${vehicle.description ? `<p class="detail-desc">${esc(vehicle.description)}</p>` : ''}
        ${minPrice ? `
          <div class="detail-price">
            <span class="from">Leases from</span>
            <span class="amount">£${minPrice}</span>
            <span class="per">/month</span>
          </div>
          <a class="btn btn-primary" href="#deals">Compare ${deals.results.length} deal${deals.results.length === 1 ? '' : 's'} ↓</a>
        ` : `<p class="detail-desc">No lease deals for this model yet — prices update daily.</p>`}
      </div>
    </div>

    <h2 class="sub-heading">Specifications</h2>
    <div class="specs-grid">
      ${specs.map(([label, value]) => `
        <div class="spec"><strong>${label}</strong><p>${value}</p></div>
      `).join('')}
    </div>

    <h2 class="sub-heading" id="deals">Available lease deals</h2>
    ${deals.results.length === 0 ? `
      <p class="muted-note">No lease deals for this model yet — check back soon, prices update daily.</p>
    ` : `
    <div class="deals-table">
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Monthly price</th>
            <th>Term</th>
            <th>Annual mileage</th>
            <th>Upfront</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${deals.results.map((d, i) => `
            <tr${i === 0 ? ' class="best-deal"' : ''}>
              <td><strong>${esc(d.lender_name)}</strong>${i === 0 ? ' <span class="best-tag">Best price</span>' : ''}</td>
              <td class="price-cell">£${d.monthly_price_gbp}<span class="pm">/mo</span></td>
              <td>${d.term_months} months</td>
              <td>${d.annual_mileage.toLocaleString('en-GB')} mi</td>
              <td>${d.upfront_cost_gbp ? '£' + d.upfront_cost_gbp.toLocaleString('en-GB') : '—'}</td>
              <td>${d.lender_url ? `<a class="btn btn-small" href="${esc(d.lender_url)}" target="_blank" rel="noopener">View deal</a>` : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`}

    ${similar.results.length ? `
      <div class="section-head" style="margin-top:3rem">
        <h2 class="sub-heading" style="margin:0">Similar ${esc(vehicle.body_type.toLowerCase())}s</h2>
        ${similar.results[0] ? `<a class="see-all" href="/compare/${vehicle.slug}-vs-${similar.results[0].slug}">Compare with ${esc(similar.results[0].make)} ${esc(similar.results[0].model)} →</a>` : ''}
      </div>
      <div class="vehicle-grid">
        ${similar.results.map(v => vehicleCard(v)).join('')}
      </div>
    ` : ''}

    ${vehicle.manufacturer_url ? `
    <div class="manufacturer-link">
      <a href="${esc(vehicle.manufacturer_url)}" target="_blank" rel="noopener">View on manufacturer site</a>
    </div>` : ''}
  `;

  return htmlResponse(title, content, env, {
    description: minPrice
      ? `${vehicle.make} ${vehicle.model} ${vehicle.year} lease deals from £${minPrice}/month. ${vehicle.fuel_type} ${vehicle.body_type.toLowerCase()}, ${vehicle.power_bhp} bhp. Compare ${deals.results.length} offers.`
      : `${vehicle.make} ${vehicle.model} ${vehicle.year} specs and lease deals.`,
    jsonLd
  });
}

async function handleLendersList(env) {
  const db = env.DB;

  const lenders = await db
    .prepare(`
      SELECT l.*, COUNT(DISTINCT ld.vehicle_id) as vehicle_count, MIN(ld.monthly_price_gbp) as min_price
      FROM lenders l
      LEFT JOIN lease_deals ld ON l.id = ld.lender_id
      GROUP BY l.id
      ORDER BY vehicle_count DESC, l.name ASC
    `)
    .all();

  const content = `
    ${breadcrumbs([['Home', '/'], ['Lenders', null]])}
    <h1 class="page-title">Lease providers</h1>
    <p class="page-sub">The companies behind the deals — compare their coverage and starting prices.</p>

    <div class="lender-list">
      ${lenders.results.map(l => `
        <a class="lender-card" href="/lenders/${l.slug}">
          <span class="lender-avatar">${esc(initials(l.name))}</span>
          <div class="lender-body">
            <h3>${esc(l.name)}</h3>
            <p>${esc(l.description || '')}</p>
            <div class="lender-meta">
              <span>${l.vehicle_count} vehicle${l.vehicle_count === 1 ? '' : 's'}</span>
              ${l.min_price ? `<span>Deals from <strong>£${l.min_price}/mo</strong></span>` : ''}
            </div>
          </div>
        </a>
      `).join('')}
    </div>
  `;

  return htmlResponse('Lease Providers', content, env, {
    description: 'Compare UK car lease providers — coverage, specialisms and starting prices.'
  });
}

async function handleLenderDetail(env, slug) {
  const db = env.DB;

  const lender = await db
    .prepare('SELECT * FROM lenders WHERE slug = ?')
    .bind(slug)
    .first();

  if (!lender) return html404(env);

  const deals = await db
    .prepare(`
      SELECT v.slug, v.make, v.model, v.year, v.body_type, v.fuel_type,
             MIN(ld.monthly_price_gbp) as min_price, COUNT(ld.id) as deal_count
      FROM lease_deals ld
      JOIN vehicles v ON ld.vehicle_id = v.id
      WHERE ld.lender_id = ?
      GROUP BY v.id
      ORDER BY min_price ASC
      LIMIT 60
    `)
    .bind(lender.id)
    .all();

  const title = `${lender.name} Lease Deals`;
  const content = `
    ${breadcrumbs([['Home', '/'], ['Lenders', '/lenders'], [lender.name, null]])}

    <div class="lender-hero">
      <span class="lender-avatar lender-avatar-lg">${esc(initials(lender.name))}</span>
      <div>
        <h1 class="page-title" style="margin-bottom:.25rem">${esc(lender.name)}</h1>
        <p class="page-sub" style="margin-bottom:.75rem">${esc(lender.description || '')}</p>
        <div class="lender-contacts">
          ${lender.phone ? `<a href="tel:${esc(lender.phone)}">📞 ${esc(lender.phone)}</a>` : ''}
          ${lender.email ? `<a href="mailto:${esc(lender.email)}">✉️ ${esc(lender.email)}</a>` : ''}
          ${lender.url ? `<a href="${esc(lender.url)}" target="_blank" rel="noopener">Visit website ↗</a>` : ''}
        </div>
      </div>
    </div>

    <h2 class="sub-heading">Vehicles with ${esc(lender.name)} deals</h2>
    ${deals.results.length === 0 ? '<p class="muted-note">No deals listed yet for this provider.</p>' : `
    <div class="vehicle-grid">
      ${deals.results.map(v => vehicleCard(v)).join('')}
    </div>`}
  `;

  return htmlResponse(title, content, env, {
    description: `${lender.name} car lease deals — ${deals.results.length} vehicles available.`
  });
}

async function handleComparison(env, id1, id2) {
  const db = env.DB;

  const v1 = await db.prepare('SELECT * FROM vehicles WHERE slug = ?').bind(id1).first();
  const v2 = await db.prepare('SELECT * FROM vehicles WHERE slug = ?').bind(id2).first();

  if (!v1 || !v2) return html404(env);

  const [deals1, deals2] = await Promise.all([
    db.prepare('SELECT MIN(monthly_price_gbp) as price FROM lease_deals WHERE vehicle_id = ?').bind(v1.id).first(),
    db.prepare('SELECT MIN(monthly_price_gbp) as price FROM lease_deals WHERE vehicle_id = ?').bind(v2.id).first()
  ]);

  // winner: 1, 2 or 0 (tie / n/a). lowerBetter for price & CO2.
  const rows = [
    ['Body type', v1.body_type, v2.body_type, 0],
    ['Fuel type', v1.fuel_type, v2.fuel_type, 0],
    ['Transmission', v1.transmission, v2.transmission, 0],
    ['Power', `${v1.power_bhp} bhp`, `${v2.power_bhp} bhp`, cmp(v1.power_bhp, v2.power_bhp, false)],
    ['CO₂ emissions', `${v1.co2_g_km ?? '—'} g/km`, `${v2.co2_g_km ?? '—'} g/km`, cmp(v1.co2_g_km, v2.co2_g_km, true)],
    ['Combined MPG', v1.mpg_combined ?? '—', v2.mpg_combined ?? '—', cmp(v1.mpg_combined, v2.mpg_combined, false)],
    ['Seats', v1.seating, v2.seating, cmp(v1.seating, v2.seating, false)],
    ['Boot space', v1.boot_litres ? `${v1.boot_litres}L` : '—', v2.boot_litres ? `${v2.boot_litres}L` : '—', cmp(v1.boot_litres, v2.boot_litres, false)],
    ['From £/month', deals1.price ? `£${deals1.price}` : 'No deals yet', deals2.price ? `£${deals2.price}` : 'No deals yet', cmp(deals1.price, deals2.price, true)]
  ];

  const title = `${v1.make} ${v1.model} vs ${v2.make} ${v2.model}`;
  const content = `
    ${breadcrumbs([['Home', '/'], ['Vehicles', '/vehicles'], ['Compare', null]])}
    <h1 class="page-title">${esc(v1.make)} ${esc(v1.model)} <span class="vs">vs</span> ${esc(v2.make)} ${esc(v2.model)}</h1>
    <p class="page-sub">Head-to-head — the better value on each line is highlighted.</p>

    <div class="compare-art">
      <a href="/vehicles/${v1.slug}">${carArt(v1)}</a>
      <span class="vs-circle">VS</span>
      <a href="/vehicles/${v2.slug}">${carArt(v2)}</a>
    </div>

    <div class="deals-table">
      <table class="comparison-table">
        <thead>
          <tr>
            <th></th>
            <th><a href="/vehicles/${v1.slug}">${esc(v1.make)} ${esc(v1.model)}</a></th>
            <th><a href="/vehicles/${v2.slug}">${esc(v2.make)} ${esc(v2.model)}</a></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(([label, a, b, winner]) => `
            <tr>
              <td><strong>${label}</strong></td>
              <td class="${winner === 1 ? 'win' : ''}">${a}</td>
              <td class="${winner === 2 ? 'win' : ''}">${b}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  return htmlResponse(title, content, env, {
    description: `${v1.make} ${v1.model} vs ${v2.make} ${v2.model}: specs, running costs and lease prices compared.`
  });
}

function cmp(a, b, lowerBetter) {
  if (a == null || b == null || a === b) return 0;
  const aWins = lowerBetter ? a < b : a > b;
  return aWins ? 1 : 2;
}

async function handleCategory(env, slug) {
  const db = env.DB;

  const category = await db
    .prepare('SELECT * FROM categories WHERE slug = ?')
    .bind(slug)
    .first();

  if (!category) return html404(env);

  const vehicles = await db
    .prepare(`
      SELECT v.*, MIN(ld.monthly_price_gbp) as min_price, COUNT(ld.id) as deal_count
      FROM vehicles v
      JOIN vehicle_categories vc ON v.id = vc.vehicle_id
      LEFT JOIN lease_deals ld ON v.id = ld.vehicle_id
      WHERE vc.category_id = ?
      GROUP BY v.id
      ORDER BY (min_price IS NULL), min_price ASC
      LIMIT 60
    `)
    .bind(category.id)
    .all();

  const title = `${category.name} Lease Deals`;
  const content = `
    ${breadcrumbs([['Home', '/'], ['Vehicles', '/vehicles'], [category.name, null]])}
    <div class="cat-hero">
      <span class="cat-icon cat-icon-lg">${categoryIcon(category.slug)}</span>
      <div>
        <h1 class="page-title" style="margin-bottom:.25rem">${esc(category.name)}</h1>
        <p class="page-sub" style="margin:0">${esc(category.description || '')} · ${vehicles.results.length} models</p>
      </div>
    </div>

    <div class="vehicle-grid">
      ${vehicles.results.map(v => vehicleCard(v)).join('')}
    </div>
  `;

  return htmlResponse(title, content, env, {
    description: `${category.name} car lease deals: ${category.description || ''} Compare monthly prices across UK providers.`
  });
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
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>\n`;
  });

  lenders.results.forEach(l => {
    xml += `  <url>
    <loc>${env.SITE_URL}/lenders/${l.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
  });

  categories.results.forEach(c => {
    xml += `  <url>
    <loc>${env.SITE_URL}/categories/${c.slug}</loc>
    <changefreq>daily</changefreq>
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

  const categories = await db.prepare('SELECT slug, name FROM categories ORDER BY name ASC').all();
  const counts = await db.prepare(`
    SELECT (SELECT COUNT(*) FROM vehicles) as vehicles,
           (SELECT COUNT(*) FROM lenders) as lenders,
           (SELECT COUNT(*) FROM lease_deals) as deals
  `).first();

  const txt = `# Vehicle Lease

A UK vehicle lease comparison database. Find and compare car lease deals from multiple providers.

## About

vehicle-lease.co.uk aggregates lease pricing for ${counts.vehicles} UK car models across ${counts.lenders} lease providers (${counts.deals} deals tracked).

## Hub Pages

${categories.results.map(c => `- /categories/${c.slug} — ${c.name}`).join('\n')}

## Navigation

- /vehicles — browse and search all vehicles (filters: ?q= ?fuel= ?body= ?sort=price)
- /vehicles/{slug} — model detail with specs and all lease deals
- /lenders — lease provider directory
- /compare/{slug-a}-vs-{slug-b} — head-to-head comparison

## Data

- Monthly lease pricing, contract terms, mileage caps and upfront costs
- Vehicle specifications (power, CO2, MPG, seating, boot space)
- Prices are indicative and refreshed daily; confirm with the provider before ordering.
`;

  return new Response(txt, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

async function handleRobots(env) {
  const robots = `User-agent: *
Allow: /
Disallow: /admin/

Sitemap: ${env.SITE_URL}/sitemap.xml
`;

  return new Response(robots, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

async function handleIngestBatch(env, request) {
  const ingestKey = request.headers.get('x-ingest-key');
  const expectedKey = env.INGEST_KEY || '';

  if (!expectedKey || ingestKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const deals = await request.json();
    if (!Array.isArray(deals)) {
      return new Response(JSON.stringify({ error: 'Expected array of deals' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    let written = 0;

    for (const deal of deals) {
      // Find vehicle by make/model (matches first variant found)
      const vehicleSlug = slugify(`${deal.make}-${deal.model}-2024`);
      const vehicle = await env.DB
        .prepare('SELECT id FROM vehicles WHERE slug LIKE ? LIMIT 1')
        .bind(vehicleSlug + '%')
        .first();

      if (!vehicle) {
        continue; // Skip if vehicle not found
      }

      // Find or create lender
      const lenderSlug = slugify(deal.lender);
      let lender = await env.DB
        .prepare('SELECT id FROM lenders WHERE slug = ?')
        .bind(lenderSlug)
        .first();

      if (!lender) {
        await env.DB
          .prepare('INSERT INTO lenders (slug, name, url) VALUES (?, ?, ?)')
          .bind(lenderSlug, deal.lender, '')
          .run();
        lender = await env.DB
          .prepare('SELECT id FROM lenders WHERE slug = ?')
          .bind(lenderSlug)
          .first();
      }

      // Upsert lease deal
      if (vehicle && lender) {
        await env.DB
          .prepare(`
            INSERT INTO lease_deals (vehicle_id, lender_id, monthly_price_gbp, term_months, annual_mileage, description, source_url, last_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(vehicle_id, lender_id, term_months, annual_mileage) DO UPDATE SET
              monthly_price_gbp = excluded.monthly_price_gbp,
              description = excluded.description,
              last_verified = excluded.last_verified
          `)
          .bind(
            vehicle.id,
            lender.id,
            deal.monthly_price_gbp || 0,
            deal.term_months || 48,
            deal.annual_mileage || 12000,
            deal.description || deal.source || '',
            deal.source_url || '',
            new Date().toISOString().split('T')[0]
          )
          .run();
        written++;
      }
    }

    return new Response(JSON.stringify({ success: true, written }), {
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
// Components
// ============================================================================

function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(text) {
  return text.toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function initials(name) {
  return name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function fuelClass(fuel) {
  return {
    Electric: 'badge-electric',
    Hybrid: 'badge-hybrid',
    Diesel: 'badge-diesel',
    Petrol: 'badge-petrol'
  }[fuel] || 'badge-plain';
}

function fuelTint(fuel) {
  return {
    Electric: 'linear-gradient(135deg,#ecfdf5,#d1fae5)',
    Hybrid: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)',
    Diesel: 'linear-gradient(135deg,#fffbeb,#fef3c7)',
    Petrol: 'linear-gradient(135deg,#eff6ff,#dbeafe)'
  }[fuel] || 'linear-gradient(135deg,#f8fafc,#e2e8f0)';
}

function categoryIcon(slug) {
  return {
    'budget-friendly': '💷',
    'city-cars': '🏙️',
    'electric': '⚡',
    'family-cars': '👨‍👩‍👧‍👦',
    'hybrid': '🌿',
    'premium': '💎',
    'suvs': '⛰️',
    'saloons': '🕴️'
  }[slug] || '🚗';
}

// Stylised side-profile car silhouettes, tinted by fuel type.
function carArt(v) {
  const tall = ['SUV', 'MPV', 'Estate'];
  const sleek = ['Saloon', 'Coupe', 'Convertible'];
  let body, glass;
  if (tall.includes(v.body_type)) {
    body = 'M16 66 L20 50 Q22 44 30 42 L44 40 Q56 22 88 19 L138 18 Q166 19 176 32 L184 41 L206 45 Q220 48 222 58 L222 66 Q222 70 216 70 L24 70 Q16 70 16 66 Z';
    glass = 'M56 38 Q64 26 90 24 L130 23 L134 38 Z M140 23 Q160 24 168 33 L173 39 L140 38 Z';
  } else if (sleek.includes(v.body_type)) {
    body = 'M12 64 Q12 56 22 53 L46 49 Q60 47 72 46 L92 32 Q112 24 140 25 Q160 26 170 34 L182 45 Q206 48 220 56 Q226 59 226 64 Q226 69 219 69 L20 69 Q12 69 12 64 Z';
    glass = 'M96 34 Q112 28 132 28 L136 43 L88 44 Z M142 29 Q156 30 164 37 L169 43 L142 43 Z';
  } else {
    body = 'M18 64 Q18 55 28 52 L42 49 Q52 47 62 46 L78 30 Q94 22 122 22 Q146 22 156 30 L170 46 Q196 50 212 56 Q220 59 220 64 Q220 69 213 69 L26 69 Q18 69 18 64 Z';
    glass = 'M82 32 Q94 26 116 26 L120 43 L72 44 Z M126 26 Q142 26 150 33 L156 43 L126 43 Z';
  }
  return `<div class="car-art" style="background:${fuelTint(v.fuel_type)}">
    <svg viewBox="0 0 240 84" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="${body}" fill="#1e293b" opacity="0.9"/>
      <path d="${glass}" fill="#cbd5e1" opacity="0.85"/>
      <circle cx="62" cy="68" r="12" fill="#0f172a"/><circle cx="62" cy="68" r="5" fill="#e2e8f0"/>
      <circle cx="180" cy="68" r="12" fill="#0f172a"/><circle cx="180" cy="68" r="5" fill="#e2e8f0"/>
    </svg>
  </div>`;
}

function vehicleCard(v, rank = null) {
  return `
    <a href="/vehicles/${v.slug}" class="vehicle-card">
      ${rank ? `<span class="rank-badge">#${rank}</span>` : ''}
      ${carArt(v)}
      <div class="vc-body">
        <h3>${esc(v.make)} ${esc(v.model)}</h3>
        <p class="meta">${v.year} · ${esc(v.body_type)}</p>
        <div class="vc-foot">
          <span class="badge ${fuelClass(v.fuel_type)}">${esc(v.fuel_type)}</span>
          <span class="price">${v.min_price ? `£${Math.round(v.min_price)}<span class="pm">/mo</span>` : 'View →'}</span>
        </div>
        ${v.deal_count ? `<p class="deal-count">${v.deal_count} deal${v.deal_count === 1 ? '' : 's'} available</p>` : ''}
      </div>
    </a>
  `;
}

function breadcrumbs(items) {
  return `<nav class="crumbs">${items.map(([label, href]) =>
    href ? `<a href="${href}">${esc(label)}</a>` : `<span>${esc(label)}</span>`
  ).join('<span class="crumb-sep">/</span>')}</nav>`;
}

// ============================================================================
// Layout
// ============================================================================

function htmlResponse(title, content, env, opts = {}) {
  return new Response(html(title, content, env, opts), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function html(title, content, env = {}, opts = {}) {
  const gaId = env.GA_ID || '';
  const gscToken = env.GSC_TOKEN || '';
  const description = opts.description || 'Compare UK car lease deals across models, fuel types and providers. Prices refreshed daily.';
  const jsonLd = opts.jsonLd ? `<script type="application/ld+json">${JSON.stringify(opts.jsonLd)}</script>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} | Vehicle Lease</title>
  ${gscToken ? `<meta name="google-site-verification" content="${esc(gscToken)}">` : ''}
  <meta name="description" content="${esc(description)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="website">
  ${jsonLd}${gaId ? `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gaId}');
  </script>` : ''}
  <style>
    :root {
      --ink: #0f172a;
      --mut: #64748b;
      --line: #e2e8f0;
      --bg: #f8fafc;
      --blue: #2563eb;
      --blue-d: #1d4ed8;
      --r: 14px;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
      line-height: 1.6;
      color: var(--ink);
      background: var(--bg);
      -webkit-font-smoothing: antialiased;
    }
    a { color: var(--blue); }

    /* Header */
    header {
      background: rgba(255,255,255,.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--line);
      padding: .85rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo { display: flex; align-items: center; gap: .6rem; text-decoration: none; color: var(--ink); }
    .logo-mark {
      width: 34px; height: 34px; border-radius: 9px;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      display: grid; place-items: center; color: #fff;
      flex-shrink: 0;
    }
    .logo-mark svg { width: 20px; height: 20px; }
    .logo-word { font-weight: 800; font-size: 1.15rem; letter-spacing: -0.02em; }
    .logo-word span { color: var(--blue); }
    header nav { display: flex; gap: 1.5rem; align-items: center; }
    header nav a { color: #475569; text-decoration: none; font-weight: 500; font-size: .95rem; }
    header nav a:hover { color: var(--ink); }
    header nav a.nav-cta {
      background: var(--blue); color: #fff; padding: .45rem 1rem;
      border-radius: 8px; font-weight: 600;
    }
    header nav a.nav-cta:hover { background: var(--blue-d); color: #fff; }

    main { max-width: 1180px; margin: 0 auto; padding: 2rem 1.5rem 3rem; }

    /* Hero */
    .hero {
      border-radius: 20px;
      margin-top: .5rem;
      padding: 4rem 2rem 3.25rem;
      color: #fff;
      text-align: center;
      background:
        radial-gradient(650px 320px at 12% 0%, rgba(37,99,235,.45), transparent 60%),
        radial-gradient(520px 280px at 88% 15%, rgba(124,58,237,.35), transparent 60%),
        radial-gradient(400px 220px at 50% 110%, rgba(6,182,212,.25), transparent 60%),
        linear-gradient(180deg, #0b1220, #101a30);
      overflow: hidden;
    }
    .hero-inner { max-width: 720px; margin: 0 auto; }
    .hero-eyebrow {
      display: inline-block; font-size: .8rem; font-weight: 600; letter-spacing: .12em;
      text-transform: uppercase; color: #93c5fd; margin-bottom: 1rem;
      border: 1px solid rgba(147,197,253,.3); border-radius: 999px; padding: .3rem .9rem;
    }
    .hero h1 { font-size: clamp(2.2rem, 5vw, 3.4rem); font-weight: 800; letter-spacing: -0.03em; line-height: 1.08; }
    .hero-sub { color: #cbd5e1; margin: 1.1rem auto 1.75rem; font-size: 1.1rem; max-width: 560px; }
    .hero-sub strong { color: #fff; }
    .search-bar {
      display: flex; align-items: center; gap: .5rem;
      background: #fff; border-radius: 12px; padding: .4rem .4rem .4rem 1rem;
      max-width: 560px; margin: 0 auto;
      box-shadow: 0 12px 40px rgba(0,0,0,.35);
    }
    .search-icon { width: 20px; height: 20px; color: #94a3b8; flex-shrink: 0; }
    .search-bar input {
      flex: 1; border: none; font-size: 1rem; padding: .65rem 0; background: transparent;
      color: var(--ink); min-width: 0;
    }
    .search-bar input:focus { outline: none; }
    .search-bar button {
      background: var(--blue); color: #fff; border: none; border-radius: 9px;
      padding: .7rem 1.3rem; font-weight: 700; font-size: .95rem; cursor: pointer;
      transition: background .15s; flex-shrink: 0;
    }
    .search-bar button:hover { background: var(--blue-d); }
    .hero-chips { display: flex; gap: .5rem; justify-content: center; flex-wrap: wrap; margin-top: 1.1rem; }
    .hero-chips a {
      color: #dbeafe; text-decoration: none; font-size: .85rem; font-weight: 500;
      border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.06);
      border-radius: 999px; padding: .35rem .85rem; transition: background .15s;
    }
    .hero-chips a:hover { background: rgba(255,255,255,.14); }
    .hero-stats {
      display: flex; justify-content: center; gap: 2.5rem; margin-top: 2.25rem;
      flex-wrap: wrap;
    }
    .hero-stats div { display: flex; flex-direction: column; }
    .hero-stats strong { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; }
    .hero-stats span { color: #94a3b8; font-size: .82rem; }

    /* Sections */
    .section { margin: 3.25rem 0 0; }
    .section-head { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.4rem; }
    .section h2, .sub-heading { font-size: 1.55rem; font-weight: 800; letter-spacing: -0.02em; }
    .section h2 { margin-bottom: 0; }
    .section > h2 { margin-bottom: 1.4rem; }
    .sub-heading { margin: 2.5rem 0 1.2rem; }
    .see-all { font-size: .92rem; font-weight: 600; text-decoration: none; white-space: nowrap; }
    .see-all:hover { text-decoration: underline; }

    .page-title { font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: .35rem; }
    .page-sub { color: var(--mut); margin-bottom: 1.5rem; }

    /* Breadcrumbs */
    .crumbs { font-size: .85rem; margin-bottom: 1.25rem; color: var(--mut); }
    .crumbs a { color: var(--mut); text-decoration: none; }
    .crumbs a:hover { color: var(--blue); }
    .crumbs .crumb-sep { margin: 0 .5rem; color: #cbd5e1; }
    .crumbs span:last-child { color: var(--ink); font-weight: 500; }

    /* Vehicle cards */
    .vehicle-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(235px, 1fr));
      gap: 1.25rem;
    }
    .vehicle-card {
      background: #fff; border: 1px solid var(--line); border-radius: var(--r);
      text-decoration: none; color: var(--ink); overflow: hidden; position: relative;
      transition: transform .18s, box-shadow .18s, border-color .18s;
      display: flex; flex-direction: column;
    }
    .vehicle-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 14px 30px rgba(15,23,42,.10);
      border-color: #bfdbfe;
    }
    .rank-badge {
      position: absolute; top: .6rem; left: .6rem; z-index: 2;
      background: var(--ink); color: #fff; font-size: .72rem; font-weight: 700;
      border-radius: 999px; padding: .2rem .55rem;
    }
    .car-art { padding: 1rem 1.1rem .4rem; }
    .car-art svg { width: 100%; height: auto; display: block; }
    .vc-body { padding: .9rem 1.1rem 1.1rem; display: flex; flex-direction: column; flex: 1; }
    .vehicle-card h3 { font-size: 1rem; font-weight: 700; letter-spacing: -0.01em; }
    .vehicle-card .meta { color: var(--mut); font-size: .84rem; margin-top: .1rem; }
    .vc-foot { display: flex; justify-content: space-between; align-items: center; margin-top: .75rem; gap: .5rem; }
    .vehicle-card .price { font-weight: 800; color: var(--ink); font-size: 1.05rem; letter-spacing: -0.01em; white-space: nowrap; }
    .vehicle-card .price .pm { font-size: .78rem; color: var(--mut); font-weight: 500; }
    .deal-count { font-size: .78rem; color: var(--mut); margin-top: .45rem; }

    /* Badges */
    .badge {
      display: inline-block; font-size: .74rem; font-weight: 600;
      border-radius: 6px; padding: .22rem .6rem; white-space: nowrap;
    }
    .badge-electric { background: #dcfce7; color: #166534; }
    .badge-hybrid { background: #ccfbf1; color: #0f766e; }
    .badge-petrol { background: #dbeafe; color: #1e40af; }
    .badge-diesel { background: #fef3c7; color: #92400e; }
    .badge-plain { background: #f1f5f9; color: #475569; }

    /* Category cards */
    .category-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.25rem; }
    .category-card {
      background: #fff; border: 1px solid var(--line); border-radius: var(--r);
      padding: 1.4rem; text-decoration: none; color: var(--ink);
      display: flex; gap: 1rem; align-items: flex-start;
      transition: transform .18s, box-shadow .18s, border-color .18s;
    }
    .category-card:hover { transform: translateY(-3px); box-shadow: 0 14px 30px rgba(15,23,42,.10); border-color: #bfdbfe; }
    .cat-icon { font-size: 1.6rem; line-height: 1; background: #f1f5f9; border-radius: 10px; padding: .55rem; }
    .cat-icon-lg { font-size: 2.2rem; padding: .8rem; }
    .category-card h3 { font-size: 1.05rem; font-weight: 700; margin-bottom: .15rem; }
    .category-card p { color: var(--mut); font-size: .88rem; }
    .cat-hero { display: flex; gap: 1.25rem; align-items: center; margin-bottom: 2rem; }

    /* Make chips */
    .make-chips { display: flex; flex-wrap: wrap; gap: .6rem; }
    .make-chips a {
      text-decoration: none; color: var(--ink); font-weight: 600; font-size: .92rem;
      background: #fff; border: 1px solid var(--line); border-radius: 999px;
      padding: .5rem 1.05rem; transition: border-color .15s, box-shadow .15s;
    }
    .make-chips a:hover { border-color: #bfdbfe; box-shadow: 0 4px 12px rgba(15,23,42,.06); }
    .make-chips a span { color: var(--mut); font-weight: 500; font-size: .8rem; }

    /* How it works */
    .how-it-works .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem; }
    .step { background: #fff; border: 1px solid var(--line); border-radius: var(--r); padding: 1.5rem; }
    .step-num {
      display: inline-grid; place-items: center; width: 30px; height: 30px;
      background: var(--blue); color: #fff; font-weight: 800; border-radius: 999px;
      font-size: .9rem; margin-bottom: .8rem;
    }
    .step h3 { font-size: 1.02rem; font-weight: 700; margin-bottom: .3rem; }
    .step p { color: var(--mut); font-size: .9rem; }

    /* Filter form */
    .filter-form { display: flex; gap: .6rem; margin-bottom: 1.75rem; flex-wrap: wrap; }
    .filter-form input, .filter-form select {
      padding: .65rem .9rem; border: 1px solid var(--line); border-radius: 9px;
      font-size: .95rem; background: #fff; color: var(--ink);
    }
    .filter-form input { min-width: 200px; flex: 1; max-width: 320px; }
    .filter-form input:focus, .filter-form select:focus { outline: none; border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,.12); }
    .filter-form button {
      padding: .65rem 1.4rem; background: var(--blue); color: #fff; border: none;
      border-radius: 9px; cursor: pointer; font-weight: 700; font-size: .95rem;
    }
    .filter-form button:hover { background: var(--blue-d); }

    .empty-state { text-align: center; padding: 4rem 1rem; color: var(--mut); }
    .empty-state .btn { margin-top: 1rem; }
    .muted-note { color: var(--mut); margin: .5rem 0 2rem; }

    /* Buttons */
    .btn {
      display: inline-block; background: #fff; color: var(--ink); border: 1px solid var(--line);
      text-decoration: none; font-weight: 600; border-radius: 9px; padding: .6rem 1.2rem;
      font-size: .92rem; transition: all .15s;
    }
    .btn:hover { border-color: #bfdbfe; box-shadow: 0 4px 12px rgba(15,23,42,.07); }
    .btn-primary { background: var(--blue); color: #fff; border-color: var(--blue); }
    .btn-primary:hover { background: var(--blue-d); border-color: var(--blue-d); }
    .btn-small { padding: .4rem .85rem; font-size: .84rem; background: var(--blue); color: #fff; border-color: var(--blue); }
    .btn-small:hover { background: var(--blue-d); }

    /* Vehicle detail */
    .detail-hero {
      display: grid; grid-template-columns: minmax(260px, 420px) 1fr; gap: 2rem;
      background: #fff; border: 1px solid var(--line); border-radius: 18px;
      padding: 2rem; align-items: center; margin-bottom: 2.5rem;
    }
    .detail-art .car-art { padding: 0; border-radius: 14px; }
    .detail-art svg { width: 100%; }
    .detail-info h1 { font-size: 1.9rem; font-weight: 800; letter-spacing: -0.02em; }
    .detail-year { color: var(--mut); font-weight: 600; font-size: 1.2rem; }
    .detail-badges { display: flex; gap: .5rem; flex-wrap: wrap; margin: .7rem 0 1rem; }
    .detail-desc { color: var(--mut); margin-bottom: 1.1rem; max-width: 46ch; }
    .detail-price { display: flex; align-items: baseline; gap: .45rem; margin-bottom: 1.1rem; }
    .detail-price .from { color: var(--mut); font-size: .92rem; }
    .detail-price .amount { font-size: 2.2rem; font-weight: 800; letter-spacing: -0.03em; }
    .detail-price .per { color: var(--mut); }

    .specs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: .9rem; }
    .spec { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 1rem 1.1rem; }
    .spec strong { display: block; color: #94a3b8; font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; margin-bottom: .25rem; }
    .spec p { font-size: 1.08rem; font-weight: 700; }

    /* Deals table */
    .deals-table { overflow-x: auto; background: #fff; border: 1px solid var(--line); border-radius: var(--r); }
    table { width: 100%; border-collapse: collapse; }
    table th, table td { padding: .95rem 1.1rem; text-align: left; border-bottom: 1px solid #f1f5f9; }
    table thead th { background: #f8fafc; font-size: .78rem; text-transform: uppercase; letter-spacing: .06em; color: #64748b; font-weight: 700; }
    table tbody tr:last-child td { border-bottom: none; }
    table tbody tr:hover { background: #f8fafc; }
    .price-cell { font-weight: 800; font-size: 1.05rem; white-space: nowrap; }
    .price-cell .pm { font-size: .78rem; color: var(--mut); font-weight: 500; }
    .best-deal { background: #eff6ff; }
    .best-deal:hover { background: #eff6ff !important; }
    .best-tag { background: #16a34a; color: #fff; font-size: .68rem; font-weight: 700; border-radius: 999px; padding: .15rem .5rem; margin-left: .4rem; vertical-align: middle; }
    .comparison-table .win { background: #f0fdf4; font-weight: 700; color: #166534; }
    .comparison-table th a { text-decoration: none; }

    /* Compare */
    .vs { color: var(--mut); font-weight: 500; font-size: 1.3rem; }
    .compare-art { display: grid; grid-template-columns: 1fr auto 1fr; gap: 1rem; align-items: center; margin: 1.5rem 0 2rem; }
    .compare-art a { display: block; }
    .compare-art .car-art { border-radius: var(--r); border: 1px solid var(--line); }
    .vs-circle {
      width: 46px; height: 46px; border-radius: 999px; background: var(--ink); color: #fff;
      display: grid; place-items: center; font-weight: 800; font-size: .82rem;
    }

    /* Lenders */
    .lender-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem; }
    .lender-card {
      background: #fff; border: 1px solid var(--line); border-radius: var(--r);
      padding: 1.4rem; display: flex; gap: 1rem; text-decoration: none; color: var(--ink);
      transition: transform .18s, box-shadow .18s, border-color .18s;
    }
    .lender-card:hover { transform: translateY(-3px); box-shadow: 0 14px 30px rgba(15,23,42,.10); border-color: #bfdbfe; }
    .lender-avatar {
      width: 46px; height: 46px; border-radius: 12px; flex-shrink: 0;
      background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff;
      display: grid; place-items: center; font-weight: 800; font-size: 1rem;
    }
    .lender-avatar-lg { width: 68px; height: 68px; font-size: 1.4rem; border-radius: 16px; }
    .lender-body h3 { font-size: 1.05rem; font-weight: 700; }
    .lender-body p { color: var(--mut); font-size: .88rem; margin: .25rem 0 .6rem; }
    .lender-meta { display: flex; gap: 1rem; font-size: .84rem; color: var(--mut); flex-wrap: wrap; }
    .lender-meta strong { color: var(--ink); }
    .lender-hero { display: flex; gap: 1.5rem; align-items: center; margin-bottom: 2rem; }
    .lender-contacts { display: flex; gap: 1.25rem; flex-wrap: wrap; font-size: .92rem; }
    .lender-contacts a { text-decoration: none; font-weight: 600; }
    .lender-contacts a:hover { text-decoration: underline; }

    .manufacturer-link { margin-top: 2.5rem; }

    /* Footer */
    footer { background: #0b1220; color: #94a3b8; margin-top: 4rem; padding: 3rem 1.5rem 2rem; }
    .footer-grid { max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 2.5rem; }
    footer h4 { color: #fff; font-size: .92rem; margin-bottom: .8rem; }
    footer ul { list-style: none; }
    footer li { margin-bottom: .45rem; }
    footer a { color: #94a3b8; text-decoration: none; font-size: .9rem; }
    footer a:hover { color: #fff; }
    .footer-brand p { font-size: .9rem; max-width: 40ch; margin-top: .6rem; }
    .footer-note { max-width: 1180px; margin: 2.5rem auto 0; padding-top: 1.5rem; border-top: 1px solid #1e293b; font-size: .8rem; color: #64748b; }

    @media (max-width: 820px) {
      .detail-hero { grid-template-columns: 1fr; padding: 1.4rem; }
      .footer-grid { grid-template-columns: 1fr; gap: 1.75rem; }
      .compare-art { grid-template-columns: 1fr; }
      .vs-circle { justify-self: center; }
    }
    @media (max-width: 640px) {
      header { padding: .75rem 1rem; }
      header nav { gap: .9rem; }
      header nav a:not(.nav-cta) { display: none; }
      main { padding: 1.25rem 1rem 2rem; }
      .hero { padding: 2.75rem 1.25rem 2.5rem; border-radius: 16px; }
      .hero-stats { gap: 1.5rem; }
      .search-bar button { padding: .7rem 1rem; }
      .vehicle-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: .8rem; }
      .car-art { padding: .7rem .8rem .2rem; }
      .vc-body { padding: .7rem .8rem .9rem; }
      .page-title { font-size: 1.5rem; }
    }
  </style>
</head>
<body>
  <header>
    <a class="logo" href="/">
      <span class="logo-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/><path d="M4 11h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z"/></svg>
      </span>
      <span class="logo-word">Vehicle<span>Lease</span></span>
    </a>
    <nav>
      <a href="/vehicles">Vehicles</a>
      <a href="/categories/electric">Electric</a>
      <a href="/lenders">Providers</a>
      <a class="nav-cta" href="/vehicles?sort=price">Cheapest deals</a>
    </nav>
  </header>
  <main>
    ${content}
  </main>
  <footer>
    <div class="footer-grid">
      <div class="footer-brand">
        <a class="logo" href="/" style="color:#fff">
          <span class="logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/><path d="M4 11h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z"/></svg>
          </span>
          <span class="logo-word">Vehicle<span style="color:#60a5fa">Lease</span></span>
        </a>
        <p>Every mainstream UK model, every lease provider, one comparison. Prices refreshed daily.</p>
      </div>
      <div>
        <h4>Browse</h4>
        <ul>
          <li><a href="/vehicles">All vehicles</a></li>
          <li><a href="/categories/budget-friendly">Under £300/month</a></li>
          <li><a href="/categories/electric">Electric</a></li>
          <li><a href="/categories/hybrid">Hybrid</a></li>
          <li><a href="/categories/suvs">SUVs</a></li>
          <li><a href="/categories/premium">Premium</a></li>
        </ul>
      </div>
      <div>
        <h4>Site</h4>
        <ul>
          <li><a href="/lenders">Lease providers</a></li>
          <li><a href="/sitemap.xml">Sitemap</a></li>
          <li><a href="/llms.txt">llms.txt</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-note">
      <p>© 2026 Vehicle Lease. Prices shown are indicative and change frequently — always confirm the current price, term and mileage allowance with the lease provider before ordering.</p>
    </div>
  </footer>
</body>
</html>`;
}

function html404(env = {}) {
  const content = `
    <div class="empty-state" style="padding:6rem 1rem">
      <p style="font-size:4rem;margin-bottom:.5rem">🚧</p>
      <h1 class="page-title">Page not found</h1>
      <p>That page doesn't exist — but the deals do.</p>
      <a class="btn btn-primary" style="margin-top:1.25rem" href="/vehicles">Browse all vehicles</a>
    </div>
  `;
  return new Response(html('Page Not Found', content, env), {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
