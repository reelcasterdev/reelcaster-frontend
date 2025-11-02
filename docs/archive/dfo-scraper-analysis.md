# DFO Regulations Scraper - Analysis & Recommendations

## Executive Summary

**Recommendation:** Implement a **Hybrid Approach** using Cheerio for structured table data + OpenAI for complex sections and validation.

**Status:** Current implementation is incomplete (placeholder regex patterns). Need robust production scraper.

---

## Current State Analysis

### What's Already Built

1. **API Endpoint**: `/api/regulations/scrape` (src/app/api/regulations/scrape/route.ts)
   - Weekly cron job configured (Sundays at 2 AM)
   - Change detection logic
   - Admin approval workflow
   - Database storage (Supabase)

2. **DFO Scraper Utility**: `src/app/utils/dfoScraper.ts`
   - Placeholder implementation
   - DOMParser approach (won't work server-side)
   - Needs complete rewrite

3. **Dependencies Already Installed**:
   - ✅ Cheerio (HTML parsing)
   - ✅ OpenAI (AI extraction)

### What's Missing

- ❌ Actual HTML parsing logic for tables
- ❌ Species extraction from DFO tables
- ❌ Handling of complex nested data (like Coho limits)
- ❌ Restrictions and notes extraction
- ❌ Protected areas parsing
- ❌ Error handling for malformed HTML

---

## DFO Page Structure Analysis

### URL Pattern
```
https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s{AREA_ID}-eng.html

Examples:
- Area 19: a-s19-eng.html (Victoria, Sidney)
- Area 20: a-s20-eng.html (Sooke)
```

### HTML Structure

```html
<!-- Page uses WET-BOEW Canada.ca framework -->
<div class="wb-tabs">
  <div class="tabpanels">

    <!-- Each species has a collapsible section -->
    <details>
      <summary>Salmon</summary>

      <!-- Species regulations table -->
      <table class="table">
        <thead>
          <tr>
            <th>Species</th>
            <th>Areas</th>
            <th>Min size</th>
            <th>Gear</th>
            <th>Daily Limits</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Chinook salmon (hatchery and wild combined)</td>
            <td>19-1 to 19-4</td>
            <td>45cm</td>
            <td>barbless hook and line</td>
            <td>2</td>
            <td>Open</td>
          </tr>
          <!-- More rows... -->
        </tbody>
      </table>

      <!-- Restrictions section -->
      <h3 id="s-rest">Restrictions</h3>
      <ul>
        <li>Complex rules and notes...</li>
      </ul>
    </details>

    <!-- More species sections... -->
    <details><summary>Finfish</summary>...</details>
    <details><summary>Shellfish</summary>...</details>
    <details><summary>Protected areas</summary>...</details>
  </div>
</div>
```

### Data Complexity Levels

**Simple Tables (75% of data)**:
```
Species | Areas | Min Size | Gear | Daily Limits | Status
Chinook | 19-1  | 45cm     | hook | 2            | Open
```

**Complex Data (25% of data)**:
```
Coho salmon daily limits:
"2 Combined Total
* Consisting of no more than:
  - 2 Hatchery-marked
  - 1 Wild-unmarked"
```

---

## Scraping Approach Comparison

### Option 1: Cheerio (Pure HTML Parsing)

**How it works:**
```typescript
import * as cheerio from 'cheerio'

const $ = cheerio.load(html)
$('table.table tbody tr').each((i, row) => {
  const cells = $(row).find('td')
  const species = {
    name: $(cells[0]).text().trim(),
    areas: $(cells[1]).text().trim(),
    minSize: $(cells[2]).text().trim(),
    // ...
  }
})
```

**Pros:**
- ✅ Fast execution (~100ms per page)
- ✅ No API costs
- ✅ Precise control over data extraction
- ✅ Works server-side (Next.js API routes)
- ✅ Good for structured tables

**Cons:**
- ❌ Fragile to HTML structure changes
- ❌ Requires manual parsing of complex formats
- ❌ Need separate logic for each section type
- ❌ Difficult to handle nested/conditional content

**Best for:**
- Species tables (straightforward)
- Area maps and links
- Structured lists

---

### Option 2: OpenAI (AI-Powered Extraction)

**How it works:**
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{
    role: "system",
    content: "Extract fishing regulations as JSON..."
  }, {
    role: "user",
    content: htmlContent
  }],
  response_format: { type: "json_object" }
})
```

**Pros:**
- ✅ Resilient to HTML changes
- ✅ Handles complex/nested data naturally
- ✅ Can understand context and relationships
- ✅ Same approach as fishing reports (proven)
- ✅ Extracts semantic meaning, not just text

**Cons:**
- ❌ API costs (~$0.10-0.50 per page scrape)
- ❌ Slower (~5-10 seconds per page)
- ❌ Token limits (need to chunk large pages)
- ❌ Non-deterministic (slight variations)
- ❌ Requires error validation

**Best for:**
- Complex restrictions sections
- Notes and special conditions
- Protected areas descriptions
- Data validation/verification

---

### Option 3: Hybrid Approach (RECOMMENDED)

**Strategy:**
1. **Cheerio for structured data** (tables)
   - Species regulations tables
   - Area information
   - Links and references

2. **OpenAI for complex content**
   - Restrictions and notes
   - Protected area descriptions
   - Validation of extracted data
   - Fallback when Cheerio fails

**Implementation Flow:**
```
1. Fetch HTML from DFO
2. Use Cheerio to extract tables → Species data
3. Use Cheerio to extract simple lists → General rules
4. Use OpenAI to parse complex sections → Restrictions
5. Use OpenAI to validate all extracted data
6. Merge results → Complete regulation object
```

**Benefits:**
- ✅ Fast for 80% of data (Cheerio)
- ✅ Accurate for complex data (OpenAI)
- ✅ Cost-effective (~$0.10 per area)
- ✅ Resilient to changes
- ✅ Self-validating

**Estimated Performance:**
- Speed: ~8 seconds per area
- Cost: ~$0.15 per area per scrape
- Accuracy: 95%+ with validation

---

## Recommended Implementation Plan

### Phase 1: Core Cheerio Parser (Week 1)

**Files to Create/Update:**
```
scripts/
  └── scrape-dfo-regulations.ts         # New standalone scraper

