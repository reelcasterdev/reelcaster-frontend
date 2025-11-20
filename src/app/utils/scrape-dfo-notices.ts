/**
 * DFO Fishery Notices Scraper
 *
 * Scrapes recreational and safety notices from DFO Pacific Region
 * Categories: Recreational fishing, biotoxin alerts, sanitary closures
 *
 * Uses hybrid approach:
 * - Cheerio for HTML parsing and structure extraction
 * - OpenAI GPT-4o-mini for natural language parsing (species, areas, classification)
 */

import * as cheerio from 'cheerio';
import OpenAI from 'openai';

// Target categories for recreational fishers
const RECREATIONAL_CATEGORIES = [
  'RECREATIONAL - Fin Fish (Other than Salmon)',
  'RECREATIONAL - General Information',
  'RECREATIONAL - Salmon',
  'RECREATIONAL - Shellfish',
  'Yukon/TBR - Recreational Salmon',
  'PSP (Red Tide) / Other Marine Toxins',
  'Sanitary/Other Contamination Closures',
  'General Information',
  'Licensing Information',
  'Salmon: ESSR (Excess to Salmon Spawning Req)',
];

export interface DFONoticeBasic {
  noticeNumber: string;
  docId: number;
  title: string;
  dateIssued: string;
  category?: string;
}

export interface DFONoticeParsed extends DFONoticeBasic {
  fullText: string;
  noticeUrl: string;
  dfoCategory: string;
  noticeType: 'closure' | 'opening' | 'modification' | 'alert' | 'information';
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  areas: number[];
  subareas: string[];
  species: string[];
  effectiveDate: string | null;
  expiryDate: string | null;
  isClosure: boolean;
  isOpening: boolean;
  isBiotoxinAlert: boolean;
  isSanitaryClosure: boolean;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

/**
 * Fetch search results page from DFO (with pagination support)
 */
async function fetchSearchResults(year: number = new Date().getFullYear(), maxPages: number = 1): Promise<DFONoticeBasic[]> {
  const allNotices: DFONoticeBasic[] = [];

  console.log(`Fetching DFO notices for ${year} (up to ${maxPages} pages)...`);

  for (let page = 0; page < maxPages; page++) {
    const offset = page * 25; // 25 results per page
    const url = `https://notices.dfo-mpo.gc.ca/fns-sap/index-eng.cfm?pg=search_results&ID=all&Year=${year}&Count=${offset + 1}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to fetch page ${page + 1}: ${response.statusText}`);
        break;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Find the main results table (second table on the page)
      const mainTable = $('table').eq(1);
      const notices: DFONoticeBasic[] = [];

      // Parse the table rows
      mainTable.find('tr').each((index, row) => {
        const $row = $(row);
        const cells = $row.find('td');

        if (cells.length < 3) return; // Skip header rows and incomplete rows

        // Extract data from cells
        const noticeNumberCell = $(cells[0]);
        const titleCell = $(cells[1]);
        const dateCell = $(cells[2]);

        // Extract notice number from first cell link
        const noticeNumber = noticeNumberCell.text().trim();
        if (!noticeNumber.startsWith('FN')) return;

        // Extract DOC_ID from the link in first cell
        const link = noticeNumberCell.find('a').attr('href');
        const docIdMatch = link?.match(/DOC_ID=(\d+)/);
        if (!docIdMatch) return;

        const docId = parseInt(docIdMatch[1]);

        // Extract title - remove the "FN####-" prefix if present
        let title = titleCell.text().trim();
        const titleMatch = title.match(/^FN\d+-(.+)$/);
        if (titleMatch) {
          title = titleMatch[1];
        }

        const dateIssued = dateCell.text().trim().replace(/\s+/g, ' ');

        notices.push({
          noticeNumber,
          docId,
          title,
          dateIssued,
        });
      });

      if (notices.length === 0) {
        console.log(`No more notices found on page ${page + 1}`);
        break; // No more notices
      }

      console.log(`Page ${page + 1}: Found ${notices.length} notices`);
      allNotices.push(...notices);

      // Small delay between page requests
      if (page < maxPages - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`Error fetching page ${page + 1}:`, error);
      break;
    }
  }

  console.log(`Total notices fetched: ${allNotices.length}`);
  return allNotices;
}

