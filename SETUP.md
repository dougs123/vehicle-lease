# Vehicle Lease - Setup & Operations Guide

## Quick Start (5 minutes)

### Prerequisites
- Node.js 22+
- Cloudflare account with Workers + D1 enabled
- GitHub account with dougs123 org access

### 1. Clone & Install
```bash
git clone https://github.com/dougs123/vehicle-lease.git
cd vehicle-lease
npm install
```

### 2. Authenticate with Cloudflare
```bash
npx wrangler login
# Opens browser for OAuth, saves credentials
```

### 3. Create D1 Database
```bash
npx wrangler d1 create vehicle_lease
# Returns: database_id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 4. Update Config
Edit `wrangler.jsonc`:
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "vehicle_lease",
    "database_id": "PASTE-YOUR-ID-HERE"  // ← Update this
  }
]
```

### 5. Seed Database
```bash
npm run build                                    # Generate site/seed/data.sql
npx wrangler d1 execute vehicle_lease --file site/schema.sql --remote
npx wrangler d1 execute vehicle_lease --file site/seed/data.sql --remote
```

### 6. Set Secrets
```bash
# Generate strong key
INGEST_KEY=$(openssl rand -hex 32)
echo $INGEST_KEY

# Set in Cloudflare
npx wrangler secret put INGEST_KEY
# Paste the key when prompted

# Set in GitHub (https://github.com/dougs123/vehicle-lease/settings/secrets)
# Create secret: Name=INGEST_KEY, Value=[your-key-above]
```

### 7. Deploy
```bash
npm run deploy
# Visit: https://vehicle-lease.rewardspy.workers.dev
```

### 8. Attach Custom Domain (Optional)
```bash
# In Cloudflare Dashboard:
# 1. Add zone: vehicle-lease.co.uk
# 2. Point domain registrar to Cloudflare nameservers
# 3. Update wrangler.jsonc:

"routes": [
  {
    "pattern": "vehicle-lease.co.uk/*",
    "zone_name": "vehicle-lease.co.uk"
  }
]

# 4. Redeploy
npm run deploy
```

---

## Local Development

### Start Dev Server
```bash
npm run dev
# Opens: http://localhost:8791
# Hot reload enabled
# Local D1 database (doesn't affect production)
```

### Local Database Operations
```bash
# Query local database
npx wrangler d1 execute vehicle_lease --command "SELECT COUNT(*) FROM vehicles;"

# Seed local database
npx wrangler d1 execute vehicle_lease --file site/seed/data.sql --local

# Execute SQL file
npx wrangler d1 execute vehicle_lease --file script.sql --local
```

### Testing Routes
```bash
# Homepage
curl http://localhost:8791/

# Vehicle list
curl http://localhost:8791/vehicles?q=Ford

# Vehicle detail
curl http://localhost:8791/vehicles/ford-fiesta-2024-manual-petrol

# Lenders
curl http://localhost:8791/lenders

# Comparison
curl http://localhost:8791/compare/ford-fiesta-2024-manual-petrol-vs-vauxhall-corsa-2024-manual-petrol

# Category (hub page)
curl http://localhost:8791/categories/budget-friendly

# Sitemap
curl http://localhost:8791/sitemap.xml

# Robots
curl http://localhost:8791/robots.txt

# LLMs
curl http://localhost:8791/llms.txt
```

### Test Ingest Endpoint
```bash
# Generate test data
cat > /tmp/test-deals.json <<'EOF'
[
  {
    "make": "Ford",
    "model": "Fiesta",
    "lender": "Lease Loco",
    "monthly_price_gbp": 199,
    "term_months": 48,
    "annual_mileage": 10000
  }
]
EOF

# POST to local worker
curl -X POST \
  -H "x-ingest-key: YOUR-INGEST-KEY" \
  -H "content-type: application/json" \
  -d @/tmp/test-deals.json \
  http://localhost:8791/ingest-batch
```

---

## Data Management

### Update Vehicle List
```bash
# 1. Edit research/vehicles.json
# 2. Rebuild seed
npm run build

# 3. Option A: Full reseed (production)
npx wrangler d1 delete vehicle_lease    # ⚠️  Deletes all data
npx wrangler d1 create vehicle_lease
npx wrangler d1 execute vehicle_lease --file site/schema.sql --remote
npx wrangler d1 execute vehicle_lease --file site/seed/data.sql --remote

# 3. Option B: Manual INSERT (preserve existing data)
# Use wrangler to run individual SQL:
npx wrangler d1 execute vehicle_lease --command "
  INSERT INTO vehicles (...) VALUES (...)
" --remote
```

