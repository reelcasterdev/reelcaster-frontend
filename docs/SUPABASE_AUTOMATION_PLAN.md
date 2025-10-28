# DFO Regulations Automation Plan
## Store in Supabase + Public Endpoint + UI Integration

---

## 📋 Executive Summary

**Goal:** Automate DFO regulations scraping with Supabase storage and enable UI to consume live data.

**Current State:**
- ✅ Database schema exists (already migrated)
- ✅ API endpoints partially built
- ✅ UI has API mode support (disabled by default)
- ✅ Admin approval workflow exists
- ❌ Scraper saves to local JSON files
- ❌ UI uses static JSON files
- ❌ Public scraping endpoint not secured

**Target State:**
- ✅ Scraper stores directly in Supabase
- ✅ Public endpoint triggers scraping (secured with CRON_SECRET)
- ✅ UI fetches live data from Supabase
- ✅ Automated daily scraping via GitHub Actions/Vercel Cron
- ✅ Admin can review and approve changes
- ✅ Fallback to static JSON if API fails

---

## 🏗️ Architecture Diagram

```
Current Flow (Static):
┌──────────┐
│ UI       │ ──reads──> Local JSON files
└──────────┘

Target Flow (Automated):
┌────────────────┐
│ GitHub Actions │ ──triggers──> /api/regulations/scrape (with secret)
└────────────────┘                            │
                                              ▼
                                     ┌─────────────────┐
                                     │ Scraper Service │
                                     │ (Cheerio + AI)  │
                                     └────────┬────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │ Supabase        │
                                     │ - scraped_regs  │ (pending review)
                                     │ - fishing_regs  │ (approved/active)
                                     └────────┬────────┘
                                              │
                          ┌───────────────────┼───────────────────┐
                          ▼                   ▼                   ▼
                   ┌──────────┐       ┌──────────┐       ┌──────────┐
                   │ Admin UI │       │ Main UI  │       │ API      │
                   │ (review) │       │ (public) │       │ (public) │
                   └──────────┘       └──────────┘       └──────────┘
```

---

## 📝 Implementation Plan

### Phase 1: Environment & Security (5 mins)

**Task:** Add missing environment variables

**Action Required:**

1. Get Supabase Service Role Key:
   - Go to https://app.supabase.com
   - Select your project
   - Settings → API → Copy `service_role` key (secret)

2. Generate CRON_SECRET:
   ```bash
   openssl rand -base64 32
   ```

3. Update `.env.local`:
   ```bash
   # Add these lines:
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   CRON_SECRET=your_generated_secret_here
   NEXT_PUBLIC_USE_REGULATIONS_API=true  # Enable API mode
   ```

**Why:**
- `SUPABASE_SERVICE_ROLE_KEY` - Required for server-side database writes
- `CRON_SECRET` - Protects public scraping endpoint from abuse
- `NEXT_PUBLIC_USE_REGULATIONS_API=true` - Switches UI from static to API mode

---

### Phase 2: Update Scraper to Use Supabase (30 mins)

**Task:** Modify `scripts/scrape-dfo-regulations.ts` to store in Supabase instead of local files

**Changes Needed:**

1. **Import Supabase client:**
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   ```

2. **Replace file saving with database insert:**
   ```typescript
   // Instead of: fs.writeFile(...)

   // Do this: Insert into scraped_regulations table
   await supabase.from('scraped_regulations').insert({
     area_id: result.data.areaId,
     scraped_data: result.data,
     changes_detected: [], // Compare with current data
     approval_status: 'pending'
   })
   ```

3. **Add change detection:**
   - Fetch current active regulations from database
   - Compare with newly scraped data
   - Store list of detected changes

4. **Auto-approve if no changes:**
   ```typescript
   if (changes.length === 0 && process.env.AUTO_APPROVE_NO_CHANGES === 'true') {
     // Automatically approve and activate
     approval_status: 'approved'
   }
   ```

**Files to Modify:**
- `scripts/scrape-dfo-regulations.ts`

---

### Phase 3: Update API Endpoint (15 mins)

**Task:** Enhance `/api/regulations/scrape` to use the new scraper

**Current State:**
- Endpoint exists but uses placeholder regex parsing
- Already has CRON_SECRET authentication

**Changes Needed:**

1. **Import the Cheerio parser functions:**
   - Extract parsing logic to shared utility
   - Import in API route

2. **Update to call new parser:**
   ```typescript
   import { parseWithCheerio, parseWithOpenAI } from '@/app/utils/dfoParser'

   const scrapedData = await parseWithCheerio(html, areaId, areaName, url)
   ```

3. **Keep existing logic:**
   - ✅ CRON_SECRET authentication
   - ✅ Change detection
   - ✅ Database insertion
   - ✅ Error handling

**Files to Create/Modify:**
- `src/app/utils/dfoParser.ts` (NEW - extract parsing logic)
- `src/app/api/regulations/scrape/route.ts` (UPDATE - use new parser)

---

### Phase 4: Run Database Migrations (5 mins)

**Task:** Ensure database tables exist

**Action Required:**

1. Go to Supabase Dashboard → SQL Editor
2. Check if tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name LIKE '%regulation%';
   ```

