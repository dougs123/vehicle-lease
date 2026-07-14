# Vehicle Lease - API Endpoints

All endpoints serve **HTML** (SSR — server-side rendered). No JSON API yet.

## Public Endpoints

### GET /
**Homepage**

Returns featured vehicles, budget deals, and category navigation.

```bash
curl https://vehicle-lease.rewardspy.workers.dev/
```

**Response**: 200 OK (text/html)
- Featured eco-friendly vehicles (hybrid/electric)
- Budget deals (< £300/month)
- Category hub navigation
- Search bar

---

### GET /vehicles
**Vehicle Listing & Search**

Browse all vehicles with optional filters.

**Query Parameters:**
- `q` (string, optional) — Search by make or model (e.g., `?q=Ford`)
- `fuel` (string, optional) — Filter by fuel type: `Petrol`, `Diesel`, `Hybrid`, `Electric`
- `body` (string, optional) — Filter by body type: `Hatchback`, `Saloon`, `SUV`, `Estate`, `MPV`

```bash
# All vehicles
curl https://vehicle-lease.rewardspy.workers.dev/vehicles

# Search by make
curl "https://vehicle-lease.rewardspy.workers.dev/vehicles?q=Ford"

# Filter by fuel type
curl "https://vehicle-lease.rewardspy.workers.dev/vehicles?fuel=Hybrid"

# Combined filters
curl "https://vehicle-lease.rewardspy.workers.dev/vehicles?q=Ford&fuel=Petrol&body=Hatchback"
```

**Response**: 200 OK (text/html)
- Vehicle grid (up to 100 results)
- Filter form
- Links to individual vehicle pages

**Performance**: ~200ms, edges caches for 5 minutes

---

### GET /vehicles/:slug
**Vehicle Detail Page**

Display single vehicle with all available lease deals.

**Path Parameters:**
- `slug` (string, required) — Vehicle slug (e.g., `ford-fiesta-2024-manual-petrol`)

```bash
# Ford Fiesta
curl https://vehicle-lease.rewardspy.workers.dev/vehicles/ford-fiesta-2024-manual-petrol

# BMW 3 Series
curl https://vehicle-lease.rewardspy.workers.dev/vehicles/bmw-3-series-2024-automatic-petrol
```

**Response**: 200 OK (text/html)
- Vehicle specs (engine, transmission, fuel, CO2, MPG, seating)
- Lease deals table (all lenders offering this vehicle)
  - Monthly price
  - Term (months)
  - Annual mileage allowance
  - Upfront cost
  - Link to lender
- Manufacturer link
- Schema (Product, Offer, BreadcrumbList)
- OG tags for social sharing

**Performance**: ~100ms, edges caches for 1 minute

**Example Response Structure**:
```html
<h1>Ford Fiesta 2024</h1>
<div class="specs">
  <div>Transmission: Manual</div>
  <div>Fuel Type: Petrol</div>
  <div>Power: 85bhp</div>
  <div>CO2: 115g/km</div>
  <div>MPG: 52</div>
  <div>Seating: 5</div>
</div>

<table class="deals">
  <tr>
    <td>Lease Loco</td>
    <td>£239/month</td>
    <td>48 months</td>
    <td>10,000/year</td>
    <td>£1,200 upfront</td>
  </tr>
  <tr>
    <td>You Drive</td>
    <td>£249/month</td>
    <td>36 months</td>
    <td>12,000/year</td>
    <td>£1,500 upfront</td>
  </tr>
</table>
```

---

### GET /lenders
**Lender Directory**

Browse all lease companies with vehicle availability counts.

```bash
curl https://vehicle-lease.rewardspy.workers.dev/lenders
```

**Response**: 200 OK (text/html)
- Lender cards (name, description, specialization)
- Vehicle count per lender
- Contact phone/email (if available)
- Links to lender detail pages & websites

**Example**: 
- Lease Loco - 88 vehicles available
- You Drive - 45 vehicles available
- Leasing.com - 52 vehicles available

---

### GET /lenders/:slug
**Lender Detail Page**

Display single lender with available vehicle inventory.

**Path Parameters:**
- `slug` (string, required) — Lender slug (e.g., `lease-loco`)

```bash
curl https://vehicle-lease.rewardspy.workers.dev/lenders/lease-loco
curl https://vehicle-lease.rewardspy.workers.dev/lenders/you-drive
```

**Response**: 200 OK (text/html)
- Lender info (description, specialization)
- Contact details (phone, email, website link)
- Grid of vehicles this lender offers (limited to 50)
- Monthly price per vehicle

---

### GET /compare/:id1-vs-:id2
**Vehicle Comparison Page**

Side-by-side comparison of two vehicles.

