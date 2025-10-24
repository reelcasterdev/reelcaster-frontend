# GitHub Actions Setup Guide

## Overview

Automated daily scraping of fishing data using GitHub Actions:
- **DFO Regulations**: Scrapes fishing regulations from DFO Pacific Region
- **Fishing Reports**: Scrapes weekly fishing reports from FishingVictoria.com

---

## What Gets Scraped

### 1. DFO Regulations (Daily)
**Data:**
- 47 species per area (Areas 19 & 20)
- Daily limits, size restrictions, gear types
- Status (Open/Closed/Non Retention)
- General fishing rules

**Output:**
```
scraped-data/
  ├── dfo-area-19-YYYY-MM-DD.json
  └── dfo-area-20-YYYY-MM-DD.json
```

### 2. Fishing Reports (Daily)
**Data:**
- Weekly fishing reports
- Hotspot conditions
- Species activity
- Tackle recommendations

**Output:**
```
src/app/data/fishing-reports/historical/
  ├── victoria-sidney/
  │   └── week-YYYY-MM-DD.json
  └── sooke-port-renfrew/
      └── week-YYYY-MM-DD.json
```

---

## Setup Instructions

### Step 1: Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for AI scraping | `sk-proj-...` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGc...` |
| `CRON_SECRET` | Secret for cron endpoints | Generate with `openssl rand -base64 32` |

**How to add secrets:**

1. Click **"New repository secret"**
2. Enter the **Name** (e.g., `OPENAI_API_KEY`)
3. Enter the **Secret** value
4. Click **"Add secret"**
5. Repeat for all secrets

### Step 2: Enable GitHub Actions

1. Go to repository **Settings** → **Actions** → **General**
2. Under **"Workflow permissions"**, select:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**
3. Click **Save**

### Step 3: Enable Scheduled Workflows

GitHub may disable scheduled workflows after 60 days of inactivity.

**To keep it active:**
- The workflow runs daily automatically
- Or manually trigger it monthly (see below)

---

## Workflow Configuration

### Schedule

The workflow runs automatically:
```yaml
schedule:
  - cron: '0 2 * * *'  # Daily at 2 AM UTC (6 PM PST)
```

**Cron expression breakdown:**
- `0` - Minute (0)
- `2` - Hour (2 AM UTC)
- `*` - Day of month (every day)
- `*` - Month (every month)
- `*` - Day of week (every day)

### Manual Trigger

You can manually trigger the workflow:

1. Go to **Actions** tab
2. Click **"Daily Data Scraping"** workflow
3. Click **"Run workflow"** dropdown
4. Configure options:
   - ✅ Scrape fishing reports
   - ✅ Scrape DFO regulations
   - Days to check: `7` (default)
5. Click **"Run workflow"**

---

## How It Works

### Workflow Steps

1. **Checkout code** - Gets latest repository code
2. **Setup environment** - Installs Node.js and pnpm
3. **Install dependencies** - Runs `pnpm install`
4. **Create .env.local** - Sets up environment variables from secrets
5. **Scrape DFO regulations** - Runs production scraper
6. **Scrape fishing reports** - Runs historical reports scraper
7. **Check for changes** - Detects if new data was found
8. **Commit and push** - Automatically commits new data
9. **Create summary** - Posts summary to Actions tab

### Auto-Commit Behavior

If new data is found:
```
✅ New data committed automatically
📝 Commit message includes timestamp and details
🚀 Pushed to main branch
```

If no new data:
```
ℹ️  No changes, nothing committed
```

---

## Monitoring

### View Workflow Runs

1. Go to **Actions** tab
2. Click on **"Daily Data Scraping"**
3. See list of all runs with status

### Check Summary

Each run creates a summary showing:
- ✅ DFO Regulations: Success/Failed
- ✅ Fishing Reports: Success/Failed
- 📝 Number of species extracted
- 📁 Changes committed or not

### View Logs

Click on any workflow run to see detailed logs for each step.

---

## Troubleshooting

### Workflow Fails Immediately

**Cause:** Missing GitHub secrets

**Fix:**
1. Check all 5 secrets are added (see Step 1)
2. Verify secret names match exactly
3. Re-run workflow

### DFO Scraper Fails

**Possible causes:**
1. DFO website is down
2. HTML structure changed
3. OpenAI API rate limit

**Fix:**
- Check workflow logs for specific error
- DFO structure change → Update Cheerio selectors in `scripts/scrape-dfo-regulations.ts`
- Rate limit → Wait 1 minute and manually re-run

### Fishing Reports Scraper Fails

**Possible causes:**
1. FishingVictoria.com is down
2. Report ID estimation is off
3. OpenAI API rate limit

**Fix:**
- Check if website is accessible
- Manually trigger with correct `--id` and `--date`
- Adjust report ID calculation in workflow

