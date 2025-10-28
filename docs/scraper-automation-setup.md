# Automated Scraper Setup - Complete Implementation Guide

**Date:** October 28, 2025
**Status:** ✅ Production Ready

## Overview

This document describes the complete implementation of our automated data scraping system that runs daily via GitHub Actions. The system scrapes fishing regulations from DFO (Department of Fisheries and Oceans) and fishing reports from FishingVictoria.com, storing all data in Supabase for persistence and easy querying.

## What Was Built

### 1. **Database Schema**

Created `fishing_reports` table in Supabase to store scraped fishing reports:

```sql
CREATE TABLE fishing_reports (
  id uuid PRIMARY KEY,
  location text NOT NULL,
  week_ending date NOT NULL,
  report_id text,
  source_url text,
  report_data jsonb NOT NULL,
  scraped_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Key Features:**
- JSONB storage for flexible report data
- Partial unique index ensures one active report per location per week
- Row Level Security (RLS) enabled with public read access
- GIN index on report_data for fast JSONB queries

**Migration File:** `supabase/migrations/20251028_create_fishing_reports_table.sql`

### 2. **API Endpoints**

#### `/api/regulations/scrape` (DFO Regulations)
- **Method:** POST
- **Authentication:** CRON_SECRET header
- **Function:** Scrapes DFO fishing regulations for Areas 19 & 20
- **Storage:** Supabase `scraped_regulations` table
- **Features:**
  - Hybrid parsing (Cheerio + OpenAI fallback)
  - Change detection (compares with current regulations)
  - Auto-approval if no changes detected

#### `/api/fishing-reports/scrape` (Fishing Reports)
- **Method:** POST
- **Authentication:** CRON_SECRET header
- **Query Params:** `?days=14` (how many days to check)
- **Function:** Scrapes fishing reports from FishingVictoria.com
- **Storage:** Supabase `fishing_reports` table
- **Features:**
  - Auto-detects latest report based on current date
  - Checks each day for reports (weekly reports)
  - Skips already-scraped reports
  - URL validation (handles 302 redirects)

### 3. **Shared Utilities**

#### `src/app/utils/dfoParser.ts`
Extracted parsing logic for DFO regulations:
- `parseArea()` - Main parsing function
- `parseWithCheerio()` - Fast HTML parsing
- `parseWithOpenAI()` - AI-based fallback parsing
- `validateWithAI()` - AI validation of parsed data
- `detectChanges()` - Compare current vs new regulations

**Why This Matters:**
- Code reuse between script and API endpoint
- Consistent parsing logic
- Easy to test and maintain

### 4. **Data Loading**

#### `src/app/utils/load-historical-reports.ts`
Updated to load fishing reports from Supabase instead of local files:

```typescript
// Before: Import local JSON files
const reportModule = await import(`@/app/data/fishing-reports/...`)

// After: Fetch from Supabase
const { data } = await supabase
  .from('fishing_reports')
  .select('location, week_ending, report_data')
  .eq('is_active', true)
```

**Benefits:**
- No need to commit data files to git
- Data persists across deployments
- Easy to query historical data
- Faster page loads (database query vs file imports)

### 5. **GitHub Actions Workflow**

#### `.github/workflows/scrape-data.yml`

**Ultra-simplified workflow:**

```yaml
steps:
  - name: Scrape DFO Regulations
    run: |
      curl -X POST "${{ secrets.APP_URL }}/api/regulations/scrape" \
        -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"

  - name: Scrape Fishing Reports
    run: |
      curl -X POST "${{ secrets.APP_URL }}/api/fishing-reports/scrape?days=14" \
        -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