**Path Parameters:**
- `id1`, `id2` (string, required) — Vehicle slugs

```bash
# Ford Fiesta vs Vauxhall Corsa
curl "https://vehicle-lease.rewardspy.workers.dev/compare/ford-fiesta-2024-manual-petrol-vs-vauxhall-corsa-2024-manual-petrol"
```

**Response**: 200 OK (text/html)
- Comparison table (side-by-side)
  - Body type
  - Fuel type
  - Power (bhp)
  - CO2 emissions
  - MPG
  - Seating
  - From £/month (cheapest deal each)
- Links to individual vehicle pages

---

### GET /categories/:slug
**Category Hub Page**

Browse vehicles by category (budget-friendly, electric, family cars, etc.).

**Path Parameters:**
- `slug` (string, required) — Category slug

**Available Categories:**
- `budget-friendly` — Deals under £300/month
- `city-cars` — Compact hatchbacks ≤1200cc
- `family-cars` — Saloons/SUVs with 5+ seats
- `suvs` — Sport Utility Vehicles
- `saloons` — Executive saloons
- `electric` — Zero-emission vehicles
- `hybrid` — Fuel-efficient hybrids
- `premium` — BMW, Mercedes, Audi, Porsche, etc.

```bash
# Budget deals
curl https://vehicle-lease.rewardspy.workers.dev/categories/budget-friendly

# Electric vehicles
curl https://vehicle-lease.rewardspy.workers.dev/categories/electric

# Family cars
curl https://vehicle-lease.rewardspy.workers.dev/categories/family-cars
```

**Response**: 200 OK (text/html)
- Category title & description
- Vehicle grid (sorted by price)
- Links to individual vehicle pages

**Performance**: ~100ms, edges caches for 1 hour

---

## SEO Endpoints

### GET /sitemap.xml
**XML Sitemap for Search Engines**

Lists all indexable URLs with lastmod and priority.

```bash
curl https://vehicle-lease.rewardspy.workers.dev/sitemap.xml
```

**Response**: 200 OK (application/xml)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://vehicle-lease.co.uk/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://vehicle-lease.co.uk/vehicles/ford-fiesta-2024-manual-petrol</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://vehicle-lease.co.uk/categories/budget-friendly</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  ...
</urlset>
```

**Includes:**
- 1× homepage
- 122× vehicle detail pages
- 8× lender detail pages
- 8× category hub pages
- Total: ~138 URLs

---

### GET /robots.txt
**Robots.txt for Search Engine Crawling**

```bash
curl https://vehicle-lease.rewardspy.workers.dev/robots.txt
```

**Response**: 200 OK (text/plain)
```
User-agent: *
Allow: /
Disallow: /admin/

Sitemap: https://vehicle-lease.co.uk/sitemap.xml
```

---

### GET /llms.txt
**LLM-Friendly Site Summary**

Structured information for LLM crawlers (Claude, GPT, etc.).

```bash
curl https://vehicle-lease.rewardspy.workers.dev/llms.txt
```

**Response**: 200 OK (text/plain)
```
# Vehicle Lease Directory

A definitive UK vehicle lease database. Find your perfect car lease deal from multiple lenders.

## About

vehicle-lease.co.uk aggregates lease data for 122 UK car models from 8 major lenders and brokers.

## Hub Pages

- /budget-friendly
- /city-cars
- /electric
- /family-cars
- /hybrid
- /premium
- /saloons
- /suvs

## Navigation

- /vehicles - Browse all vehicles
- /lenders - Browse all lenders
- /categories/:slug - Vehicles by category

## Data