/**
 * Fetch and parse individual notice page
 */
async function fetchNoticePage(docId: number): Promise<{ html: string; fullText: string; title: string; dateIssued: string } | null> {
  const url = `https://notices.dfo-mpo.gc.ca/fns-sap/index-eng.cfm?pg=view_notice&DOC_ID=${docId}&ID=all`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    if (!response.ok) {
      console.error(`Failed to fetch notice ${docId}: ${response.statusText}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Check if it's an invalid notice
    if ($('h1').text().includes('Invalid notice')) {
      console.warn(`Notice ${docId} is invalid/expired`);
      return null;
    }

    // Extract title and date
    const title = $('h1').first().text().trim();
    const dateIssued = $('.wb-inv').first().text().trim() || '';

    // Extract main content
    const mainContent = $('main').text();
    const fullText = mainContent.replace(/\s+/g, ' ').trim();

    return { html, fullText, title, dateIssued };
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error(`Timeout fetching notice ${docId}`);
    } else {
      console.error(`Error fetching notice ${docId}:`, error);
    }
    return null;
  }
}

/**
 * Use AI to classify and extract structured data from notice
 */
async function classifyNoticeWithAI(
  notice: DFONoticeBasic,
  fullText: string,
  openai: OpenAI
): Promise<Omit<DFONoticeParsed, 'noticeNumber' | 'docId' | 'title' | 'dateIssued' | 'category'> | null> {
  const prompt = `Analyze this DFO fishery notice and extract structured data as JSON.

NOTICE TITLE: ${notice.title}

NOTICE TEXT:
${fullText.substring(0, 3000)} // Truncate for API efficiency

Extract the following fields:

1. dfoCategory (string): Categorize as one of:
   - "RECREATIONAL - Salmon"
   - "RECREATIONAL - Shellfish"
   - "RECREATIONAL - Fin Fish (Other than Salmon)"
   - "RECREATIONAL - General Information"
   - "PSP (Red Tide) / Other Marine Toxins"
   - "Sanitary/Other Contamination Closures"
   - "General Information"

2. noticeType (string): 'closure' | 'opening' | 'modification' | 'alert' | 'information'

3. priorityLevel (string):
   - 'critical' for biotoxin/safety alerts
   - 'high' for closures/openings
   - 'medium' for modifications/updates
   - 'low' for general info

4. species (string[]): Array of fish/shellfish species mentioned (use common names)
   Examples: ["chinook salmon", "coho salmon", "clams", "mussels", "geoduck"]

5. areas (number[]): Extract fishing area numbers mentioned
   Examples from text like "Area 19", "Areas 19 and 20" → [19, 20]

6. subareas (string[]): Extract subarea codes
   Examples from text like "Subarea 19-1", "19-2" → ["19-1", "19-2"]

7. effectiveDate (string | null): ISO format date or null
   Look for "effective immediately", specific dates, or time mentions

8. expiryDate (string | null): ISO format date or null
   Look for "until further notice" (null), or specific end dates

9. isClosure (boolean): Is this closing a fishery?

10. isOpening (boolean): Is this opening a fishery?

11. isBiotoxinAlert (boolean): Related to marine biotoxins (PSP, ASP, DSP)?

12. isSanitaryClosure (boolean): Related to sanitary contamination?

13. contactName (string | null): Contact person name if mentioned

14. contactEmail (string | null): Contact email if mentioned

15. contactPhone (string | null): Contact phone if mentioned

IMPORTANT: Return ONLY valid JSON, no explanation. Use null for missing values.

Response format:
{
  "dfoCategory": "...",
  "noticeType": "...",
  "priorityLevel": "...",
  "species": [...],
  "areas": [...],
  "subareas": [...],
  "effectiveDate": "..." or null,
  "expiryDate": "..." or null,
  "isClosure": true/false,
  "isOpening": true/false,
  "isBiotoxinAlert": true/false,
  "isSanitaryClosure": true/false,
  "contactName": "..." or null,
  "contactEmail": "..." or null,
  "contactPhone": "..." or null
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a specialized parser for Canadian DFO fishery notices. Extract structured data accurately from fishing regulations and notices.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1, // Low temperature for consistent parsing
      response_format: { type: 'json_object' },
    });

    const result = completion.choices[0].message.content;
    if (!result) {
      console.error('No response from OpenAI');
      return null;
    }

    const parsed = JSON.parse(result);

    return {
      fullText,
      noticeUrl: `https://notices.dfo-mpo.gc.ca/fns-sap/index-eng.cfm?pg=view_notice&DOC_ID=${notice.docId}&ID=all`,
      dfoCategory: parsed.dfoCategory || 'General Information',
      noticeType: parsed.noticeType || 'information',
      priorityLevel: parsed.priorityLevel || 'medium',
      areas: Array.isArray(parsed.areas) ? parsed.areas : [],
      subareas: Array.isArray(parsed.subareas) ? parsed.subareas : [],
      species: Array.isArray(parsed.species) ? parsed.species : [],
      effectiveDate: parsed.effectiveDate || null,
      expiryDate: parsed.expiryDate || null,
      isClosure: parsed.isClosure === true,
      isOpening: parsed.isOpening === true,
      isBiotoxinAlert: parsed.isBiotoxinAlert === true,
      isSanitaryClosure: parsed.isSanitaryClosure === true,
      contactName: parsed.contactName || null,
      contactEmail: parsed.contactEmail || null,
      contactPhone: parsed.contactPhone || null,
    };
  } catch (error) {
    console.error('AI classification error:', error);
    return null;
  }
}

