# vehicle-lease.co.uk

A vehicle-centric lease comparison hub. Browse 500+ UK car models and find lease deals from 8+ major brokers.

## Architecture

- **CF Worker + D1** — same stack as recordplayer.co.uk and ethics.ai
- **SSR on demand** — pages generated server-side for fast TTFB and SEO
- **Research JSON sources** — `research/*.json` is source of truth
- **Build script** — `npm run build` generates `site/seed/data.sql`

## Files

- `src/index.js` — CF Worker SSR routes
- `site/schema.sql` — D1 database schema
- `site/scripts/build-seed.mjs` — converts research JSON → SQL seed
- `site/seed/data.sql` — database seed (generated)
- `research/*.json` — vehicle specs, lenders, lease deals

## Setup

```bash
npm install
npm run build            # Generate seed SQL from research/*.json
npm run dev             # Test locally
npm run deploy          # Build + deploy to Cloudflare
```

## Routes

- `/` — Homepage with featured deals + categories
- `/vehicles` — Browse & search all vehicles
- `/vehicles/:slug` — Single vehicle page with lease deals
- `/lenders` — Browse all lenders
- `/lenders/:slug` — Single lender page with available vehicles
- `/compare/:id1-vs-:id2` — Comparison page
- `/categories/:slug` — Hub pages (budget deals, family cars, EVs, etc.)
- `/sitemap.xml` — XML sitemap
- `/llms.txt` — LLM-friendly site summary

## Deployment

1. Create D1 database in Cloudflare dashboard
2. Update `wrangler.jsonc` with database ID
3. `npm run deploy` — builds seed + deploys worker + seeds database

## Next Steps

**Data expansion:** Current seed has 10 vehicles + 8 lenders + 12 deals. To scale:
- Add more vehicle specs (research/vehicles.json: target 500+ models)
- Add more lease brokers (research/lenders.json)
- Scrape/update deals monthly (research/lease_deals.json)
- Run `npm run build && wrangler d1 execute vehicle_lease --file site/seed/data.sql` to refresh

**Live deal scraping:** Consider periodic webhook → parse Lease Loco / other brokers → POST /admin/refresh-deals?token=...

**SEO:** per-vehicle titles/descs, JSON-LD (BreadcrumbList, Product, Offer), og:image, llms.txt all in place.
