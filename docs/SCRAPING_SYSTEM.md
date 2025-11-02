# ReelCaster Scraping System

**Last Updated:** November 2, 2025
**Status:** ✅ Production Ready

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Fishing Reports Scraper](#fishing-reports-scraper)
4. [Regulations Scraper](#regulations-scraper)
5. [Side-by-Side Comparison](#side-by-side-comparison)
6. [GitHub Actions Automation](#github-actions-automation)
7. [Adding New Locations/Areas](#adding-new-locationsareas)
8. [Troubleshooting](#troubleshooting)
9. [Cost Analysis](#cost-analysis)

---

## Overview

ReelCaster uses two automated scraping systems to keep fishing data up-to-date:

1. **Fishing Reports Scraper** - Weekly reports from FishingVictoria.com
2. **Regulations Scraper** - DFO Pacific Region fishing regulations

Both systems run automatically via GitHub Actions and store data in Supabase.

### Key Features

- ✅ **Automated Daily Scraping** via GitHub Actions
- ✅ **API-First Architecture** - Scrapers are API endpoints
- ✅ **Supabase Storage** - All data persists in database
- ✅ **No Git Commits** - Data never pollutes git history
- ✅ **Fully Dynamic** - Frontend automatically picks up new data
- ✅ **Cost-Effective** - ~$0.69/month for OpenAI (only fishing reports)

---

## System Architecture

### High-Level Flow

```
GitHub Actions (Daily 2 AM UTC)
  ↓
  Calls API Endpoints with CRON_SECRET
  ↓
  ┌─────────────────────────────┬─────────────────────────────┐
  ↓                             ↓                             ↓
Fishing Reports             Regulations Area 19         Regulations Area 20
/api/fishing-reports/scrape   /api/regulations/scrape   /api/regulations/scrape
  ↓                             ↓                             ↓
Parse with OpenAI            Parse with Cheerio          Parse with Cheerio
  ↓                             ↓                             ↓
  └─────────────────────────────┴─────────────────────────────┘
                                ↓
                          Supabase Database
                                ↓
                          Frontend Auto-Loads
```

### Common Patterns

Both scrapers follow similar patterns:

1. **Authentication**: `x-cron-secret` header
2. **Rate Limiting**: Delays between requests
3. **Error Handling**: Continue-on-error, log failures
4. **Caching**: Frontend caches for 1 hour
5. **Storage**: Supabase for persistence

---

## Fishing Reports Scraper

### Purpose

Scrapes weekly fishing reports from FishingVictoria.com to provide:
- Current fishing conditions
- Species activity and sizes
- Recommended tackle and techniques
- Hotspot-specific information

### Architecture

```typescript
API: POST /api/fishing-reports/scrape?days=14
Parser: OpenAI (GPT-4o-mini)
Storage: fishing_reports table
Schema: JSONB (flexible structure)
```

### Files

- **API Endpoint**: `src/app/api/fishing-reports/scrape/route.ts`
- **Scraper Utility**: `src/app/utils/scrape-fishing-report.ts`
- **Frontend Hook**: Uses direct API calls
- **Database Migration**: `supabase/migrations/20251028_create_fishing_reports_table.sql`

### How It Works

1. **Auto-detect Latest Report**
   ```typescript
   // Reference: Report 381 was August 3, 2025
   const weeksSince = Math.floor((today - referenceDate) / 7)
   const latestId = 381 + weeksSince
   ```

2. **Check Each Day Backwards**
   - Try last N days (default 14)
   - Construct URL: `https://www.fishingvictoria.com/fishing-reports/{id}-{date}`

3. **Validate URL Exists**
   - HEAD request with `redirect: 'manual'`
   - 200 = report exists
   - 302 = no report (redirects to index)

4. **Parse with OpenAI**
   - Extract structured data from unstructured HTML
   - Returns consistent JSON format

5. **Store in Supabase**
   - Check if already exists (skip duplicates)
   - Insert into `fishing_reports` table
   - JSONB column for flexible report data

### Database Schema

```sql
CREATE TABLE fishing_reports (
  id uuid PRIMARY KEY,
  location text NOT NULL,
  week_ending date NOT NULL,
  report_id text,
  source_url text,
  report_data jsonb NOT NULL,  -- Full report as JSON
  scraped_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Unique constraint: one active report per location per week
CREATE UNIQUE INDEX unique_active_report
  ON fishing_reports(location, week_ending)
  WHERE is_active = true;
```

### API Usage

```bash
# Scrape last 14 days for both locations
curl -X POST "https://your-app.com/api/fishing-reports/scrape?days=14" \
  -H "x-cron-secret: YOUR_SECRET"

# Force re-scrape existing reports
curl -X POST "https://your-app.com/api/fishing-reports/scrape?days=7&force=true" \
  -H "x-cron-secret: YOUR_SECRET"
```

### Response Format

```json
{
  "success": true,
  "summary": {
    "successCount": 2,
    "failCount": 0,
    "alreadyScrapedCount": 12,
    "notFoundCount": 0,
    "totalChecked": 14,
    "storage": "supabase"
  },
  "results": [...]
}
```

### Why OpenAI?

Fishing reports have **unstructured HTML** with:
- Varying formats between reports
- Natural language descriptions
- Inconsistent structure

OpenAI extracts structured data reliably where Cheerio would fail.

---

## Regulations Scraper

### Purpose

Scrapes DFO Pacific Region fishing regulations to provide:
- Species-specific limits and sizes
- General fishing rules
- Protected areas and closures
- Current regulation dates

### Architecture

```typescript
API: POST /api/regulations/scrape?area_id=19
Parser: Cheerio (HTML parsing)
Storage: fishing_regulations + species_regulations + rules tables
Schema: Normalized relational tables
```

### Files

- **API Endpoint**: `src/app/api/regulations/scrape/route.ts`
- **Scraper Utility**: `src/app/utils/dfoScraperV2.ts`
- **Frontend Service**: `src/app/services/regulations.ts`
- **Frontend Hook**: `src/hooks/use-regulations.ts`
- **Manual Script**: `scripts/scrape-and-update-regulations.ts`
- **Database Migrations**:
  - `supabase/migrations/20251003_create_fishing_regulations_tables.sql`
  - `supabase/migrations/20251003_seed_current_regulations.sql`
  - `supabase/migrations/20251031_add_more_fishing_areas.sql`
  - `supabase/migrations/20251102_drop_approval_tables.sql`

### How It Works

1. **Scrape DFO Page**
   ```typescript
   const url = `https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s${areaId}-eng.html`
   const html = await fetch(url).text()
   ```

2. **Parse with Cheerio**
   - Find species tables
   - Extract regulations data
   - Parse min/max sizes, limits, status
   - Extract general rules and protected areas

3. **Directly Update Database**
   - Check if area exists
   - Delete old species/rules/protected areas
   - Insert new data
   - No approval workflow needed

### Database Schema

```sql
-- Main regulations table
CREATE TABLE fishing_regulations (
  id uuid PRIMARY KEY,
  area_id text NOT NULL,
  area_name text NOT NULL,
  official_url text NOT NULL,
  last_updated timestamptz,
  last_verified timestamptz,
  next_review_date timestamptz,
  data_source text,
  is_active boolean DEFAULT true
);

-- Species regulations (many-to-one)
CREATE TABLE species_regulations (
  id uuid PRIMARY KEY,
  regulation_id uuid REFERENCES fishing_regulations(id),
  species_id text NOT NULL,
  species_name text NOT NULL,
  scientific_name text,
  daily_limit text NOT NULL,
  annual_limit text,
  min_size text,
  max_size text,
  status regulation_status NOT NULL,  -- Open/Closed/Non Retention/Restricted
  gear text NOT NULL,
  season text NOT NULL,
  notes jsonb DEFAULT '[]'
);

-- General rules
CREATE TABLE regulation_general_rules (
  id uuid PRIMARY KEY,
  regulation_id uuid REFERENCES fishing_regulations(id),
  rule_text text NOT NULL,
  sort_order integer
);

-- Protected areas
CREATE TABLE regulation_protected_areas (
  id uuid PRIMARY KEY,
  regulation_id uuid REFERENCES fishing_regulations(id),
  area_name text NOT NULL
);
```

### API Usage

```bash
# Scrape specific area
curl -X POST "https://your-app.com/api/regulations/scrape?area_id=19" \
  -H "x-cron-secret: YOUR_SECRET"

# Scrape all configured areas
curl -X POST "https://your-app.com/api/regulations/scrape" \
  -H "x-cron-secret: YOUR_SECRET"
```

### Response Format

```json
{
  "success": true,
  "summary": {
    "successCount": 1,
    "errorCount": 0,
    "totalAreas": 1
  },
  "results": [
    {
      "area": "Victoria, Sidney",
      "areaId": "19",
      "success": true,
      "speciesCount": 127,
      "rulesCount": 42,
      "protectedAreasCount": 4
    }
  ],
  "scrapedAt": "2025-11-02T00:00:00.000Z"
}
```

### Why Cheerio?

DFO pages have **structured HTML** with:
- Consistent table formats
- Predictable selectors
- Stable HTML structure

Cheerio is:
- ✅ **Fast** - Parses in milliseconds
- ✅ **Free** - No API costs
- ✅ **Reliable** - DFO structure is stable
- ✅ **Sufficient** - Extracts 127+ species perfectly

### Test Results

```
Area 19: 127 species extracted (✅ PASS)
Area 20: 138 species extracted (✅ PASS)
Threshold: >= 10 species required
Conclusion: OpenAI not needed for regulations
```

---

## Side-by-Side Comparison

| Feature | Fishing Reports | Regulations |
|---------|----------------|-------------|
| **Source** | FishingVictoria.com | DFO Pacific Region |
| **Frequency** | Weekly | Changes infrequently |
| **Parser** | OpenAI (GPT-4o-mini) | Cheerio |
| **Why This Parser?** | Unstructured text | Structured HTML tables |
| **API Endpoint** | `/api/fishing-reports/scrape` | `/api/regulations/scrape` |
| **Query Param** | `?days=14` | `?area_id=19` |
| **Storage** | Single JSONB column | Normalized tables |
| **Locations** | 2 (Victoria, Sooke) | 2 active (19, 20) |
| **GitHub Actions** | 1 call for all locations | 2 calls (1 per area) |
| **Cost** | ~$0.50/month (OpenAI) | $0 (Cheerio) |
| **Scraping Speed** | ~5s per report (OpenAI) | ~2s per area (Cheerio) |
| **Change Detection** | Skip if exists by date | Delete & replace |
| **Manual Script** | `scrape-historical-reports.ts` | `scrape-and-update-regulations.ts` |
| **Frontend Hook** | Direct API calls | `useLocationRegulations()` |

### Common Patterns

Both scrapers use:

1. **CRON_SECRET Authentication**
   ```typescript
   if (cronSecret !== process.env.CRON_SECRET) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   }
   ```

2. **Rate Limiting**
   ```typescript
   await new Promise(resolve => setTimeout(resolve, 2000)) // 2s delay
   ```

3. **Error Handling**
   ```typescript
   try {
     // scrape
   } catch (error) {
     console.error('❌ Error:', error)
     // Continue with next item
   }
   ```

4. **Consistent Logging**
   ```typescript
   console.log('🎣 Starting scrape...')
   console.log('✅ Success:', ...)
   console.log('❌ Failed:', ...)
   ```

5. **Supabase Storage**
   ```typescript
   const supabase = createClient(url, serviceKey)
   await supabase.from('table').insert(data)
   ```

---

## GitHub Actions Automation

### Workflow File

`.github/workflows/scrape-data.yml`

### Schedule

```yaml
schedule:
  - cron: '0 2 * * *'  # Daily at 2 AM UTC (6 PM PST previous day)
```

### Jobs

```yaml
jobs:
  scrape-data:
    runs-on: ubuntu-latest
    steps:
      # Scrape Regulations - Area 19
      - curl POST /api/regulations/scrape?area_id=19

      # Scrape Regulations - Area 20
      - curl POST /api/regulations/scrape?area_id=20

      # Scrape Fishing Reports
      - curl POST /api/fishing-reports/scrape?days=14
```

### Required Secrets

Set these in **GitHub Settings → Secrets and variables → Actions**:

| Secret | Description | Example |
|--------|-------------|---------|
| `APP_URL` | Production URL | `https://reelcaster.vercel.app` |
| `CRON_SECRET` | Auth secret | Generate with `openssl rand -base64 32` |

### Manual Trigger

1. Go to **Actions** tab
2. Select "Daily Data Scraping"
3. Click **Run workflow**
4. Optionally adjust parameters:
   - `scrape_reports`: true/false
   - `scrape_regulations`: true/false
   - `days_to_check`: number of days

### Monitoring

Each run creates a summary showing:

```
🎣 Daily Scraping Summary

Date: 2025-11-02 02:00:00 UTC
Method: Direct API calls to production

### ✅ DFO Regulations - Area 19 (Victoria, Sidney)
- Status: Success
- Endpoint: /api/regulations/scrape?area_id=19
- Storage: Supabase database

### ✅ DFO Regulations - Area 20 (Sooke, Port Renfrew)
- Status: Success
- Endpoint: /api/regulations/scrape?area_id=20
- Storage: Supabase database

### ✅ Fishing Reports
- Status: Success
- Endpoint: /api/fishing-reports/scrape
- Storage: Supabase database
```

---

## Adding New Locations/Areas

### Adding a New Fishing Report Location

1. **Update API endpoint** (`src/app/api/fishing-reports/scrape/route.ts`):
   ```typescript
   const locations = [
     { name: 'Victoria, Sidney', hotspots: ['Oak Bay', ...] },
     { name: 'Sooke, Port Renfrew', hotspots: ['East Sooke', ...] },
     { name: 'NEW LOCATION', hotspots: ['Hotspot 1', ...] },  // Add this
   ]
   ```

2. **Frontend automatically picks it up** when data exists in database

### Adding a New Regulation Area

1. **Update area mapping** (`src/app/utils/dfoScraperV2.ts`):
   ```typescript
   const AREA_NAMES: Record<string, string> = {
     '19': 'Victoria, Sidney',
     '20': 'Sooke, Port Renfrew',
     '23': 'Tofino, Ucluelet',  // Add new area
   }
   ```

2. **Run scraper manually** to populate database:
   ```bash
   pnpm tsx scripts/scrape-and-update-regulations.ts 23
   ```

3. **Update GitHub Actions** (optional, for automation):
   ```yaml
   - name: Scrape DFO Regulations - Area 23
     run: |
       curl POST "${{ secrets.APP_URL }}/api/regulations/scrape?area_id=23" \
         -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
   ```

4. **Frontend automatically displays** new area data

### System Flexibility

The system is designed to be **fully dynamic**:

- ✅ Database schema supports unlimited areas
- ✅ Frontend fetches from API dynamically
- ✅ API returns all active areas
- ✅ Just add data and it appears!

---

## Troubleshooting

### Common Issues

#### 1. "Unauthorized" 401 Error

**Cause:** Missing or incorrect `CRON_SECRET`

**Fix:**
1. Check GitHub Secret matches `.env.local`
2. Verify header: `x-cron-secret: YOUR_SECRET`
3. Regenerate secret if needed: `openssl rand -base64 32`

#### 2. "Supabase configuration missing"

**Cause:** Missing environment variables

**Fix:** Add to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

#### 3. "relation does not exist"

**Cause:** Database migrations not run

**Fix:** Run migrations in Supabase SQL Editor:
1. Go to https://app.supabase.com/project/YOUR_PROJECT/sql
2. Copy migration SQL from `supabase/migrations/`
3. Paste and click **Run**

#### 4. No data appearing in frontend

**Possible causes:**
1. No data scraped yet (check Supabase)
2. RLS policies blocking read access
3. Cache needs clearing

**Debug:**
```sql
-- Check fishing reports
SELECT location, week_ending, scraped_at
FROM fishing_reports
WHERE is_active = true
ORDER BY week_ending DESC;

-- Check regulations
SELECT area_id, area_name, last_updated
FROM fishing_regulations
WHERE is_active = true;
```

#### 5. OpenAI API errors (fishing reports only)

**Cause:** Missing or invalid API key

**Fix:**
1. Add to `.env.local`: `OPENAI_API_KEY=sk-xxx`
2. Verify key is valid at https://platform.openai.com/api-keys
3. Check rate limits and billing

#### 6. Parse errors (regulations)

**Cause:** DFO website HTML structure changed

**Debug:**
1. Run manual script with logging:
   ```bash
   pnpm tsx scripts/scrape-and-update-regulations.ts 19
   ```
2. Check parse errors in output
3. Update selectors in `dfoScraperV2.ts` if needed

---

## Cost Analysis

### Monthly Costs

| Service | Usage | Cost |
|---------|-------|------|
| **Supabase** | ~1MB data/year | Free (500MB included) |
| **GitHub Actions** | ~150 min/month | Free (2,000 min included) |
| **OpenAI API** | ~70 calls/month | ~$0.69/month |
| **Total** | - | **~$0.69/month** |

### OpenAI Usage Breakdown

- **Fishing Reports**: ~2 reports/week = ~8 reports/month
- **Cost per call**: GPT-4o-mini @ ~$0.08/call
- **Monthly**: 8 × $0.08 = ~$0.64/month

**Regulations scraper uses Cheerio (FREE) - no OpenAI costs!**

### Scaling Costs

If you add more locations/areas:

- **Fishing Reports**: +$0.32/month per location (4 reports × $0.08)
- **Regulations**: $0/month (Cheerio is free)
- **Database**: Still free (would need 500MB+ to exceed free tier)

---

## Environment Variables

### Required for Production

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# API Protection
CRON_SECRET=your-random-secret-here

# OpenAI (fishing reports only)
OPENAI_API_KEY=sk-xxx

# App URL (for GitHub Actions)
NEXT_PUBLIC_APP_URL=https://your-app.com
```

### Generate Secrets

```bash
# Generate CRON_SECRET
openssl rand -base64 32

# Get Supabase keys from:
# https://app.supabase.com/project/YOUR_PROJECT/settings/api

# Get OpenAI key from:
# https://platform.openai.com/api-keys
```

---

## Testing Locally

### Test Fishing Reports Scraper

```bash
# Start dev server
pnpm dev

# Test scrape endpoint
curl -X POST "http://localhost:3004/api/fishing-reports/scrape?days=7" \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Test Regulations Scraper

```bash
# Test API endpoint
curl -X POST "http://localhost:3004/api/regulations/scrape?area_id=19" \
  -H "x-cron-secret: YOUR_CRON_SECRET"

# Or use manual script
pnpm tsx scripts/scrape-and-update-regulations.ts 19
```

### Verify Data in Supabase

```sql
-- Fishing reports
SELECT * FROM fishing_reports ORDER BY scraped_at DESC LIMIT 5;

-- Regulations
SELECT
  fr.area_id,
  fr.area_name,
  COUNT(sr.id) as species_count
FROM fishing_regulations fr
LEFT JOIN species_regulations sr ON fr.id = sr.regulation_id
WHERE fr.is_active = true
GROUP BY fr.id;
```

---

## Architecture Decisions

### Why API Endpoints Instead of Scripts?

**Previous approach:**
- Run scripts in GitHub Actions
- Commit JSON files to git
- Deploy to serve static files

**Problems:**
- Git bloat with data files
- Lost data on rollback
- Slow deployments
- Can't query historical data

**Current approach:**
- API endpoints called by GitHub Actions
- Data in Supabase
- Frontend fetches dynamically

**Benefits:**
- ✅ Clean git history
- ✅ Data persists forever
- ✅ Fast deployments
- ✅ Queryable with SQL
- ✅ Scales better

### Why Different Parsers?

| Content Type | Best Parser | Reason |
|--------------|-------------|--------|
| **Structured HTML** (tables, consistent selectors) | Cheerio | Fast, free, reliable |
| **Unstructured Text** (natural language, varying formats) | OpenAI | Handles variability, extracts meaning |

### Why Normalized Tables for Regulations?

- Easy to query specific species
- Enforces data integrity
- Supports relational queries
- Better for filtering/sorting

### Why JSONB for Fishing Reports?

- Report structure varies
- Flexible schema
- Fast with GIN indexes
- Easy to evolve format

---

## Future Enhancements

### Potential Improvements

1. **Notifications**
   - Email/Slack when regulations change
   - Alert when new fishing report available
   - Notify on scraper failures

2. **Admin Dashboard**
   - View scraping history
   - Manual trigger scrapes
   - View error logs
   - Data quality checks

3. **Error Recovery**
   - Retry failed scrapes automatically
   - Store error logs in database
   - Alert on repeated failures

4. **Performance**
   - CDN caching for API responses
   - Optimize JSONB queries
   - Add database indexes

5. **Multi-Region Support**
   - Add more BC fishing areas
   - Support other provinces
   - Multiple fishing report sources

---

## Support

For issues or questions:

1. Check this documentation
2. Review GitHub Actions logs
3. Check Supabase dashboard
4. Review code comments

---

**Last Updated:** November 2, 2025
**Maintained By:** Development Team
