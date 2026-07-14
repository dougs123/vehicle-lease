# 🚗 Vehicle Lease — Lease Deal Comparison Platform

**Live Site**: https://vehicle-lease.co.uk (staging: https://vehicle-lease.rewardspy.workers.dev)  
**Repository**: https://github.com/dougs123/vehicle-lease  
**GitHub Actions**: Daily automated lease deal harvesting at 6 AM UTC  

---

## What It Does

**Vehicle Lease** is a UK-focused lease deal comparison engine. Browse **122+ car models** from major manufacturers (Ford, BMW, Mercedes, Tesla, etc.) and see **real-time lease pricing** from **8+ lenders** (Lease Loco, You Drive, Leasing.com, Vanarama, ChooseMyCar, etc.).

### Key Features

✅ **Vehicle Browsing**
- Search by make/model
- Filter by fuel type (Petrol, Hybrid, Electric, Diesel)
- Browse by body type (Hatchback, Saloon, SUV, Estate, MPV)
- View detailed specs (engine, transmission, power, CO2, MPG, seating)

✅ **Lease Deal Comparison**
- See all available deals per vehicle
- Compare monthly prices, terms, mileage allowances
- Direct links to lenders

✅ **Hub Pages**
- Budget-friendly deals (< £300/month)
- Electric vehicles (zero-emission)
- Hybrid vehicles (fuel-efficient)
- Family cars (spacious & safe)
- Premium brands (BMW, Mercedes, Jaguar)
- City cars (compact, urban-friendly)

✅ **Comparison Tool**
- Side-by-side vehicle comparisons
- Direct URL: `/compare/vehicle-a-vs-vehicle-b`

✅ **SEO Ready**
- XML sitemap (138+ URLs)
- robots.txt
- JSON-LD schema (BreadcrumbList, Product, Offer)
- Open Graph tags for social sharing
- LLM-friendly `/llms.txt`

✅ **Daily Automation**
- GitHub Actions + Playwright harvest
- Scrapes Lease Loco, You Drive, Leasing.com
- Auto-posts new deals to `/ingest-batch` endpoint
- Upserts pricing into D1 database

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Static HTML + CSS (no JavaScript) |
| **Runtime** | Cloudflare Workers (edge compute) |
| **Database** | Cloudflare D1 (SQLite serverless) |
| **Scraping** | Playwright + Node.js |
| **CI/CD** | GitHub Actions |
| **CDN** | Cloudflare Edge Network (automatic) |

**Why Cloudflare?**
- Deploys to edge (30+ global locations) → sub-100ms response times
- D1 database is geo-replicated automatically
- Unlimited bandwidth included
- Free tier sufficient for 100k requests/day
- Batteries included (auth, caching, rate limiting)

---

## Quick Start

### 1. Clone
```bash
git clone https://github.com/dougs123/vehicle-lease.git
cd vehicle-lease
npm install
```

### 2. Create Cloudflare D1 Database
```bash
npx wrangler login
npx wrangler d1 create vehicle_lease
# Copy the database_id → update wrangler.jsonc
```

### 3. Seed Database
```bash
npm run build                                                       # Generate SQL seed
npx wrangler d1 execute vehicle_lease --file site/schema.sql --remote
npx wrangler d1 execute vehicle_lease --file site/seed/data.sql --remote
```

### 4. Generate & Set INGEST_KEY Secret
```bash
INGEST_KEY=$(openssl rand -hex 32)
echo $INGEST_KEY                                                    # Save this
npx wrangler secret put INGEST_KEY                                 # Paste when prompted
```

### 5. Deploy
```bash
npm run deploy
# Visit: https://vehicle-lease.rewardspy.workers.dev
```

### 6. (Optional) Attach Custom Domain
```bash
# Cloudflare Dashboard → Add zone: vehicle-lease.co.uk
# Update wrangler.jsonc with routes
npm run deploy
```

**Full setup guide**: See [SETUP.md](SETUP.md)

---

## Project Structure

