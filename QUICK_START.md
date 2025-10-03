# Quick Start - Regulations Automation

## TL;DR - Get Running in 5 Minutes

### Option 1: Keep It Simple (Current - No Changes)

**Do nothing!** The app currently uses static JSON files that work perfectly.

- ✅ Zero cost
- ✅ Zero setup
- ✅ 100% reliable
- ⚠️ Manual updates needed monthly

---

### Option 2: Enable Full Automation

#### Step 1: Database (2 minutes)

```bash
# 1. Go to https://app.supabase.com
# 2. Open SQL Editor
# 3. Copy/paste this file:
supabase/migrations/20251003_create_fishing_regulations_tables.sql
# 4. Run it
# 5. Copy/paste this file:
supabase/migrations/20251003_seed_current_regulations.sql
# 6. Run it
```

#### Step 2: Environment Variables (1 minute)

```bash
# Add to Vercel dashboard or .env.local:

SUPABASE_SERVICE_ROLE_KEY=your_key_here
CRON_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_USE_REGULATIONS_API=true
```

#### Step 3: Deploy (1 minute)

```bash
git add .
git commit -m "Add regulations automation"
git push
# Vercel auto-deploys
```

#### Step 4: Test (1 minute)

1. Visit `yoursite.com/admin/regulations`
2. Click "Trigger Scrape"
3. Click "Approve" on the result
4. Done!

---

## What You Get

### Before (Static)
```
You update regulations manually
 └─> Edit JSON files
 └─> Git commit
 └─> Deploy
 └─> Hope you didn't miss anything
```

### After (Automated)
```
System checks DFO website weekly
 └─> Detects changes automatically
 └─> Shows you what changed
 └─> You click "Approve"
 └─> Live in seconds
```

---

## Files Created

### Database
- `supabase/migrations/20251003_create_fishing_regulations_tables.sql`
- `supabase/migrations/20251003_seed_current_regulations.sql`

### Backend
- `src/app/api/regulations/route.ts` - API to fetch regulations
- `src/app/api/regulations/scrape/route.ts` - Scraper endpoint
- `src/app/api/regulations/approve/[id]/route.ts` - Approval endpoint

### Frontend
- `src/app/admin/regulations/page.tsx` - Admin dashboard
- `src/hooks/use-regulations.ts` - React hook
- `src/app/utils/dfoScraper.ts` - Scraper utilities

### Config
- `vercel.json` - Cron job config
- `.env.example` - Updated with new vars

### Docs
- `REGULATIONS_AUTOMATION_SETUP.md` - Full guide
- `AUTOMATION_SUMMARY.md` - Complete overview
- `QUICK_START.md` - This file

---

## Cost

| Setup | Monthly Cost | Auto Updates |
|-------|--------------|--------------|
| Static (current) | $0 | ❌ |
| Automated | $20 | ✅ |

**Note:** $20/month is for Vercel Pro (required for cron jobs)

---

## Troubleshooting

### "Cannot read regulations"
→ Check `NEXT_PUBLIC_SUPABASE_URL` is set

### "Scraping failed"
→ DFO website might be down, try again later

### "Not authorized"
→ Make sure you're logged in at `/admin/regulations`

### "Changes not showing"
→ Set `NEXT_PUBLIC_USE_REGULATIONS_API=true`

---

## FAQ

**Q: Do I need to do this?**
A: No! Static JSON works fine. This is for automation.

**Q: What if the automation breaks?**
A: App automatically falls back to static JSON files.

**Q: How often does it scrape?**
A: Every Sunday at 2 AM UTC (configurable in `vercel.json`)

**Q: Can I scrape manually?**
A: Yes! Button in admin panel: `/admin/regulations`

**Q: Is my data safe?**
A: Yes! All changes require manual approval before going live.

**Q: What if I don't want to pay $20/month?**
A: Keep using static JSON, or use GitHub Actions (free but requires setup)

---

## Commands

```bash
# Development
pnpm dev

# Build
pnpm build

# View admin panel
http://localhost:3000/admin/regulations

# Test API
curl http://localhost:3000/api/regulations?area_id=19

# Generate cron secret
openssl rand -base64 32
```

---

## Next Steps

1. ✅ System is built and ready
2. [ ] Run database migrations (if you want automation)
3. [ ] Add environment variables
4. [ ] Deploy to Vercel
5. [ ] Test admin panel
6. [ ] Enjoy automated updates!

---

**Questions?** Read `REGULATIONS_AUTOMATION_SETUP.md` for full details.

**Status:** ✅ Complete - Ready to deploy!