```

**What We Removed:**
- ❌ No checkout code
- ❌ No install dependencies
- ❌ No build step
- ❌ No start server
- ❌ No git commits

**Benefits:**
- Runs in ~5 minutes (was 30 minutes)
- No Node.js/pnpm required
- Just 2 curl commands
- Calls production API directly
- No complexity

**Schedule:** Runs daily at 2 AM UTC (6 PM PST previous day)

## Architecture

### Before (File-Based)

```
GitHub Actions
  ↓
  Run TypeScript scripts locally
  ↓
  Scrape websites
  ↓
  Save to local JSON files
  ↓
  Commit files to git
  ↓
  Push to GitHub
  ↓
  Deploy (Next.js imports JSON files)
```

**Problems:**
- Git bloat (data files committed)
- Complex GitHub Actions setup
- Data lost on rollback
- Hard to query historical data
- Slow workflow (30+ minutes)

### After (Supabase-Based)

```
GitHub Actions (Daily at 2 AM UTC)
  ↓
  curl POST /api/regulations/scrape
  curl POST /api/fishing-reports/scrape
  ↓
  Both endpoints:
    1. Scrape websites
    2. Parse HTML (Cheerio/OpenAI)
    3. Store in Supabase
  ↓
  UI reads from Supabase on demand
```

**Benefits:**
- ✅ No git commits (cleaner repo)
- ✅ Data persists forever
- ✅ Fast workflow (~5 minutes)
- ✅ Queryable data (SQL)
- ✅ Minimal setup (2 curl commands)
- ✅ Survives deployments

## Setup Instructions

### Prerequisites

1. **Supabase Project**
   - URL: `https://pehcvwiwtubzfgahuzuz.supabase.co`
   - Service role key available

2. **Production Deployment**
   - App deployed (Vercel/etc)
   - Has public URL

3. **Environment Variables**
   - `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
   - `CRON_SECRET` in `.env.local`
   - `OPENAI_API_KEY` in `.env.local`

### Step 1: Run Database Migration

1. Go to Supabase SQL Editor:
   ```
   https://app.supabase.com/project/pehcvwiwtubzfgahuzuz/sql/new
   ```

2. Copy contents of `supabase/migrations/20251028_create_fishing_reports_table.sql`

3. Paste and click **Run**

4. Verify table created in Table Editor

### Step 2: Add GitHub Secrets

Go to: **Settings → Secrets and variables → Actions → New repository secret**

Add these 3 secrets:

#### 1. `APP_URL`
Your production URL (e.g., `https://reelcaster.vercel.app`)

#### 2. `CRON_SECRET`
Generated secret for API protection:
```bash
openssl rand -base64 32
```
Use the same value in `.env.local` and GitHub Secrets.

#### 3. `SUPABASE_SERVICE_ROLE_KEY`
From Supabase Dashboard:
1. Go to Settings → API
2. Copy the `service_role` key (NOT anon key)

### Step 3: Enable GitHub Actions

1. Go to **Actions** tab in GitHub
2. Find "Daily Data Scraping" workflow
3. Click **Enable workflow** (if needed)

### Step 4: Test Manually

Before waiting for scheduled run, test manually:

1. Go to **Actions → Daily Data Scraping**
2. Click **Run workflow**
3. Select branch (e.g., `main` or `new-ui`)
4. Click **Run workflow**
5. Watch it complete (~5 minutes)

## Testing Locally

### Test API Endpoints

```bash
# Start dev server
pnpm dev

# Test DFO regulations scraper
curl -X POST "http://localhost:3004/api/regulations/scrape" \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"

# Test fishing reports scraper (check last 7 days)
curl -X POST "http://localhost:3004/api/fishing-reports/scrape?days=7" \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Verify Data in Supabase

**Check fishing reports:**
```sql
SELECT
  location,
  week_ending,
  scraped_at,
  is_active
FROM fishing_reports
ORDER BY week_ending DESC
LIMIT 10;
```

**Check regulations:**
```sql
SELECT
  area_id,
  scraped_at,
  approval_status,
  array_length(changes_detected, 1) as change_count