src/app/utils/
  └── dfoParser.ts                      # New Cheerio-based parser

src/app/api/regulations/scrape/
  └── route.ts                          # Update to use new parser
```

**What to Build:**
1. Cheerio-based table parser
   - Extract species tables
   - Parse columns (name, areas, size, gear, limits, status)
   - Handle multiple rows per species

2. Structure extraction
   - General rules lists
   - Area maps and links
   - Last updated date

3. Data normalization
   - Convert sizes to standard format
   - Parse area ranges (e.g., "19-1 to 19-4")
   - Standardize status values

### Phase 2: OpenAI Enhancement (Week 2)

**What to Add:**
1. Complex content parser
   - Restrictions sections
   - Nested limits (e.g., Coho)
   - Protected areas

2. Validation layer
   - Verify extracted data makes sense
   - Detect missing required fields
   - Flag suspicious changes

3. Fallback mechanism
   - Use OpenAI if Cheerio fails
   - Compare both outputs for accuracy

### Phase 3: Integration & Testing (Week 3)

**Tasks:**
1. Integrate with existing API endpoint
2. Add comprehensive error handling
3. Create test suite with sample HTML
4. Set up monitoring and alerts
5. Document scraper maintenance

---

## Cost Analysis

### Cheerio Only
- **Cost**: $0 per scrape
- **Time**: ~1 second per area
- **Maintenance**: Medium (needs updates when HTML changes)

### OpenAI Only
- **Cost**: ~$0.30-0.50 per area
- **Time**: ~10 seconds per area
- **Maintenance**: Low (resilient to changes)

### Hybrid (Recommended)
- **Cost**: ~$0.10-0.15 per area
- **Time**: ~5-8 seconds per area
- **Maintenance**: Low-Medium

**Annual Cost Estimate:**
```
2 areas × 52 weeks × $0.15 = $15.60/year