3. If tables don't exist, run migrations:
   - `supabase/migrations/20251003_create_fishing_regulations_tables.sql`
   - `supabase/migrations/20251003_seed_current_regulations.sql`

**Why:**
- Need tables to store scraped data
- RLS policies already configured for public read access

---

### Phase 5: Enable API Mode in UI (2 mins)

**Task:** Switch UI from static JSON to Supabase API

**Changes Needed:**

1. **Update `.env.local`:**
   ```bash
   NEXT_PUBLIC_USE_REGULATIONS_API=true
   ```

2. **Verify hook usage:**
   - Check components using `useRegulations` hook
   - Ensure they handle loading/error states

**Files Already Ready:**
- ✅ `src/hooks/use-regulations.ts` - Already has API mode
- ✅ `src/app/data/regulations/index.ts` - Already has `fetchRegulations()` with API support
- ✅ UI components - Already handle async data

**No code changes needed!** Just flip the environment variable.

---

### Phase 6: Setup Automation (10 mins)

**Task:** Configure automated daily scraping

**Option A: GitHub Actions (FREE)**

Already created: `.github/workflows/scrape-data.yml`

**Setup:**
1. Add GitHub Secrets (Settings → Secrets → Actions):
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`

2. Enable workflow permissions:
   - Settings → Actions → General
   - ✅ Read and write permissions

3. Push workflow file:
   ```bash
   git add .github/workflows/scrape-data.yml
   git commit -m "Add daily scraping automation"
   git push
   ```

**Cost:** FREE (within GitHub limits)

**Option B: Vercel Cron (Requires Pro)**

Use existing `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/regulations/scrape",
    "schedule": "0 2 * * 0"
  }]
}
```

**Cost:** $20/month (Vercel Pro)

**Recommendation:** Use GitHub Actions (free and more flexible)

---

### Phase 7: Update GitHub Actions Workflow (10 mins)

**Task:** Modify workflow to call API endpoint instead of running script directly

**Current:** Workflow runs scraper script locally and commits files

**Better:** Workflow calls public API endpoint which stores in Supabase

**Changes:**

```yaml
- name: Trigger DFO Regulations Scrape
  run: |
    curl -X POST "${{ secrets.NEXT_PUBLIC_APP_URL }}/api/regulations/scrape" \
      -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"

- name: Trigger Fishing Reports Scrape
  run: |
    curl -X POST "${{ secrets.NEXT_PUBLIC_APP_URL }}/api/fishing-reports/scrape" \
      -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
