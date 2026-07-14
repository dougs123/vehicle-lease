# Vehicle Lease - Architecture & Design

## Overview

**vehicle-lease.co.uk** is a vehicle lease comparison platform built on **Cloudflare Workers + D1**. It provides:
- Browse 122+ UK car models with real-time lease pricing
- Compare deals from 8+ lenders (Lease Loco, You Drive, Leasing.com, etc.)
- Daily automated harvesting of lease deals from multiple sources
- SEO-optimized pages with structured data (JSON-LD, sitemap, llms.txt)

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Hosting** | Cloudflare Workers | Serverless edge runtime |
| **Database** | Cloudflare D1 | SQLite-based serverless database |
| **Scraping** | Playwright (Node.js) | Daily lease deal harvesting |
| **CI/CD** | GitHub Actions | Automated daily harvest workflow |
| **Version Control** | Git/GitHub | dougs123/vehicle-lease |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions (Daily)                    │
│                   lease-harvester.mjs                         │
│  Scrapes: Lease Loco, You Drive, Leasing.com, etc.          │
│  Posts: JSON batch to /ingest-batch                          │
└────────────────────────┬────────────────────────────────────┘
                         │ POST + x-ingest-key header
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         Cloudflare Worker (vehicle-lease)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Routes:                                              │  │
│  │  GET  /                     → Homepage                │  │
│  │  GET  /vehicles             → Vehicle listing         │  │
│  │  GET  /vehicles/:slug       → Vehicle detail          │  │
│  │  GET  /lenders              → Lender directory        │  │
│  │  GET  /lenders/:slug        → Lender detail           │  │
│  │  GET  /compare/:id1-vs-:id2 → Comparison              │  │
│  │  GET  /categories/:slug     → Hub pages               │  │
│  │  GET  /sitemap.xml          → XML sitemap             │  │
│  │  GET  /robots.txt           → SEO                      │  │
│  │  GET  /llms.txt             → LLM-friendly            │  │
│  │  POST /ingest-batch         → Harvest intake          │  │
│  │  POST /admin/seed           → DB seeding              │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ Bindings
                         ▼
┌─────────────────────────────────────────────────────────────┐
│        Cloudflare D1 Database (vehicle_lease)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Tables:                                               │  │
│  │  • vehicles (122 rows)                                │  │
│  │  • lenders (8 rows)                                   │  │
│  │  • lease_deals (88+ rows)                             │  │
│  │  • categories (8 rows)                                │  │
│  │  • vehicle_categories (M2M)                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### vehicles
```sql
CREATE TABLE vehicles (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE,           -- ford-fiesta-2024-manual-petrol
  make TEXT,                  -- Ford
  model TEXT,                 -- Fiesta
  year INTEGER,               -- 2024
  body_type TEXT,             -- Hatchback
  transmission TEXT,          -- Manual, Automatic
  fuel_type TEXT,             -- Petrol, Hybrid, Electric
  engine_size_cc INTEGER,
  power_bhp INTEGER,
  co2_g_km INTEGER,
  mpg_combined REAL,
  seating INTEGER,
  doors INTEGER,
  boot_litres INTEGER,
  description TEXT,
  manufacturer_url TEXT
);
```

### lenders
```sql
CREATE TABLE lenders (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE,
  name TEXT,                  -- Lease Loco
  url TEXT,
  phone TEXT,
  email TEXT,
  specialization TEXT,
  description TEXT
);
```

### lease_deals
```sql
CREATE TABLE lease_deals (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER FK,
  lender_id INTEGER FK,
  monthly_price_gbp REAL,     -- e.g., 239.00
  term_months INTEGER,        -- 36, 48
  annual_mileage INTEGER,     -- 10000, 12000, 15000
  upfront_cost_gbp REAL,
  last_verified DATE,
  UNIQUE(vehicle_id, lender_id, term_months, annual_mileage)
);
```

### categories
```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE,           -- budget-friendly
  name TEXT,
  description TEXT
);
```

- **budget-friendly**: £179–£300/month
- **city-cars**: Compact hatchbacks ≤1200cc
- **family-cars**: Saloons/SUVs with 5+ seats
- **suvs**: Sport Utility Vehicles
- **saloons**: Executive saloons
- **electric**: Zero-emission
- **hybrid**: Fuel-efficient hybrids
- **premium**: BMW, Mercedes, Audi, Porsche, Jaguar, Lexus

## Request/Response Flow

### Homepage (GET /)
```
1. Query featured vehicles (hybrid/electric, sorted by price)
2. Query budget deals (< £300/month)
3. Query all categories
4. Render HTML with hardcoded CSS + JavaScript
5. Return 200 OK with HTML
```

### Vehicle Detail (GET /vehicles/:slug)
```
1. Query vehicles by slug
2. Query lease_deals for that vehicle_id
3. Render vehicle specs + all available deals
4. Include og:image, schema (Product, Offer, BreadcrumbList)
5. Return 200 OK with HTML
```