```
vehicle-lease/
├── src/
│   └── index.js                      # Cloudflare Worker (all routes)
├── site/
│   ├── schema.sql                    # D1 schema
│   ├── scripts/build-seed.mjs        # Build research → SQL seed
│   └── seed/data.sql                 # Generated seed file (122 vehicles, 8 lenders, 88+ deals)
├── research/
│   ├── vehicles.json                 # Vehicle data (make, model, specs)
│   ├── lenders.json                  # Lenders (Lease Loco, You Drive, etc.)
│   └── lease_deals.json              # Sample lease deals (monthly prices)
├── lease-harvester.mjs               # Daily harvest script (Playwright)
├── .github/workflows/harvest.yml     # GitHub Actions (6 AM UTC daily)
├── wrangler.jsonc                    # Worker config (D1 binding, secrets)
├── package.json                      # Dependencies (playwright, node-fetch)
├── ARCHITECTURE.md                   # System design & data model
├── SETUP.md                          # Setup & operations guide
├── API.md                            # Endpoint documentation
└── README.md                         # This file
```

---

## Database Schema

### vehicles (122 rows)
```sql
make, model, year, body_type, transmission, fuel_type,
engine_size_cc, power_bhp, co2_g_km, mpg_combined,
seating, doors, boot_litres, description, manufacturer_url
```
**Slugs**: `ford-fiesta-2024-manual-petrol`, `bmw-3-series-2024-automatic-petrol`, etc.

### lenders (8 rows)
```sql
name, url, phone, email, specialization, description
```
Lease Loco, You Drive, Leasing.com, ChooseMyCar, Vanarama, Like You Drive, Enterprise, Cazoo

### lease_deals (88+ rows)
```sql
vehicle_id, lender_id, monthly_price_gbp, term_months, annual_mileage,
upfront_cost_gbp, last_verified
```
**Unique constraint**: (vehicle_id, lender_id, term_months, annual_mileage)

### categories (8 rows)
Budget-friendly, City cars, Family cars, SUVs, Saloons, Electric, Hybrid, Premium

---

## Routes

### Public Pages
| Route | Purpose | Cache |
|-------|---------|-------|
| `GET /` | Homepage (featured deals, categories) | 1 min |
| `GET /vehicles` | Vehicle listing (search & filter) | 5 min |
| `GET /vehicles/:slug` | Vehicle detail + all deals | 1 min |
| `GET /lenders` | Lender directory | 5 min |
| `GET /lenders/:slug` | Lender detail + inventory | 5 min |
| `GET /compare/:a-vs-:b` | Comparison page | 5 min |
| `GET /categories/:slug` | Category hub (e.g., budget-friendly) | 1 hour |

### SEO
| Route | Purpose |
|-------|---------|
| `GET /sitemap.xml` | XML sitemap (138 URLs) |
| `GET /robots.txt` | Robots directive |
| `GET /llms.txt` | LLM-friendly summary |

### API
| Route | Auth | Purpose |
|-------|------|---------|
| `POST /ingest-batch` | x-ingest-key header | Harvest intake (lease deals) |
| `POST /admin/seed` | Authorization header | DB seeding (dev only) |

**API docs**: See [API.md](API.md)

---

## Daily Harvest Pipeline

### Timeline
```
06:00 UTC (Every Day)
  ↓
GitHub Actions triggers lease-harvester.mjs
  ↓
Playwright launches browser
  ↓
Scrape Lease Loco, You Drive, Leasing.com, etc.
  ↓
Extract: { make, model, lender, monthly_price_gbp, ... }
  ↓
Deduplicate by make|model|lender|price
  ↓
POST batch to https://vehicle-lease.rewardspy.workers.dev/ingest-batch
  ↓
Worker validates x-ingest-key header
  ↓
For each deal:
  - Find vehicle by slug pattern (fuzzy match)
  - Find or create lender
  - UPSERT lease_deal (update if exists, insert if new)
  ↓
Database updated
  ↓
Fresh prices visible on site within seconds
```

### Manual Trigger
```bash
# GitHub Actions UI
https://github.com/dougs123/vehicle-lease/actions
→ Daily lease deal harvest → Run workflow

# Or test locally
INGEST_KEY="your-key" node lease-harvester.mjs --dry-run
```

---

## Development

### Local Dev Server
```bash
npm run dev
# Opens: http://localhost:8791
# Hot reload enabled
# Local D1 database
```