```

**Benefits:**
- ✅ No need to commit files
- ✅ Data stored directly in Supabase
- ✅ Same endpoint used by cron and manual triggers
- ✅ Simpler workflow

**Files to Modify:**
- `.github/workflows/scrape-data.yml`

---

## 🔐 Security Considerations

### CRON_SECRET Protection

The `/api/regulations/scrape` endpoint should:

```typescript
// Verify request is authorized
const cronSecret = request.headers.get('x-cron-secret')
if (cronSecret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Who can call it:**
- ✅ GitHub Actions (with secret)
- ✅ Vercel Cron (automatic, doesn't need secret)
- ✅ Manual trigger (admin with secret)
- ❌ Public users (blocked)

### Rate Limiting

Add rate limiting to prevent abuse:

```typescript
// In middleware or API route
const IP_RATE_LIMIT = 1 // 1 request per hour per IP
```

**Alternative:** Use Vercel's built-in rate limiting

---

## 📊 Data Flow

### Scraping Flow

```
1. Trigger (GitHub Actions/Manual)
   │
   ▼
2. POST /api/regulations/scrape
   ├── Verify CRON_SECRET
   ├── Fetch DFO HTML
   ├── Parse with Cheerio
   ├── Validate with OpenAI
   └── Detect changes
   │
   ▼
3. Store in Supabase
   ├── Insert into scraped_regulations table
   ├── Status: 'pending' (if changes) or 'approved' (if no changes)
   └── Return summary
   │
   ▼
4. Admin Review (if changes detected)
   ├── Visit /admin/regulations
   ├── Review changes
   └── Approve or Reject
   │
   ▼
5. Activation (on approval)
   ├── Deactivate old regulation (is_active = false)
   ├── Create new regulation record
   ├── Insert species data
   └── Set as active (is_active = true)
```

### UI Data Flow

```
1. User visits page
   │
   ▼
2. useRegulations() hook fetches data
   │
   ├─── API Mode ────> GET /api/regulations?area_id=19
   │                   │
   │                   ▼
   │                   Supabase: fishing_regulations (where is_active = true)
   │                   │
   │                   ▼
   │                   Return live data
   │
   └─── Fallback ───> Local JSON files (if API fails)
   │
   ▼
3. Display regulations in UI
```

---

## 🚀 Implementation Steps (In Order)

### Step 1: Add Environment Variables (You)
```bash
# Add to .env.local:
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # From Supabase Dashboard
CRON_SECRET=random_base64_secret     # Generate with openssl
NEXT_PUBLIC_USE_REGULATIONS_API=true # Enable API mode
```

### Step 2: Run Database Migrations (You)
```
Supabase Dashboard → SQL Editor → Run migrations (if not already done)
```

### Step 3: Create Shared Parser Utility (Code)
```
src/app/utils/dfoParser.ts
  - Extract Cheerio parsing logic
  - Extract OpenAI parsing logic
  - Export parseArea() function
```

### Step 4: Update Scraper Script (Code)
```
scripts/scrape-dfo-regulations.ts
  - Import Supabase client
  - Replace file saving with database insert
  - Add change detection
  - Return API-compatible response
```

### Step 5: Update API Endpoint (Code)
```
src/app/api/regulations/scrape/route.ts
  - Use shared parser utility
  - Keep CRON_SECRET authentication
  - Improve error handling
```

### Step 6: Test End-to-End (Code)
```
1. Run scraper: pnpm tsx scripts/scrape-dfo-regulations.ts
2. Verify data in Supabase
3. Test API: curl http://localhost:3004/api/regulations
4. Test UI: Check if regulations display
```

### Step 7: Update GitHub Actions (Code)
```
.github/workflows/scrape-data.yml
  - Change from running scripts to calling API endpoints
  - Remove file commit logic (data is in DB now)
  - Add health check verification
```

### Step 8: Deploy & Monitor (You)
```
1. Commit all changes
2. Push to GitHub
3. Verify GitHub Actions workflow runs
4. Monitor first few runs
```

---

## 🔄 Migration Path

### Immediate (Local Development)

**Keep both systems running in parallel:**

```bash
# Environment variable controls which mode
NEXT_PUBLIC_USE_REGULATIONS_API=false  # Use static JSON (current)
NEXT_PUBLIC_USE_REGULATIONS_API=true   # Use Supabase API (new)
```

**Frontend automatically falls back** to static JSON if API fails.

### Transition Period (1-2 weeks)

1. Deploy with API mode enabled
2. Monitor for errors
3. Keep static JSON files as fallback
4. If issues arise, flip flag back to false

### Final State

1. Remove static JSON files (optional)
2. Rely entirely on Supabase + fallback
3. Automated daily scraping
4. Admin reviews changes before activation

---

## 💾 Database Schema (Already Exists)

### Tables

**`fishing_regulations`** - Active regulations
- One record per area (with is_active = true)
- Versioned (old versions kept with is_active = false)

**`species_regulations`** - Species data
- Foreign key to fishing_regulations
- Stores all species details

**`scraped_regulations`** - Pending scrapes
- Stores new scrapes awaiting approval
- Includes change detection

**`regulation_change_history`** - Audit trail
- Logs all changes
- Never deleted

### RLS Policies (Already Configured)

- ✅ Public can read active regulations
- ✅ Only authenticated users can manage scraped data
- ✅ Service role can write all tables

---

## 🔧 Technical Implementation Details

### 1. Shared Parser Utility

**File:** `src/app/utils/dfoParser.ts`

```typescript
import * as cheerio from 'cheerio'
import OpenAI from 'openai'

export async function parseArea(
  html: string,
  areaId: string,
  areaName: string,
  url: string
): Promise<AreaRegulations> {
  // Try Cheerio first
  const cheerioData = parseWithCheerio(html, areaId, areaName, url)

  if (cheerioData.species.length >= 10) {
    // Validate with OpenAI if available
    if (process.env.OPENAI_API_KEY) {
      await validateWithAI(cheerioData)
    }
    return cheerioData
  }

  // Fallback to OpenAI
  return await parseWithOpenAI(html, areaId, areaName, url)
}

// ... parseWithCheerio() function
// ... parseWithOpenAI() function
// ... validateWithAI() function
```

### 2. Updated Scraper Script

**File:** `scripts/scrape-dfo-regulations.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { parseArea } from '@/app/utils/dfoParser'

async function scrapeArea(areaConfig) {
  const html = await fetchDFOPage(areaConfig.url)
  const scrapedData = await parseArea(html, areaConfig.id, areaConfig.name, areaConfig.url)

  // Get current regulations for comparison
  const currentReg = await supabase
    .from('fishing_regulations')
    .select('*, species:species_regulations(*)')
    .eq('area_id', areaConfig.id)
    .eq('is_active', true)
    .single()

  // Detect changes
  const changes = detectChanges(currentReg, scrapedData)

  // Store in database
  await supabase.from('scraped_regulations').insert({
    area_id: areaConfig.id,
    scraped_data: scrapedData,
    changes_detected: changes,
    approval_status: changes.length > 0 ? 'pending' : 'approved'
  })

  console.log(`✅ Stored in Supabase (${changes.length} changes detected)`)
}
```

### 3. Updated API Endpoint

**File:** `src/app/api/regulations/scrape/route.ts`

```typescript
import { parseArea } from '@/app/utils/dfoParser'

export async function POST(request: NextRequest) {
  // Verify CRON_SECRET
  const cronSecret = request.headers.get('x-cron-secret')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use shared parser instead of inline regex
  const scrapedData = await parseArea(html, areaId, areaName, url)

  // ... rest of existing logic stays the same
}
```

### 4. Updated GitHub Actions

**File:** `.github/workflows/scrape-data.yml`

```yaml
- name: Scrape DFO Regulations
  run: |
    response=$(curl -s -w "\n%{http_code}" -X POST \
      "${{ secrets.NEXT_PUBLIC_APP_URL }}/api/regulations/scrape" \
      -H "x-cron-secret: ${{ secrets.CRON_SECRET }}")

    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status_code" -eq "200" ]; then
      echo "✅ DFO scraping successful"
      echo "$body" | jq '.'
    else
      echo "❌ DFO scraping failed: $status_code"
      exit 1
    fi
```

---

## 🧪 Testing Plan

### Local Testing (Before Deployment)

1. **Test Scraper Script:**
   ```bash
   pnpm tsx scripts/scrape-dfo-regulations.ts
   ```
   - Verify data inserted into `scraped_regulations` table
   - Check Supabase dashboard for new records

2. **Test API Endpoint:**
   ```bash
   curl -X POST http://localhost:3004/api/regulations/scrape \
     -H "x-cron-secret: your_secret_here"
   ```
   - Should return success response
   - Data should appear in Supabase

3. **Test UI:**
   ```bash
   # Set NEXT_PUBLIC_USE_REGULATIONS_API=true
   pnpm dev
   # Visit http://localhost:3004
   # Check if regulations display
   ```

4. **Test Admin Panel:**
   ```
   Visit: http://localhost:3004/admin/regulations
   - Should show pending scraped regulations
   - Approve one to verify activation flow
   ```

### Production Testing (After Deployment)

1. **Manual trigger GitHub Actions:**
   - Actions → Daily Data Scraping → Run workflow

2. **Verify data in Supabase:**
   - Check `scraped_regulations` table
   - Verify timestamps

3. **Check UI:**
   - Visit production site
   - Verify regulations display
   - Check browser console for errors

---

## 📊 Rollback Plan

If something goes wrong:

### Quick Rollback (Immediate)

```bash
# In .env.local, change:
NEXT_PUBLIC_USE_REGULATIONS_API=false
```

UI immediately falls back to static JSON files.

### Full Rollback (If needed)

1. Revert API endpoint changes
2. Disable GitHub Actions workflow
3. Use static JSON files until issues resolved

**Risk:** Low - fallback mechanism prevents total failure

---

## 💰 Cost Analysis (Updated)

### With Supabase + GitHub Actions

| Component | Cost |
|-----------|------|
| **Supabase Free Tier** | $0 |
| ├─ Database storage (~50MB) | ✅ Within limit |
| ├─ API requests (~10K/month) | ✅ Within limit |
| └─ Bandwidth (~1GB/month) | ✅ Within limit |
| **GitHub Actions** | $0 |
| ├─ 2,000 minutes/month | ✅ Within limit |
| └─ ~90 minutes used | ✅ Well within |
| **OpenAI API** | ~$4-5/month |
| ├─ DFO scraping | $3/month |
| └─ Fishing reports | $1.20/month |
| **TOTAL** | **~$4-5/month** |

**No database hosting costs!** Supabase free tier is sufficient.

---

## ✅ Success Criteria

Implementation is successful when:

1. ✅ Scraper stores data in Supabase (not local files)
2. ✅ Public endpoint works with CRON_SECRET authentication
3. ✅ UI fetches data from Supabase API
4. ✅ Admin can review and approve changes
5. ✅ Fallback to static JSON works if API fails
6. ✅ GitHub Actions runs daily without errors
7. ✅ Changes are auto-detected and flagged
8. ✅ No manual intervention needed for stable regulations

---

## 📋 Task Breakdown

### Your Tasks (5-10 mins setup)

- [ ] Get Supabase Service Role Key from dashboard
- [ ] Generate CRON_SECRET: `openssl rand -base64 32`
- [ ] Add both to `.env.local`
- [ ] Add GitHub Secrets (if using automation)
- [ ] Run database migrations (if not done)
- [ ] Enable GitHub Actions permissions

### Code Tasks (60-90 mins implementation)

- [ ] Create `src/app/utils/dfoParser.ts` (extract parsing logic)
- [ ] Update `scripts/scrape-dfo-regulations.ts` (use Supabase)
- [ ] Update `src/app/api/regulations/scrape/route.ts` (use new parser)
- [ ] Update `.github/workflows/scrape-data.yml` (call API instead of script)
- [ ] Add change detection logic
- [ ] Add error handling and logging
- [ ] Test locally
- [ ] Deploy and verify

---

## 🎯 Recommended Approach

### Option 1: Full Automation (Recommended)

**Pros:**
- Fully automated daily scraping
- Data always up-to-date
- Admin reviews only when changes detected
- No manual work needed

**Cons:**
- Requires initial setup (~1 hour)
- Small ongoing costs (~$5/month)

### Option 2: Manual Scraping

**Pros:**
- No automation setup needed
- Run only when needed
- Lower costs

**Cons:**
- Need to remember to run monthly
- Data may become stale
- More manual work

### Option 3: Hybrid (Start here)

**Phase 1:** Manual scraping with Supabase storage
- Run scraper manually once a month
- Data stored in Supabase
- UI uses API mode

**Phase 2:** Add automation later
- Enable GitHub Actions when comfortable
- Gradual transition

---

## 📞 Next Steps

**Choose your approach:**

1. **Full automation** - I'll implement everything (60-90 mins)
2. **Manual + Supabase** - I'll implement database storage only (30 mins)
3. **Review plan first** - Ask questions before starting

**After choosing, I'll:**
1. Create detailed task list
2. Implement step-by-step
3. Test thoroughly
4. Provide deployment guide

---

## 📚 Reference

- Current API endpoint: `src/app/api/regulations/scrape/route.ts`
- Current hook: `src/hooks/use-regulations.ts`
- Database schema: `supabase/migrations/20251003_create_fishing_regulations_tables.sql`
- GitHub Actions: `.github/workflows/scrape-data.yml`

**All infrastructure already exists!** Just need to connect the pieces.
