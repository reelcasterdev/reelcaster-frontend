# Fishing Regulations Automation System

## Overview

This system automatically scrapes, monitors, and updates fishing regulations from DFO (Department of Fisheries and Oceans) websites.

### Features

- **Automated Web Scraping**: Weekly scraping of DFO regulation pages
- **Change Detection**: Automatically identifies changes in regulations
- **Admin Review**: Manual approval workflow for regulation changes
- **Database Storage**: Versioned regulation data in Supabase
- **API Access**: RESTful API for accessing regulations
- **Fallback Support**: Graceful fallback to static JSON files
- **Audit Trail**: Complete history of all regulation changes

---

## Architecture

```
┌─────────────────────┐
│   DFO Website       │
│   (Source of Truth) │
└──────────┬──────────┘
           │
           │ Cron: Every Sunday 2 AM
           ▼
┌─────────────────────┐
│  Web Scraper        │
│  /api/regulations/  │
│  scrape             │
└──────────┬──────────┘
           │
           │ Store for review
           ▼
┌─────────────────────┐
│  Supabase Database  │
│  - fishing_         │
│    regulations      │
│  - scraped_         │
│    regulations      │
└──────────┬──────────┘
           │
           │ Admin approves
           ▼
┌─────────────────────┐
│  Admin UI           │
│  /admin/regulations │
└──────────┬──────────┘
           │
           │ Publish
           ▼
┌─────────────────────┐
│  API Endpoint       │
│  /api/regulations   │
└──────────┬──────────┘
           │
           │ Frontend fetches
           ▼
┌─────────────────────┐
│  User Interface     │
│  (Species           │
│  Regulations)       │
└─────────────────────┘
```

---

## Setup Instructions

### 1. Database Setup

#### Run Migrations

1. Navigate to Supabase dashboard: https://app.supabase.com
2. Select your project
3. Go to SQL Editor
4. Run the following migration files in order:

**File: `supabase/migrations/20251003_create_fishing_regulations_tables.sql`**

This creates:
- `fishing_regulations` - Main regulation data
- `species_regulations` - Species-specific rules
- `regulation_general_rules` - General fishing rules
- `regulation_protected_areas` - Protected area info
- `scraped_regulations` - Pending scraped data
- `regulation_change_history` - Audit trail

**File: `supabase/migrations/20251003_seed_current_regulations.sql`**

This populates the database with current regulation data.

### 2. Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Required: Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required: Cron job security
CRON_SECRET=$(openssl rand -base64 32)

# Optional: Enable API mode (default: false, uses static JSON)
NEXT_PUBLIC_USE_REGULATIONS_API=true

# Optional: Auto-approve no-change scrapes
AUTO_APPROVE_NO_CHANGES=false
```

### 3. Vercel Deployment

The `vercel.json` file configures a weekly cron job:

```json
{
  "crons": [
    {
      "path": "/api/regulations/scrape",
      "schedule": "0 2 * * 0"
    }
  ]
}
```

**Schedule**: Every Sunday at 2:00 AM UTC

#### Deploy to Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

#### Configure Cron Job

Vercel Pro or higher is required for cron jobs.

1. Go to Project Settings → Cron Jobs
2. Verify the cron is active
3. Set the `CRON_SECRET` environment variable

### 4. Admin Access

#### Accessing the Admin Panel

1. Navigate to `/admin/regulations`
2. Must be authenticated (login required)
3. View pending scraped regulations
4. Approve or reject changes

#### Manual Scraping

Click "Trigger Scrape" button to manually scrape DFO websites outside of the scheduled time.

---

## API Endpoints

### GET /api/regulations

Fetch all active fishing regulations.

**Query Parameters:**
- `area_id` (optional): Filter by area ID (e.g., "19", "20")

**Response:**
```json
[
  {
    "areaId": "19",
    "areaName": "Victoria, Sidney",
    "url": "https://www.pac.dfo-mpo.gc.ca/...",
    "lastUpdated": "2025-10-02",
    "lastVerified": "2025-10-02",
    "nextReviewDate": "2025-11-02",
    "dataSource": "DFO Pacific Region",
    "species": [...],
    "generalRules": [...],
    "protectedAreas": [...]
  }
]
```

### POST /api/regulations/scrape

Trigger a manual scrape of DFO websites.

**Headers:**
- `x-cron-secret`: Your CRON_SECRET value

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "area": "Victoria, Sidney",
      "success": true,
      "changesDetected": 2,
      "changes": ["chinook: Daily limit changed from 1 to 2"],
      "scrapedId": "uuid"
    }
  ],
  "scrapedAt": "2025-10-03T12:00:00Z"
}
```