### Update Lenders
```bash
# 1. Edit research/lenders.json
# 2. Rebuild
npm run build

# 3. Manually insert new lenders:
npx wrangler d1 execute vehicle_lease --command "
  INSERT INTO lenders (slug, name, url, phone, specialization, description)
  VALUES ('vanarama', 'Vanarama', 'https://www.vanarama.com', '0330 111 0222', 'Van and car leasing', 'Wide range...')
" --remote
```

### Manually Add Lease Deals
```bash
npx wrangler d1 execute vehicle_lease --command "
  INSERT INTO lease_deals (vehicle_id, lender_id, monthly_price_gbp, term_months, annual_mileage, last_verified)
  VALUES (1, 2, 299, 48, 12000, CURRENT_DATE)
" --remote
```

### Query Examples
```bash
# Most affordable cars
npx wrangler d1 execute vehicle_lease --command "
  SELECT v.make, v.model, MIN(ld.monthly_price_gbp) as min_price
  FROM vehicles v
  LEFT JOIN lease_deals ld ON v.id = ld.vehicle_id
  GROUP BY v.id
  ORDER BY min_price ASC
  LIMIT 10
" --remote --json

# Deals from specific lender
npx wrangler d1 execute vehicle_lease --command "
  SELECT v.make, v.model, ld.monthly_price_gbp, ld.term_months
  FROM lease_deals ld
  JOIN vehicles v ON ld.vehicle_id = v.id
  JOIN lenders l ON ld.lender_id = l.id
  WHERE l.name = 'Lease Loco'
  ORDER BY ld.monthly_price_gbp ASC
  LIMIT 20
" --remote --json

# Categories for a vehicle
npx wrangler d1 execute vehicle_lease --command "
  SELECT c.name FROM vehicle_categories vc
  JOIN categories c ON vc.category_id = c.id
  WHERE vc.vehicle_id = 1
" --remote --json
```

---

## Harvester / Automation

### Manual Harvest Test
```bash
# Dry run (don't POST to worker)
INGEST_KEY="your-key" node lease-harvester.mjs --dry-run

# Dry run for single site
INGEST_KEY="your-key" node lease-harvester.mjs --dry-run --only leaseloco

# Live harvest (posts to worker)
INGEST_KEY="your-key" INGEST_URL="https://vehicle-lease.rewardspy.workers.dev/ingest-batch" node lease-harvester.mjs
```

### View Harvest Results
```bash
# Last harvest output
cat /tmp/lease-deals.json | jq '.' | head -50

# Check GitHub Actions runs
# https://github.com/dougs123/vehicle-lease/actions/workflows/harvest.yml
# View logs for each run
```

### Update Harvest Selectors
Lease sites frequently change their HTML structure. If harvester returns 0 deals:

1. **Inspect live site:**
   ```bash
   # Run in browser dev tools console on each site
   # Find the CSS selectors for: make, model, price
   ```

2. **Update lease-harvester.mjs:**
   ```javascript
   // Find scrapeLeaseLoco() function
   // Update selectors in the page.evaluate() function
   // Test locally with --dry-run
   ```

3. **Commit & push:**
   ```bash
   git add lease-harvester.mjs
   git commit -m "Fix lease loco scraper selectors"
   git push origin main
   # Next harvest will use updated selectors
   ```

### Manual Trigger Harvest
```bash
# Via GitHub Actions UI:
# 1. https://github.com/dougs123/vehicle-lease/actions
# 2. Click "Daily lease deal harvest"
# 3. "Run workflow" button
# 4. Optional: Check "dry_run" checkbox
# 5. "Run workflow"
# 6. Monitor logs in real-time

# View results in artifacts:
# Click completed run → Artifacts → download lease-deals-{run-id}.zip
```

---

## Monitoring & Troubleshooting

### Check Worker Health
```bash
# View recent requests/errors
npx wrangler tail --format json | head -50

# Filter to errors only
npx wrangler tail --status error
```

