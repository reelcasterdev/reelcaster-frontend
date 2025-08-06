# Fishing Report Scraper API

This API endpoint scrapes fishing report web pages and uses OpenAI to extract structured data in a consistent JSON format.

## Setup

1. **Add OpenAI API Key**
   
   Add your OpenAI API key to `.env.local`:
   ```
   OPENAI_API_KEY=your-api-key-here
   ```

2. **Install Dependencies**
   
   The required dependencies should already be installed:
   - `cheerio` - For HTML parsing
   - `openai` - For AI-powered data extraction

## API Endpoint

### POST `/api/scrape-fishing-report`

Scrapes a fishing report URL and extracts structured data.

**Request Body:**
```json
{
  "url": "https://www.fishingvictoria.com/fishing-reports/381-august-3-2025",
  "location": "Victoria, Sidney",
  "hotspots": ["Oak Bay", "Waterfront", "Sidney"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportMetadata": {
      "source": "Fishing Victoria",
      "reportId": "381-victoria",
      "date": "2025-08-03",
      "weekEnding": "August 3, 2025",
      "location": "Victoria, Sidney",
      "region": "Vancouver Island, British Columbia"
    },
    "overallConditions": {
      "salmon": "FAIR",
      "bottomFishing": "FAIR",
      "crabbing": "GOOD"
    },
    "hotspotReports": {
      "Oak Bay": {
        "conditions": {...},
        "species": {...},
        "topBaits": [...],
        "topLures": [...],
        "flashers": [...],
        "baitDetails": {...},
        "techniques": [...],
        "notes": "..."
      }
    },
    "recommendedTackle": {...},
    "fishingTips": [...]
  }
}
```

## Testing the API

1. **Start the development server:**
   ```bash
   pnpm dev
   ```

2. **Run the test script:**
   ```bash
   pnpm tsx scripts/test-scrape-report.ts
   ```

   Or save the output:
   ```bash
   pnpm tsx scripts/test-scrape-report.ts --save
   ```

## Using the API in Your Application

```typescript
// Example: Update fishing reports
import { scrapeAndUpdateReport } from '@/app/utils/update-fishing-report'

await scrapeAndUpdateReport(
  'https://fishing-report-url.com',
  'Victoria, Sidney',
  ['Oak Bay', 'Waterfront', 'Sidney']
)
```

## Data Structure

The API returns data in this structure:

- **reportMetadata**: Information about the report source and date
- **overallConditions**: General fishing conditions for the area
- **hotspotReports**: Detailed information for each hotspot including:
  - Current conditions
  - Active species with sizes and depths
  - Recommended tackle (lures, baits, flashers)
  - Fishing techniques
  - Special notes
- **recommendedTackle**: Consolidated tackle recommendations
- **fishingTips**: General fishing tips for the area

## Error Handling

The API returns appropriate error messages:
- `400` - Invalid request (missing fields, invalid URL)
- `500` - Server error (OpenAI API issues, scraping failures)

## Rate Limiting

Be mindful of:
- OpenAI API rate limits
- Target website rate limits
- Costs associated with OpenAI API usage

## Notes

- The scraper extracts up to 8000 characters from the webpage to stay within token limits
- Uses GPT-4 mini model for cost efficiency
- Temperature is set to 0.3 for consistent output
- JSON mode ensures valid JSON output from OpenAI