### No Data Committed

**This is normal!**

The scrapers check for new data:
- DFO regulations rarely change (maybe monthly)
- Fishing reports are weekly

If no new reports exist, nothing is committed.

### Workflow Disabled After 60 Days

GitHub disables inactive workflows after 60 days.

**Fix:**
1. Go to **Actions** tab
2. Click on disabled workflow
3. Click **"Enable workflow"**
4. Or manually trigger once per month to keep active

---

## Cost Estimates

### GitHub Actions

**Free tier:**
- 2,000 minutes/month (public repos get unlimited)
- ~5 minutes per run
- ~400 runs/month possible

**This workflow:**
- ~3 minutes per run
- 30 runs/month (daily)
- **Total: ~90 minutes/month** ✅ Well within free tier

### OpenAI API

**DFO Scraper:**
- 2 areas × $0.05 per area = **$0.10 per run**
- Daily runs: 30 × $0.10 = **$3/month**

**Fishing Reports:**
- ~2 reports/week × $0.15 each = **$0.30/week**
- Monthly: ~$1.20/month

**Total API costs: ~$4-5/month**

---

## Customization

### Change Schedule

Edit `.github/workflows/scrape-data.yml`:

```yaml
schedule:
  - cron: '0 8 * * 1'  # Weekly on Mondays at 8 AM UTC
```

Use [crontab.guru](https://crontab.guru) to build schedules.

### Scrape More/Fewer Days

When manually triggering, adjust **"Days to check"** parameter:
- `7` - Last week
- `30` - Last month
- `365` - Last year

### Add More Areas

Edit `scripts/scrape-dfo-regulations.ts`:

```typescript
const AREAS = [
  { id: '19', name: 'Victoria, Sidney', url: '...' },
  { id: '20', name: 'Sooke', url: '...' },
  { id: '21', name: 'New Area', url: '...' }, // Add here
]
```

---

## Notifications (Optional)

### Get Notified on Failures

Add a notification step to `.github/workflows/scrape-data.yml`:

```yaml
- name: Send notification
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

Or use:
- Email notifications (built into GitHub)
- Discord webhooks
- Telegram bots

---

## Best Practices

### 1. Monitor Weekly

Check Actions tab once a week to ensure scrapers are running.

### 2. Review Auto-Commits

Occasionally review auto-committed data to ensure accuracy.

### 3. Keep Secrets Updated

If you rotate API keys, update GitHub secrets immediately.

### 4. Test Locally First

Before relying on automated scraping, test locally:

```bash
pnpm tsx scripts/scrape-dfo-regulations.ts
pnpm tsx scripts/scrape-historical-reports.ts --id=392 --date=2025-10-19 --days=7
```

### 5. Manual Triggers

Use manual triggers to:
- Test changes before deploying
- Fill gaps if automated run failed
- Scrape specific date ranges

---

## Files Created

```
.github/workflows/
  └── scrape-data.yml                    # GitHub Action workflow

scripts/
  ├── scrape-dfo-regulations.ts          # Production DFO scraper
  ├── scrape-historical-reports.ts       # Fishing reports scraper
  ├── test-dfo-scraper.ts               # Test DFO scraper
  └── test-scrape-report.ts             # Test reports scraper

scraped-data/
  ├── dfo-area-19-YYYY-MM-DD.json       # Auto-generated
  └── dfo-area-20-YYYY-MM-DD.json       # Auto-generated

src/app/data/fishing-reports/historical/
  ├── victoria-sidney/*.json             # Auto-generated
  └── sooke-port-renfrew/*.json          # Auto-generated
```

---

## FAQ

**Q: Why isn't new data being committed every day?**
A: DFO regulations change rarely. Fishing reports are weekly. No new data = no commit.

**Q: Can I run this on a different schedule?**
A: Yes, edit the `cron` expression in the workflow file.

**Q: What if I run out of OpenAI credits?**
A: The scraper will fail. Add credits or temporarily disable scraping.

**Q: Can I scrape more areas?**
A: Yes, add them to the `AREAS` array in the production scraper.

**Q: How do I know if it's working?**
A: Check the Actions tab for green checkmarks and view the summary.

**Q: Can I disable auto-commits?**
A: Yes, remove or comment out the "Commit and push changes" step.

**Q: Is this safe for my API keys?**
A: Yes, GitHub Secrets are encrypted and never exposed in logs.

---

## Support

If you encounter issues:

1. Check workflow logs in Actions tab
2. Review error messages
3. Test scrapers locally
4. Check API quotas (OpenAI, GitHub Actions)
5. Verify secrets are set correctly

For DFO HTML structure changes, update the Cheerio selectors or rely on OpenAI fallback.