FROM scraped_regulations
ORDER BY scraped_at DESC
LIMIT 5;
```

## How It Works

### DFO Regulations Scraping

1. **Fetch HTML** from DFO website
   ```
   https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s19-eng.html
   https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s20-eng.html
   ```

2. **Parse with Cheerio** (fast)
   - Extract species data from tables
   - Parse size limits, bag limits, closures
   - If <10 species found → fallback to OpenAI

3. **Parse with OpenAI** (fallback)
   - Send HTML to GPT-4
   - Extract structured data
   - More resilient to HTML changes

4. **Detect Changes**
   - Compare with current active regulations
   - List all differences

5. **Store in Supabase**
   - Insert into `scraped_regulations` table
   - Status: `pending` if changes, `approved` if no changes

### Fishing Reports Scraping

1. **Auto-detect Latest Report**
   ```typescript
   // Reference: Report 381 = August 3, 2025
   const weeksSince = Math.floor((today - referenceDate) / 7)
   const latestId = 381 + weeksSince
   ```

2. **Check Each Day Backwards**
   - Try `days` parameter (default 14)
   - For each day, construct URL:
     ```
     https://www.fishingvictoria.com/fishing-reports/{id}-{month}-{day}-{year}
     ```

3. **Validate URL**
   - HEAD request with `redirect: 'manual'`
   - 200 = report exists
   - 302 = no report (redirects to index)

4. **Scrape Valid Reports**
   - Call existing `/api/scrape-fishing-report` endpoint
   - Uses OpenAI to parse HTML → structured JSON

5. **Store in Supabase**
   - Check if already exists (skip)
   - Insert into `fishing_reports` table
   - JSONB storage for full report data

## Monitoring

### GitHub Actions Summary

Each run shows:
```markdown
# 🎣 Daily Scraping Summary

**Date:** 2025-10-28 02:00:00 UTC
**Method:** Direct API calls to production

### ✅ DFO Regulations
- Status: Success
- Endpoint: /api/regulations/scrape
- Storage: Supabase database

### ✅ Fishing Reports
- Status: Success
- Endpoint: /api/fishing-reports/scrape
- Storage: Supabase database
```

### Check Supabase Dashboard

**Fishing Reports:**
```
Table Editor → fishing_reports
- Check row count (should grow weekly)
- Verify recent scraped_at timestamps
```

**DFO Regulations:**
```
Table Editor → scraped_regulations
- Check approval_status
- Review changes_detected array
```

### API Response Examples

**Successful scrape:**
```json
{
  "success": true,
  "summary": {
    "successCount": 2,
    "failCount": 0,
    "alreadyScrapedCount": 0,
    "notFoundCount": 12,
    "totalChecked": 14,
    "storage": "supabase"
  }
}
```

**No new reports:**
```json
{
  "success": true,
  "summary": {
    "successCount": 0,
    "failCount": 0,
    "alreadyScrapedCount": 2,
    "notFoundCount": 12,
    "totalChecked": 14
  }
}
```

## Troubleshooting

### Issue: "Unauthorized" 401 Error

**Cause:** Missing or incorrect CRON_SECRET

**Fix:**
1. Check GitHub Secret matches `.env.local`
2. Verify header: `x-cron-secret: YOUR_SECRET`

### Issue: "Supabase configuration missing"

**Cause:** Missing SUPABASE_SERVICE_ROLE_KEY

**Fix:**
1. Add to `.env.local`
2. Add to GitHub Secrets
3. Restart dev server / redeploy

### Issue: "relation does not exist"

**Cause:** Database migration not run

**Fix:**
Run migration in Supabase SQL Editor:
```sql
-- Copy from: supabase/migrations/20251028_create_fishing_reports_table.sql
```

### Issue: No data appearing in UI

**Possible causes:**
1. No reports scraped yet (check Supabase)
2. RLS policies blocking read access
3. UI reading from wrong table

**Debug:**
```typescript
// Check what loadHistoricalReports() returns
const reports = await loadHistoricalReports()
console.log(reports)
```

### Issue: GitHub Actions failing

**Check:**
1. All 3 secrets added (`APP_URL`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`)
2. Production app is deployed and accessible
3. API endpoints respond to POST requests
4. View workflow logs in Actions tab