### GET /api/regulations/scrape

Get pending scraped regulations awaiting approval.

**Response:**
```json
{
  "scraped": [
    {
      "id": "uuid",
      "area_id": "19",
      "scraped_data": {...},
      "changes_detected": ["..."],
      "approval_status": "pending"
    }
  ]
}
```

### POST /api/regulations/approve/:id

Approve a scraped regulation and make it active.

**Response:**
```json
{
  "success": true,
  "regulation": {...}
}
```

### DELETE /api/regulations/approve/:id

Reject a scraped regulation.

---

## Usage Modes

### Mode 1: Static JSON Files (Default)

- Uses files in `src/app/data/regulations/`
- No database required
- Simple and reliable
- Manual updates needed

**Configuration:**
```bash
NEXT_PUBLIC_USE_REGULATIONS_API=false
```

### Mode 2: Database + API (Automated)

- Uses Supabase database
- Automated scraping
- Admin approval workflow
- Full audit trail

**Configuration:**
```bash
NEXT_PUBLIC_USE_REGULATIONS_API=true
```

### Hybrid Mode (Recommended)

- API enabled with automatic fallback
- If API fails, falls back to static JSON
- Best of both worlds

The `useRegulations` hook and `fetchRegulations` function handle this automatically.

---

## Monitoring & Maintenance

### Weekly Tasks

1. **Check Admin Panel** (`/admin/regulations`)
   - Review any pending scraped regulations
   - Approve or reject changes
   - Verify data accuracy

2. **Review Change Log**
   - Check `regulation_change_history` table
   - Verify all changes are legitimate

### Monthly Tasks

1. **Manual Verification**
   - Visit official DFO pages
   - Spot-check regulation accuracy
   - Update `lastVerified` timestamps

2. **Database Cleanup**
   - Archive old `scraped_regulations` entries
   - Prune change history (optional)

### Troubleshooting

#### Scraper Fails

Check:
1. DFO website structure hasn't changed
2. Network connectivity
3. Supabase connection
4. Error logs in `scraped_regulations.error_message`

#### No Changes Detected

This is normal! If DFO hasn't updated regulations, the scraper will return 0 changes.

#### False Positives

If scraper detects changes that don't exist:
1. Reject the scraped regulation
2. Update scraper logic in `src/app/api/regulations/scrape/route.ts`
3. Improve HTML parsing patterns

---

## Database Schema

### fishing_regulations
- Main regulation records
- One per area
- `is_active` flag for versioning

### species_regulations
- Species-specific rules
- Foreign key to fishing_regulations
- JSONB notes field for flexibility

### scraped_regulations
- Pending scrape results
- Awaiting admin approval
- Includes change detection

### regulation_change_history
- Audit trail
- Tracks all modifications
- Never deleted

---

## Extending the System

### Adding New Areas

1. Add area mapping in `src/app/data/regulations/index.ts`
2. Create JSON file: `area-{id}-{name}.json`
3. Update scraper in `/api/regulations/scrape/route.ts`
4. Add to seed migration

### Improving Scraper

The current scraper uses basic pattern matching. To improve:

1. Use a headless browser (Puppeteer/Playwright)
2. Implement robust HTML parsing (Cheerio)
3. Add machine learning for structure detection
4. Use GPT-4 Vision to extract data from screenshots

### Notifications

Add email/SMS notifications when:
- Changes are detected
- Approval is needed
- Data becomes outdated

Integrate with:
- SendGrid
- Twilio
- Vercel Email

---

## Security Considerations

1. **CRON_SECRET**: Keep this secret! It protects the scraper endpoint
2. **Service Role Key**: Never expose in client-side code
3. **RLS Policies**: Only authenticated users can manage scraped regulations
4. **Admin Access**: Implement proper role-based access control

---

## Cost Estimates

### Supabase (Free Tier)
- 500MB database: ✓ Sufficient
- 2GB bandwidth: ✓ Sufficient
- 50K API requests: ✓ Sufficient

### Vercel (Hobby Tier)
- No cron jobs ✗ **Requires Pro**
- Pro: $20/month for cron jobs

**Total: $20/month for fully automated system**

**Alternative (Free):**
- Use GitHub Actions instead of Vercel cron
- Keep static JSON files
- Manual monthly updates

---

## Support

For issues or questions:
1. Check error logs in Supabase
2. Review `scraped_regulations` table
3. Consult DFO official pages
4. Update static JSON as fallback

---

## License

This automation system is part of the ReelCaster application.