### Harvest Ingest (POST /ingest-batch)
```
Request Headers:
  x-ingest-key: [INGEST_KEY]
  content-type: application/json

Request Body:
  [
    {
      make: "Ford",
      model: "Fiesta",
      lender: "Lease Loco",
      monthly_price_gbp: 239,
      term_months: 48,
      annual_mileage: 10000,
      description: "From Lease Loco",
      source: "leaseloco"
    },
    ...
  ]

Response:
  {
    success: true,
    written: 5
  }

Process:
1. Validate x-ingest-key header
2. For each deal in batch:
   - Find vehicle by make|model|2024 pattern
   - Find or create lender
   - UPSERT lease_deal (update if exists, insert if new)
   - Set last_verified = today
3. Return count of written rows
```

## Data Flow: Daily Harvest

```
Time: 06:00 UTC
Event: GitHub Actions triggers lease-harvester.mjs

Step 1: SCRAPE
  lease-harvester.mjs loads Playwright browser
  
  For each site (Lease Loco, You Drive, Leasing.com, ...):
    - Navigate to search page
    - Wait for dynamic content to load
    - Evaluate page with CSS selectors
    - Extract { make, model, lender, monthly_price_gbp, ... }
    - Add to results array
  
  Output: /tmp/lease-deals.json with all scraped deals

Step 2: DEDUPLICATE
  Compare: make|model|lender|monthly_price_gbp
  Remove duplicates
  Keep unique deals only
  
  Output: dedup array (122 max items)

Step 3: BATCH POST
  For each batch of ≤100 deals:
    POST to https://vehicle-lease.rewardspy.workers.dev/ingest-batch
    Headers: x-ingest-key=[secret]
    Body: JSON array of deals
    
    Response: { success: true, written: 12 }

Step 4: DATABASE UPDATE
  Worker's /ingest-batch endpoint:
    - Validates key
    - Matches each deal to a vehicle
    - Creates lenders if missing
    - UPSERTs into lease_deals table
    - Returns count of rows written

Step 5: VISIBLE ON SITE
  Fresh deals appear on:
    - /vehicles/ford-fiesta-2024 (list of offers)
    - / (homepage featured deals)
    - /categories/budget-friendly (aggregated)
  
  Price updated if already exists for same lender/term/mileage
```

## Deployment Model

### Development
```bash
npm run build                # Generate site/seed/data.sql
npm run dev                  # Local wrangler dev server
npx wrangler d1 execute vehicle_lease --file site/seed/data.sql --local
```

### Staging (Cloudflare Preview)
- Every push to GitHub triggers wrangler deploy
- URL: https://vehicle-lease.rewardspy.workers.dev

### Production
- Custom domain: vehicle-lease.co.uk
- Same worker, same database
- Attached via Cloudflare zone routing

## Security

| Layer | Method |
|-------|--------|
| **Ingest Auth** | x-ingest-key header (256-bit random hex) |
| **Database** | Cloudflare D1 (firewall, encrypted at rest) |
| **CORS** | None (no API, only HTML) |
| **Rate Limit** | Cloudflare Workers default (1000 req/sec) |
| **Admin Routes** | /admin/* require SEED_TOKEN (for manual seed) |

### Secrets Storage
- **GitHub Actions**: INGEST_KEY (env secret)
- **Cloudflare Worker**: INGEST_KEY (wrangler secret)
- Both must match for harvest to work

## Performance

| Page | Render Time | Cache |
|------|-------------|-------|
| Homepage | ~150ms | Edge (1 min) |
| Vehicle Detail | ~100ms | Edge (1 min) |
| Vehicle List (100) | ~200ms | Edge (5 min) |
| Sitemap XML | ~50ms | Edge (1 hour) |

- D1 queries: < 50ms average
- No client-side JS (pure HTML/CSS)
- HTML renders server-side (SSR)
- Sitemap pre-built at deploy time

## SEO

| Signal | Implementation |
|--------|-----------------|
| **Sitemap** | /sitemap.xml (all vehicles + hubs) |
| **Robots** | /robots.txt (allow all, disallow /admin) |
| **Schema** | JSON-LD (BreadcrumbList, Product, Offer, Organization) |
| **OG Tags** | og:title, og:description, og:type |
| **Canonical** | Implicit (only HTTPS, no params) |
| **LLMs** | /llms.txt (hub pages + category nav) |
| **Breadcrumbs** | HTML + JSON-LD on detail pages |

## Monitoring & Observability

| What | How |
|------|-----|
| **Harvest Status** | GitHub Actions logs → Artifacts |
| **Worker Errors** | Cloudflare Workers dashboard → Tail |
| **Database Metrics** | Cloudflare D1 dashboard (queries, throughput) |
| **Search Console** | GSC verification via meta tag (manual setup) |
| **Analytics** | GA4 tracking (manual setup via GA_ID var) |

## Future Enhancements

1. **Real-time API Scrapers**
   - Vanarama GraphQL endpoint
   - Cazoo API integration
   - Leasing.com `/api/search`

2. **ML/Pricing**
   - Price trend tracking (30-day history)
   - "Best value" badge algorithm
   - Predictions per make/model

3. **User Features**
   - Wishlist (localStorage)
   - Price alerts (email via Resend)
   - Finance calculator
   - Insurance integration

4. **Merchant Integration**
   - Affiliate links
   - Commission tracking
   - Co-branded landing pages

5. **Mobile App**
   - React Native or Flutter
   - Same D1 database
   - Push notifications for price drops
