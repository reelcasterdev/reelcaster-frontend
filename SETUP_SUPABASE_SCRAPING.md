# Quick Setup Guide: Enable Supabase Scraping

## 🚀 You're Almost Ready!

All code is implemented. You just need to add **2 secrets** to your `.env.local`:

---

## Step 1: Get Supabase Service Role Key (2 mins)

1. Go to: https://app.supabase.com
2. Select your project: `pehcvwiwtubzfgahuzuz`
3. Click **Settings** (gear icon) → **API**
4. Scroll to **"Project API keys"**
5. Copy the `service_role` key (the secret one, NOT the anon key)

---

## Step 2: Generate CRON_SECRET (30 seconds)

Run this command:

```bash
openssl rand -base64 32
```

Copy the output.

---

## Step 3: Update .env.local

Add these two lines to your `.env.local`:

```bash
# Add these lines:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your_service_role_key_here
CRON_SECRET=your_generated_secret_from_step2
NEXT_PUBLIC_USE_REGULATIONS_API=true
```

**Your complete `.env.local` should have:**
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3004
GEMINI_API_KEY="..."
NEXT_PUBLIC_SUPABASE_URL=https://pehcvwiwtubzfgahuzuz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
OPENAI_API_KEY=sk-proj-...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # NEW
CRON_SECRET=...                    # NEW
NEXT_PUBLIC_USE_REGULATIONS_API=true  # NEW (or update if exists)
```

---

## Step 4: Verify Database Tables Exist

### Check if migrations are run:

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Table Editor**
4. Look for these tables:
   - `fishing_regulations`
   - `species_regulations`
   - `scraped_regulations`
   - `fishing_reports` ← **NEW**

### If tables don't exist:

1. Go to **SQL Editor**
2. Run migration files:

   **For regulations:**
   ```
   Copy contents of: supabase/migrations/20251003_create_fishing_regulations_tables.sql
   Paste and execute
   ```

   **For fishing reports:** ← **NEW**
   ```
   Copy contents of: supabase/migrations/20251028_create_fishing_reports_table.sql
   Paste and execute
   ```

---

## Step 5: Test the API Endpoints

### Option A: Test via API endpoint (recommended)

1. Start your dev server:
   ```bash
   pnpm dev
   ```

2. Call the DFO regulations endpoint:
   ```bash
   curl -X POST "http://localhost:3004/api/regulations/scrape" \
     -H "x-cron-secret: YOUR_CRON_SECRET_HERE" \
     -H "Content-Type: application/json"
   ```

### Option B: Test via script (local testing)

```bash
pnpm tsx scripts/scrape-dfo-regulations.ts
```

**Expected output:**
```
🎣 DFO Regulations Scraper - Production (Supabase Storage)
======================================================================

📡 Scraping Area 19 - Victoria, Sidney
🌐 URL: https://www.pac.dfo-mpo.gc.ca/...
✅ Fetched 98.0KB
🔧 Parsing regulations...
✅ Extracted 47 species
📊 Changes detected: X
💾 Stored in Supabase

✅ Successful: 2/2
```

---

## Step 6: Verify Data in Supabase

1. Go to Supabase → **Table Editor**
2. Click on `scraped_regulations` table
3. You should see 2 new rows (Areas 19 & 20)
4. Check the `scraped_data` column (JSON with species)

---

## Step 7: Test the UI

1. Make sure `NEXT_PUBLIC_USE_REGULATIONS_API=true` in `.env.local`
2. Restart dev server:
   ```bash
   pnpm dev
   ```
3. Visit http://localhost:3004
4. Check if regulations display (should load from Supabase now)

---

## Step 8: Review in Admin Panel

1. Visit: http://localhost:3004/admin/regulations
2. Login if needed
3. You should see pending scraped regulations
4. Click "Approve" to activate them

---

## Troubleshooting

### "Supabase configuration missing"
- Make sure you added `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
- Restart the script

### "Failed to insert into database"
- Check if database migrations are run
- Verify Supabase URL is correct
- Check service role key is valid

### "No data showing in UI"
- Make sure `NEXT_PUBLIC_USE_REGULATIONS_API=true`
- Restart dev server after changing .env.local
- Check browser console for errors
- Fallback should show static JSON if API fails

---

## What You Have Now

✅ **API-First Architecture**: All scraping via API endpoints
✅ **DFO Regulations API**: `/api/regulations/scrape` (stores in Supabase)
✅ **Fishing Reports API**: `/api/fishing-reports/scrape` (stores in Supabase) ← **UPDATED**
✅ **Admin Review Panel**: `/admin/regulations`
✅ **UI Data Fetching**: Loads from Supabase
✅ **GitHub Actions Automation**: Calls API endpoints daily (minimal setup)
✅ **Local Scripts**: Available for manual testing
✅ **All Data in Supabase**: No git commits, no file storage ← **NEW**

**Just add the secrets, run the migration, and you're ready to go!**

---

## Commands Reference

### API Endpoints (Recommended)

```bash
# Start dev server
pnpm dev

# Test DFO regulations scraper
curl -X POST "http://localhost:3004/api/regulations/scrape" \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"

# Test fishing reports scraper (check last 14 days)
curl -X POST "http://localhost:3004/api/fishing-reports/scrape?days=14" \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"

# View admin panel
open http://localhost:3004/admin/regulations
```

### Local Scripts (For Testing)

```bash
# Run DFO scraper directly (stores in Supabase)
pnpm tsx scripts/scrape-dfo-regulations.ts

# Run fishing reports scraper directly (saves to files)
pnpm tsx scripts/scrape-historical-reports.ts --id=392 --date=2025-10-19 --days=14
```

---

## GitHub Actions Automation

The workflow uses **direct API calls** - super simple!

### How It Works:
1. Calls your production API endpoints via curl:
   - `/api/regulations/scrape` → Stores in Supabase
   - `/api/fishing-reports/scrape` → Saves files on server
2. That's it! Just 2 curl commands.

### Benefits:
- ✅ No build step
- ✅ No dependencies to install
- ✅ No server to start
- ✅ Just calls your deployed app
- ✅ Completes in ~15 minutes

### Required GitHub Secrets:
1. **`APP_URL`** - Your production URL (e.g., `https://your-app.vercel.app`)
2. **`CRON_SECRET`** - Same secret you added to `.env.local`
3. **`SUPABASE_SERVICE_ROLE_KEY`** - From Supabase dashboard (only if scraping DFO regulations)

### Manual Trigger:
```bash
# Via GitHub UI: Actions → Daily Data Scraping → Run workflow
# Or via GitHub CLI:
gh workflow run scrape-data.yml
```