- Monthly lease pricing from UK brokers (Lease Loco, You Drive, Leasing.com, and more)
- Vehicle specifications (power, CO2, MPG, seating)
- Comparison tools to find the best deal
```

---

## Data Ingest Endpoint

### POST /ingest-batch
**Harvest Data Intake**

Accepts lease deal data from automated harvesters. **Requires authentication.**

**Headers:**
- `x-ingest-key` (string, required) — INGEST_KEY secret (256-bit hex)
- `content-type: application/json`

**Request Body** (JSON array):
```json
[
  {
    "make": "Ford",
    "model": "Fiesta",
    "lender": "Lease Loco",
    "monthly_price_gbp": 239,
    "term_months": 48,
    "annual_mileage": 10000,
    "upfront_cost_gbp": 1200,
    "description": "48-month contract, 10k miles/year",
    "source_url": "https://www.leaseloco.com/...",
    "source": "leaseloco"
  },
  ...
]
```

**Response**: 200 OK (application/json)
```json
{
  "success": true,
  "written": 5
}
```

**Error Responses:**
- `401 Unauthorized` — Invalid or missing x-ingest-key
- `400 Bad Request` — Request body is not JSON array
- `500 Internal Server Error` — Database error

**Processing Logic:**
1. Validate x-ingest-key header
2. For each deal in batch:
   - Find vehicle by make|model|2024 pattern (fuzzy slug match)
   - Find or create lender
   - UPSERT lease_deal:
     - If deal exists (same vehicle, lender, term, mileage): update price & last_verified
     - If deal doesn't exist: insert new row
3. Return count of rows successfully written

**Constraints:**
- Batch size: max 1000 deals per request
- Rate limit: standard Cloudflare Workers limit (1000 req/sec)
- Request timeout: 30 seconds
- Database constraints:
  - UNIQUE(vehicle_id, lender_id, term_months, annual_mileage)
  - Foreign keys must exist (vehicle + lender must be in DB)

**Example with curl:**
```bash
curl -X POST \
  -H "x-ingest-key: 0a66ef9ee8aaec8c233683824883ff31091551a9b9a3366c59d62a323b7714d3" \
  -H "content-type: application/json" \
  -d '[
    {
      "make": "Ford",
      "model": "Fiesta",
      "lender": "Lease Loco",
      "monthly_price_gbp": 239,
      "term_months": 48,
      "annual_mileage": 10000
    }
  ]' \
  https://vehicle-lease.rewardspy.workers.dev/ingest-batch
```

---

## Admin Endpoints

### POST /admin/seed
**Database Seeding (Development Only)**

Reinitializes database from seed files. **Requires authentication.**

**Headers:**
- `Authorization: Bearer [SEED_TOKEN]` (optional)
- `content-type: application/json`

**Response**: 200 OK (application/json)
```json
{
  "success": true,
  "rows": 140
}
```

**Usage:**
```bash
curl -X POST \
  -H "Authorization: Bearer dev-seed-token" \
  https://vehicle-lease.rewardspy.workers.dev/admin/seed
```

⚠️ **Warning**: This endpoint is for development. In production, use `wrangler d1 execute` instead.

---

## Response Headers

| Header | Value | Notes |
|--------|-------|-------|
| `content-type` | `text/html; charset=utf-8` | All public pages are HTML |
| `cache-control` | `public, max-age=60` | Homepage: 1 min; detail pages: 1 min; hubs: 1 hour |
| `x-content-type-options` | `nosniff` | Cloudflare default |
| `x-frame-options` | `SAMEORIGIN` | Cloudflare default |

---

## Rate Limiting

**Public Endpoints:**
- Soft limit: 1000 requests/second per IP
- Hard limit: Automatic rate-limit after abuse detected
- No per-route limits (all routes share the pool)

**Ingest Endpoint (/ingest-batch):**
- Auth required (x-ingest-key)
- No rate limit enforced (trusted source)
- Can POST at any frequency

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Vehicle page loaded |
| 400 | Bad request | Malformed JSON in ingest |
| 401 | Unauthorized | Missing/invalid x-ingest-key |
| 404 | Not found | Vehicle slug doesn't exist |
| 500 | Server error | Database query failed |

### Common Errors

**404 - Vehicle Not Found**
```
GET /vehicles/nonexistent-car-2024
Response: 404 HTML page with link to homepage
```

**401 - Ingest Unauthorized**
```
POST /ingest-batch with missing/invalid x-ingest-key
Response: 401 JSON { "error": "Unauthorized" }
```

**400 - Ingest Bad Request**
```
POST /ingest-batch with non-JSON body
Response: 400 JSON { "error": "Expected array of deals" }
```

---

## Performance Targets

| Route | Target | Cache | Strategy |
|-------|--------|-------|----------|
| GET / | < 150ms | 1 min | Query featured + budgets (small dataset) |
| GET /vehicles?q=... | < 200ms | 5 min | Limited to 100 results, indexed queries |
| GET /vehicles/:slug | < 100ms | 1 min | Single vehicle + deals (fast lookup) |
| GET /categories/:slug | < 100ms | 1 hour | Pre-computed category membership |
| POST /ingest-batch | < 500ms | N/A | Batch upserts (up to 100 per batch) |

**Caching Strategy:**
- Edge caching via Cloudflare (worker-defined via Cache-Control header)
- Browser caching: 1 minute (prevents repeated queries within session)
- No application-level caching (D1 queries are fast enough)

---

## Future API Plans

1. **GraphQL Endpoint** — `/graphql` for advanced querying
2. **JSON API** — `/api/vehicles`, `/api/deals` for mobile/SPA consumption
3. **Webhooks** — POST to subscriber URLs when prices drop
4. **CSV Export** — `/api/export?format=csv&category=budget-friendly`
5. **RSS Feed** — `/feed.xml` for price alerts