## Cost Analysis

### Supabase Storage

- **Fishing Reports:** ~2 reports/week × 2 locations = 4 reports/week
- **Report Size:** ~5 KB each
- **Monthly Storage:** 4 reports/week × 4 weeks × 5 KB = 80 KB/month
- **Yearly Storage:** 80 KB × 12 = 960 KB (~1 MB/year)

**Cost:** Free tier covers this easily (500 MB included)

### OpenAI API Calls

- **DFO Regulations:** 2 areas × 1 call/day = 2 calls/day
- **Fishing Reports:** ~2 reports/week = ~0.3 calls/day
- **Total:** ~2.3 calls/day × 30 days = 69 calls/month
- **Cost per call:** ~$0.01 (GPT-4 vision)

**Estimated Cost:** ~$0.69/month for OpenAI

### GitHub Actions

- **Runtime:** ~5 minutes/day
- **Monthly Minutes:** 5 × 30 = 150 minutes/month

**Cost:** Free tier includes 2,000 minutes/month

### Total Monthly Cost

**~$0.69/month** (OpenAI only, others are free)

## Files Modified/Created

### New Files

- `src/app/api/fishing-reports/scrape/route.ts` - Fishing reports API endpoint
- `src/app/utils/dfoParser.ts` - Shared DFO parsing utilities
- `supabase/migrations/20251028_create_fishing_reports_table.sql` - Database schema
- `docs/SUPABASE_AUTOMATION_PLAN.md` - Technical architecture plan
- `SETUP_SUPABASE_SCRAPING.md` - Quick setup guide

### Modified Files

- `.github/workflows/scrape-data.yml` - Simplified to just curl calls
- `src/app/utils/load-historical-reports.ts` - Loads from Supabase
- `src/app/api/regulations/scrape/route.ts` - Uses shared parser
- `scripts/scrape-dfo-regulations.ts` - Stores in Supabase
- `.gitignore` - Added `.claude/mcp.json`

## Key Decisions Made

### 1. Supabase vs Local Files

**Decision:** Use Supabase for all scraped data

**Rationale:**
- Data persists across deployments
- No git bloat
- Queryable with SQL
- Supports admin approval workflow
- Scales better

### 2. API Endpoints vs Scripts

**Decision:** GitHub Actions calls production API endpoints

**Rationale:**
- Simpler workflow (no build, no dependencies)
- Same code path as production
- Faster execution (~5 min vs 30 min)
- Easier to test (just curl)
- More maintainable

### 3. Hybrid Parsing (Cheerio + OpenAI)

**Decision:** Try Cheerio first, fallback to OpenAI

**Rationale:**
- Cheerio is fast and free
- OpenAI is resilient to HTML changes
- Best of both worlds
- Cost-effective (~$0.69/month)

### 4. JSONB Storage for Reports

**Decision:** Store full report data as JSONB

**Rationale:**
- Flexible schema
- Easy to query with JSON operators
- Fast with GIN indexes
- Can evolve report structure without migrations

## Future Improvements

### Potential Enhancements

1. **Notifications**
   - Email/Slack when regulations change
   - Alert when scraper fails

2. **Admin Dashboard**
   - View pending regulations
   - Approve/reject changes
   - View scraping history

3. **Error Recovery**
   - Retry failed scrapes automatically
   - Store error logs in Supabase

4. **Data Validation**
   - Schema validation for JSONB
   - Detect anomalies in scraped data

5. **Performance**
   - Cache frequently accessed reports
   - Optimize JSONB queries

6. **Multi-Region Support**
   - Add more fishing areas
   - Support different provinces

## References

- [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)

## Support

For issues or questions:
1. Check this documentation
2. Review GitHub Actions logs
3. Check Supabase dashboard
4. Review code comments

---

**Last Updated:** October 28, 2025
**Status:** Production Ready ✅
**Maintained By:** Development Team