With occasional manual scrapes:
Total: ~$20-30/year
```

**ROI**: Automating regulation updates saves ~10 hours/year of manual work.

---

## Sample Code Structure

### Cheerio Parser
```typescript
// src/app/utils/dfoParser.ts
import * as cheerio from 'cheerio'

export function parseSpeciesTable(html: string) {
  const $ = cheerio.load(html)
  const species: SpeciesRegulation[] = []

  // Find all species tables
  $('table.table').each((i, table) => {
    $(table).find('tbody tr').each((j, row) => {
      const cells = $(row).find('td')
      if (cells.length >= 6) {
        species.push({
          name: $(cells[0]).text().trim(),
          areas: $(cells[1]).text().trim(),
          minSize: $(cells[2]).text().trim(),
          gear: $(cells[3]).text().trim(),
          dailyLimit: $(cells[4]).text().trim(),
          status: $(cells[5]).text().trim() as Status,
        })
      }
    })
  })

  return species
}
```

### OpenAI Validator
```typescript
// src/app/utils/dfoValidator.ts
export async function validateRegulations(data: any) {
  const prompt = `
    Validate this fishing regulation data for accuracy and completeness:
    ${JSON.stringify(data, null, 2)}

    Check for:
    1. Missing required fields
    2. Inconsistent daily limits
    3. Invalid size formats
    4. Suspicious status values

    Return JSON with validation results.
  `

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  })

  return JSON.parse(response.choices[0].message.content)
}
```

---

## Testing Strategy

### Unit Tests
```typescript
describe('DFO Parser', () => {
  it('should parse salmon table correctly', () => {
    const html = `<table class="table">...</table>`
    const result = parseSpeciesTable(html)
    expect(result).toHaveLength(5)
    expect(result[0].name).toBe('Chinook salmon')
  })

  it('should handle complex daily limits', () => {
    // Test Coho combined limits
  })
})
```

### Integration Tests
```typescript
describe('DFO Scraper', () => {
  it('should scrape Area 19 successfully', async () => {
    const result = await scrapeDFOArea('19')
    expect(result.species.length).toBeGreaterThan(10)
  })
})
```

### Sample HTML Fixtures
```
tests/fixtures/
  ├── area-19-salmon-table.html
  ├── area-19-restrictions.html
  └── area-20-full-page.html
```

---

## Maintenance Plan

### Weekly (Automated)
- Cron job scrapes both areas
- Change detection alerts admin
- Store scraped data for review

### Monthly (Manual)
- Spot-check 2-3 species
- Verify scraper still works
- Update if DFO changes HTML

### When HTML Changes
1. Scraper will detect parsing failures
2. Admin receives alert
3. Update Cheerio selectors
4. Run tests to verify
5. Deploy update

---

## Next Steps

1. **Review & Approve** this approach
2. **Set up environment**:
   ```bash
   # Already installed:
   - Cheerio ✅
   - OpenAI ✅

   # Add for testing:
   pnpm add -D @types/cheerio
   ```

3. **Create standalone scraper script** (similar to fishing reports)
4. **Test with real DFO pages**
5. **Integrate with existing API**
6. **Set up monitoring**

---

## Questions to Resolve

1. **Which areas to scrape?**
   - Current: Area 19, 20
   - Future: 18, 21, 23? (other popular areas)

2. **Update frequency?**
   - Current: Weekly (Sundays 2 AM)
   - Needed: Is weekly sufficient? DFO changes regulations seasonally

3. **Approval workflow?**
   - Current: Admin must approve all changes
   - Alternative: Auto-approve if OpenAI validates data

4. **Error handling?**
   - What happens if scraper fails?
   - Fallback to last known good data?
   - Alert admin immediately?

---

## Resources

- DFO Area 19: https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s19-eng.html
- DFO Area 20: https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s20-eng.html
- Cheerio Docs: https://cheerio.js.org/
- OpenAI JSON Mode: https://platform.openai.com/docs/guides/structured-outputs
