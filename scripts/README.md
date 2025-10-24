# Fishing Report Scraper Scripts

This directory contains scripts for scraping and managing fishing reports from FishingVictoria.com.

## Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `scrape-historical-reports.ts` | Scrape historical fishing reports | Production scraping |
| `scrape-dfo-regulations.ts` | Scrape DFO regulations | Production scraping |

---

## scrape-historical-reports.ts

Dynamically scrapes fishing reports from FishingVictoria.com and saves them to the historical reports directory.

### Features

- **Dynamic Latest Report Detection**: Automatically calculates the latest report based on current date
- **Custom Report Specification**: Manually specify the latest report ID and date
- **Daily Checking**: Checks each day for reports, skips days without reports
- **Skip Existing Reports**: Automatically skips reports that have already been scraped
- **Smart URL Validation**: Checks if report URL exists before attempting to scrape
- **Configurable Range**: Check any number of days going backwards
- **Force Re-scrape**: Option to re-scrape existing reports

### Usage

#### 1. Basic Usage (Auto-detect latest report)

Automatically detects the current date and estimates the latest report ID:

```bash
pnpm tsx scripts/scrape-historical-reports.ts
```

**Example Output:**
```
📌 Auto-detected latest report: ID 392, Date 2025-10-19
💡 To use a specific report, run: pnpm tsx scripts/scrape-historical-reports.ts --id=XXX --date=YYYY-MM-DD
📅 Starting from potential report #392 (2025-10-19)
📊 Checking back 140 days (will skip days without reports)
```

#### 2. Specify Latest Report (Recommended)

When you know the exact latest report ID and date (e.g., October 19th report):

```bash
pnpm tsx scripts/scrape-historical-reports.ts --id=392 --date=2025-10-19
```

This will check **every day** going back 140 days (~20 weeks), but will automatically skip days that don't have reports.

#### 3. Check More/Fewer Days

Change the number of days to check (default is 140 = ~20 weeks):

```bash
# Check 365 days (1 year) - will find ~52 weekly reports
pnpm tsx scripts/scrape-historical-reports.ts --id=392 --date=2025-10-19 --days=365

# Check just the last 35 days (5 weeks) - will find ~5 reports
pnpm tsx scripts/scrape-historical-reports.ts --id=392 --date=2025-10-19 --days=35
```

**Note:** The script checks each day but only scrapes when a report is found. Days without reports are skipped automatically.

#### 4. Force Re-scrape Existing Reports

Re-scrape reports even if they already exist:

```bash
pnpm tsx scripts/scrape-historical-reports.ts --id=392 --date=2025-10-19 --force
```

### Command Line Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--id=XXX` | Latest report ID | `--id=392` |
| `--date=YYYY-MM-DD` | Latest report date | `--date=2025-10-19` |
| `--days=N` | Number of days to check (default: 140) | `--days=365` |
| `--force` | Re-scrape existing reports | `--force` |

**How it works:**
- The script checks **each day** within the specified range
- It validates each URL before attempting to scrape
- Days without reports (404s) are skipped automatically
- Only valid reports are scraped and saved
- Since reports are weekly, checking 140 days typically finds ~20 reports

### Finding the Latest Report

To find the latest report ID and date:

1. Visit https://www.fishingvictoria.com/fishing-reports
2. Look at the most recent report URL
3. Example: `https://www.fishingvictoria.com/fishing-reports/392-october-19-2025`
   - ID: `392`
   - Date: `2025-10-19`

### Prerequisites

1. **Dev Server Running**:
   ```bash
   pnpm dev
   ```

2. **OpenAI API Key** in `.env.local`:
   ```
   OPENAI_API_KEY=your-key-here
   ```

### Output

Reports are saved to:
```
src/app/data/fishing-reports/historical/
├── victoria-sidney/
│   ├── week-2025-10-19.json
│   ├── week-2025-10-12.json
│   └── ...
└── sooke-port-renfrew/
    ├── week-2025-10-19.json
    ├── week-2025-10-12.json
    └── ...
```

### Examples

**Check last ~10 weeks (70 days) for October 19th report:**
```bash
pnpm tsx scripts/scrape-historical-reports.ts --id=392 --date=2025-10-19 --days=70
```

**Check full year (365 days) - finds all weekly reports:**
```bash
pnpm tsx scripts/scrape-historical-reports.ts --id=392 --date=2025-10-19 --days=365
```

**Re-scrape everything from scratch:**
```bash
pnpm tsx scripts/scrape-historical-reports.ts --id=392 --date=2025-10-19 --days=365 --force
```