/**
 * Main scraper function
 */
export async function scrapeDFONotices(options: {
  year?: number;
  limit?: number;
  openaiApiKey: string;
}): Promise<{
  notices: DFONoticeParsed[];
  errors: string[];
  stats: {
    found: number;
    fetched: number;
    parsed: number;
    failed: number;
  };
}> {
  const { year = new Date().getFullYear(), limit = 30, openaiApiKey } = options;

  const openai = new OpenAI({ apiKey: openaiApiKey });
  const notices: DFONoticeParsed[] = [];
  const errors: string[] = [];

  const stats = {
    found: 0,
    fetched: 0,
    parsed: 0,
    failed: 0,
  };

  try {
    // Step 1: Fetch search results (calculate pages needed for requested limit)
    const maxPages = Math.ceil(limit / 25); // 25 notices per page
    const searchResults = await fetchSearchResults(year, maxPages);
    stats.found = searchResults.length;

    // Step 2: Process notices (limit to requested amount)
    const noticesBatch = searchResults.slice(0, limit);

    for (const notice of noticesBatch) {
      try {
        // Fetch individual notice page
        const noticePage = await fetchNoticePage(notice.docId);

        if (!noticePage) {
          stats.failed++;
          errors.push(`Failed to fetch notice ${notice.noticeNumber} (DOC_ID: ${notice.docId})`);
          continue;
        }

        stats.fetched++;

        // Classify with AI
        const classified = await classifyNoticeWithAI(notice, noticePage.fullText, openai);

        if (!classified) {
          stats.failed++;
          errors.push(`Failed to classify notice ${notice.noticeNumber}`);
          continue;
        }

        // Check if this is a recreational/safety notice
        if (!RECREATIONAL_CATEGORIES.includes(classified.dfoCategory)) {
          console.log(`Skipping non-recreational notice ${notice.noticeNumber}: ${classified.dfoCategory}`);
          continue;
        }

        stats.parsed++;

        // Combine all data
        notices.push({
          noticeNumber: notice.noticeNumber,
          docId: notice.docId,
          title: noticePage.title || notice.title,
          dateIssued: noticePage.dateIssued || notice.dateIssued,
          ...classified,
        });

        // Rate limiting: wait 500ms between API calls
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        stats.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Error processing notice ${notice.noticeNumber}: ${errorMsg}`);
        console.error(`Error processing notice ${notice.noticeNumber}:`, error);
      }
    }

    return { notices, errors, stats };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Critical scraper error: ${errorMsg}`);
    throw error;
  }
}