### Database Diagnostics
```bash
# Check database size
npx wrangler d1 info vehicle_lease

# Verify tables exist
npx wrangler d1 execute vehicle_lease --command "
  SELECT name FROM sqlite_master WHERE type='table'
" --remote --json

# Count rows per table
npx wrangler d1 execute vehicle_lease --command "
  SELECT 'vehicles' as table_name, COUNT(*) as count FROM vehicles
  UNION ALL
  SELECT 'lease_deals', COUNT(*) FROM lease_deals
  UNION ALL
  SELECT 'lenders', COUNT(*) FROM lenders
  UNION ALL
  SELECT 'categories', COUNT(*) FROM categories
" --remote --json
```

### Common Issues

#### "Database not found"
- Did you update wrangler.jsonc with the correct database_id?
- Did you run `npx wrangler d1 execute ... --remote`? (Note the --remote flag)

#### "UNIQUE constraint failed: vehicles.slug"
- Vehicle slug already exists (duplicate make/model/year/transmission/fuel)
- Check research/vehicles.json for exact duplicates
- Or manually delete and re-seed with fresh data

#### "x-ingest-key: Unauthorized"
- Harvester key doesn't match worker secret
- Verify both GitHub and Cloudflare secrets are set correctly:
  ```bash
  # View GitHub secret (redacted)
  gh secret view INGEST_KEY -R dougs123/vehicle-lease
  
  # Regenerate and reset both if mismatched
  NEW_KEY=$(openssl rand -hex 32)
  npx wrangler secret put INGEST_KEY   # Paste $NEW_KEY
  gh secret set INGEST_KEY -R dougs123/vehicle-lease -b "$NEW_KEY"
  ```

#### "0 deals found by harvester"
- Sites use heavy JavaScript — Playwright might not load content properly
- Selectors no longer match page structure
- Try --dry-run to see what Playwright captures
- Check GitHub Actions logs for exact error messages
- Update CSS selectors in lease-harvester.mjs based on actual site HTML

#### "Slow pages / Database timeouts"
- D1 has request timeout of 30 seconds
- Complex queries (many JOINs) may exceed limit
- Break into multiple queries
- Add indexes to frequently filtered columns

---

## Backup & Restore

### Backup D1 Data
```bash
# Export all tables as SQL
npx wrangler d1 execute vehicle_lease --command "
  SELECT sql FROM sqlite_master WHERE type='table'
" --remote > backup-schema.sql

# Export actual data
# (requires manual SQL dumps per table, D1 doesn't have native export)
npx wrangler d1 execute vehicle_lease --command "
  SELECT * FROM vehicles LIMIT 1000
" --remote --json > backup-vehicles.json
```

### Restore from Backup
```bash
# Schema + seed from version control
git checkout site/schema.sql site/seed/data.sql

# Reseed (destructive!)
npx wrangler d1 delete vehicle_lease -y
npx wrangler d1 create vehicle_lease
npx wrangler d1 execute vehicle_lease --file site/schema.sql --remote
npx wrangler d1 execute vehicle_lease --file site/seed/data.sql --remote
```

---

## Scaling Considerations

### Current Limits
- **Workers**: 100k requests/day on free tier; unlimited on Paid
- **D1**: 100k reads + 1k writes/day on free tier
- **Database**: SQLite (single-file), scales to 100GB
- **Bandwidth**: Unlimited egress (Cloudflare CDN)

### To Handle 1M+ Users
1. **Add caching**: Cache vehicle pages for 1 hour
2. **Read replicas**: D1 supports replicas (paid)
3. **API layer**: Add GraphQL endpoint
4. **Search**: Algolia or Elasticsearch for full-text
5. **Images**: Cloudflare Image Optimization
6. **Monitoring**: Sentry or Datadog for error tracking

---

## Deployments & Versioning

### Current Version
- **Codebase**: v1.0.0 (see git tags)
- **Database Schema**: v1 (5 tables)
- **Worker**: Deployed at https://vehicle-lease.rewardspy.workers.dev
- **Data**: 122 vehicles, 8 lenders, 88+ deals

### Deployment Checklist
- [ ] All changes committed to git
- [ ] Tests pass (if applicable)
- [ ] `npm run build` completes without errors
- [ ] Database migration scripts prepared (if schema changes)
- [ ] Secrets (INGEST_KEY, GA_ID, GSC_TOKEN) configured
- [ ] `npm run deploy` succeeds
- [ ] Manual smoke test on staging URL
- [ ] Attach custom domain (if production)

### Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or revert and force
git reset --hard origin/main
npm run deploy
```