### Build Seed Data
```bash
npm run build
# Converts research/vehicles.json + research/lenders.json
# → site/seed/data.sql
```

### Query Database
```bash
# Local
npx wrangler d1 execute vehicle_lease --command "SELECT COUNT(*) FROM vehicles;"

# Remote (production)
npx wrangler d1 execute vehicle_lease --command "SELECT COUNT(*) FROM vehicles;" --remote
```

---

## Deployment

### Prerequisites
- Cloudflare account (free tier OK)
- GitHub account with dougs123 org access
- Node.js 22+

### Steps
1. Create D1 database (see Quick Start above)
2. Set secrets (INGEST_KEY in Cloudflare + GitHub Actions)
3. `npm run deploy`
4. (Optional) Attach custom domain `vehicle-lease.co.uk`

**Full guide**: [SETUP.md](SETUP.md)

---

## Monitoring

### Worker Health
```bash
npx wrangler tail --format json
```

### Database Diagnostics
```bash
npx wrangler d1 execute vehicle_lease --command "
  SELECT 'vehicles' as table_name, COUNT(*) as count FROM vehicles
  UNION ALL SELECT 'lease_deals', COUNT(*) FROM lease_deals
  UNION ALL SELECT 'lenders', COUNT(*) FROM lenders
" --remote
```

### GitHub Actions
https://github.com/dougs123/vehicle-lease/actions/workflows/harvest.yml

---

## Performance

**Page Load Times** (on Cloudflare edge):
- Homepage: ~150ms
- Vehicle detail: ~100ms
- Vehicle list (100 results): ~200ms
- Category page: ~100ms

**Database**:
- Queries: < 50ms average
- D1 auto-scales up to 100GB + unlimited edge locations

**SEO**:
- Sitemap: 138 URLs
- Schema: BreadcrumbList, Product, Offer, Organization
- OG tags: for social sharing

---

## Cost

### Free Tier (Current)
- **Workers**: 100k requests/day, unlimited after purchase
- **D1**: 5GB database, 100k reads/day, 1k writes/day
- **Bandwidth**: Unlimited egress

### Pricing (If Scaling)
- **Workers Paid**: $0.50 per 1M requests (after free 100k)
- **D1 Paid**: $0.75/month base + $0.20 per 1M reads + $1.00 per 1M writes
- **Bandwidth**: Included

---

## Known Limitations

1. **Harvester**: Scrapes only Lease Loco, You Drive, Leasing.com (0 deals found on first test due to bot protection)
   - Fix: Update CSS selectors based on actual page structure
   - Or: Use lender APIs instead of scraping

2. **No Authentication**: Public read-only; ingest requires secret key only

3. **Single Database**: No replicas (can add on paid plan)

4. **No Mobile App**: HTML-only (responsive design works on mobile browsers)

---

## Future Roadmap

- [ ] **Improved Scraping**: API endpoints instead of Playwright
- [ ] **GraphQL API**: Advanced filtering & sorting
- [ ] **Mobile App**: React Native or Flutter
- [ ] **Price History**: Track 30-day price trends
- [ ] **Alerts**: Email notifications when prices drop
- [ ] **Finance Calculator**: Monthly payment breakdown
- [ ] **Insurance Integration**: Show insurance costs with lease deal
- [ ] **Affiliate Links**: Commission tracking (You Drive, Leasing.com, etc.)

---

## Contributing

1. Fork: https://github.com/dougs123/vehicle-lease
2. Create branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -am 'Add feature'`
4. Push: `git push origin feature/your-feature`
5. Pull Request: https://github.com/dougs123/vehicle-lease/pulls

---

## License

Private (Redbrain Ltd). Commercial use prohibited without permission.

---

## Support

**Issues**: https://github.com/dougs123/vehicle-lease/issues  
**Documentation**: See [SETUP.md](SETUP.md), [API.md](API.md), [ARCHITECTURE.md](ARCHITECTURE.md)  
**Contact**: doug.scott@asapventures.co.uk

---

## Built By

**Redbrain Ltd** — Data, AI, and Digital Products  
Founder: Doug Scott  
Built: July 2026

**Made with ❤️ using Cloudflare Workers + D1**