**Quick check of just last month:**
```bash
pnpm tsx scripts/scrape-historical-reports.ts --id=392 --date=2025-10-19 --days=30
```

### Notes

- The script checks **every day** within the range but only scrapes when reports exist
- URL validation happens first (HEAD request) to avoid unnecessary API calls
- Existing reports are automatically skipped unless `--force` is used
- Days without reports are skipped quickly (100ms delay)
- Actual scrapes have 2-second delays to avoid rate limiting
- Both Victoria/Sidney and Sooke/Port Renfrew locations are scraped
- Each report uses OpenAI GPT-4 for data extraction (costs apply)

### Expected Output

When running the script, you'll see:

```
🎣 Historical Fishing Report Scraper
===================================

📌 Using custom latest report: ID 392, Date 2025-10-19
📅 Starting from potential report #392 (2025-10-19)
📊 Checking back 140 days (will skip days without reports)

📊 Will check 140 days for reports across 2 locations
📍 Locations: Victoria, Sidney, Sooke, Port Renfrew

🏞️  Processing location: Victoria, Sidney
📌 Hotspots: Oak Bay, Waterfront, Sidney, Constance Bank, Ten Mile Point
──────────────────────────────────────────────────────────

📅 Found report #392 - October 19, 2025
🌐 URL: https://www.fishingvictoria.com/fishing-reports/392-october-19-2025
✅ Saved: week-2025-10-19.json

⏭️  Day 2025-10-18 - No report found
⏭️  Day 2025-10-17 - No report found
...
⏭️  Day 2025-10-13 - No report found

📅 Found report #391 - October 12, 2025
🌐 URL: https://www.fishingvictoria.com/fishing-reports/391-october-12-2025
✅ Saved: week-2025-10-12.json

======================================================================
📊 Scraping Complete!
✅ Successfully scraped: 20 reports
❌ Failed: 0 reports
📄 Already scraped: 0 reports
🚫 No report found: 120 days
📁 Reports saved to: src/app/data/fishing-reports/historical/

📈 Summary: Found 20 reports out of 140 days checked
```

---

## Quick Commands

### Run DFO Regulations Scraper
```bash
pnpm tsx scripts/scrape-dfo-regulations.ts
```

### Run Fishing Reports Scraper
```bash
# Auto-detect latest report
pnpm tsx scripts/scrape-historical-reports.ts

# Specify exact report
pnpm tsx scripts/scrape-historical-reports.ts --id=392 --date=2025-10-19 --days=7
```

---


## scrape-dfo-regulations.ts

**Production scraper** for DFO fishing regulations. Uses hybrid approach (Cheerio + OpenAI).

### Usage

```bash
pnpm tsx scripts/scrape-dfo-regulations.ts
```

### Features

- **Hybrid scraping**: Cheerio for speed, OpenAI for fallback/validation
- **Multi-area support**: Scrapes Areas 19 & 20
- **AI validation**: Validates extracted data for accuracy
- **JSON output**: Saves to `scraped-data/` directory
- **Error handling**: Continues on failure, detailed error reporting

### Output

```
scraped-data/
  ├── dfo-area-19-YYYY-MM-DD.json
  └── dfo-area-20-YYYY-MM-DD.json
```

### Results

**Per run:**
- ✅ 47 species per area (94 total)
- ⚡ ~16 seconds total
- 💰 ~$0.10 cost

---

## 🤖 Automation

Both production scrapers run automatically via GitHub Actions.

### Daily Schedule

`.github/workflows/scrape-data.yml` runs daily at 2 AM UTC:
- Scrapes DFO regulations
- Scrapes new fishing reports
- Auto-commits changes

### Manual Trigger

GitHub → Actions → "Daily Data Scraping" → Run workflow

### Setup

See `docs/github-actions-setup.md` for complete setup instructions.

---

## Cost Summary

| Scraper | Frequency | Cost/Run | Monthly Cost |
|---------|-----------|----------|--------------|
| DFO Regulations | Daily | $0.10 | ~$3.00 |
| Fishing Reports | Daily | $0.15 | ~$1.20 |
| **Total** | - | - | **~$4-5/month** |

**GitHub Actions:** Free (within 2,000 min/month)

---

## Documentation

- `docs/github-actions-setup.md` - Automation setup guide
- `docs/dfo-scraper-analysis.md` - Technical analysis
- `REGULATIONS_AUTOMATION_SETUP.md` - Regulations system overview
