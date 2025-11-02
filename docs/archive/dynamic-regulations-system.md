# Dynamic Fishing Regulations System

## Overview

The ReelCaster frontend now supports dynamic fishing regulations that can be fetched from a Supabase database instead of relying on static JSON files. This allows for:

- Support for unlimited fishing locations across BC
- Real-time updates without code deployments
- Automated scraping from DFO website
- Admin approval workflow for regulation changes

## System Architecture

### Data Flow

```
DFO Website → Scraper → Supabase Database → API Endpoint → Frontend
                ↑                                              ↓
            Cron Job                                    React Components
           (Weekly)                                     (with caching)
```

## Components

### 1. Database Schema (Supabase)

- `fishing_regulations` - Main table for area regulations
- `species_regulations` - Species-specific rules per area
- `regulation_general_rules` - General rules per area
- `regulation_protected_areas` - Protected/closed areas
- `scraped_regulations` - Pending updates awaiting approval
- `regulation_change_history` - Audit trail of changes

### 2. API Endpoint

**Location**: `/api/regulations`

**Methods**:
- `GET /api/regulations` - Get all active regulations
- `GET /api/regulations?area_id=19` - Get regulations for specific area

**Response Format**:
```json
{
  "areaId": "19",
  "areaName": "Victoria, Sidney",
  "url": "https://www.pac.dfo-mpo.gc.ca/...",
  "species": [...],
  "generalRules": [...],
  "protectedAreas": [...]
}
```

### 3. Frontend Service

**Location**: `/src/app/services/regulations.ts`

**Key Functions**:
- `getRegulationsByLocation(locationName)` - Fetch by location name
- `getRegulationsByAreaId(areaId)` - Fetch by area ID
- `getAllRegulations()` - Get all available regulations
- `getAvailableLocations()` - List all locations with regulations

**Features**:
- 1-hour client-side caching
- Automatic fallback to cached data on error
- TypeScript interfaces for type safety

### 4. React Hooks

**Location**: `/src/hooks/use-regulations.ts`

**Available Hooks**:
- `useLocationRegulations(locationName)` - Hook for specific location
- `useAvailableLocations()` - Hook for all available locations
- `useRegulations(options)` - Generic hook with options

**Example Usage**:
```tsx
const { regulations, loading, error } = useLocationRegulations('Victoria, Sidney')

if (loading) return <LoadingSpinner />
if (error) return <ErrorMessage />

return <SpeciesRegulations species={regulations?.species || []} />
```

### 5. DFO Scraper

**Location**: `/src/app/utils/dfoScraperV2.ts`

**Features**:
- Cheerio-based HTML parsing
- Support for multiple DFO areas
- Change detection and comparison
- Error handling and recovery

## Supported Fishing Areas

Currently configured areas:

| Area ID | Location Name | Status |
|---------|--------------|--------|
| 3 | Prince Rupert | Placeholder data |
| 13 | Campbell River | Placeholder data |
| 19 | Victoria, Sidney | Full data |
| 20 | Sooke, Port Renfrew | Full data |
| 23 | Tofino, Ucluelet | Placeholder data |
| 27 | Nanaimo | Placeholder data |
| 28 | Pender Harbour | Placeholder data |
| 29 | Powell River | Placeholder data |
| 121 | Haida Gwaii | Placeholder data |

## Running the Scraper

### Manual Scraping

```bash
# Install dependencies
pnpm install

# Scrape all areas
pnpm tsx scripts/scrape-and-update-regulations.ts

# Scrape specific area
pnpm tsx scripts/scrape-and-update-regulations.ts 19
```

### Automated Scraping

The system is designed to support automated scraping via:
- Cron jobs (Vercel, GitHub Actions, etc.)
- API endpoint triggers
- Admin dashboard (future feature)

## Database Migrations

### Apply Migrations

```bash
# Run all migrations
npx supabase migration up

# Specific migrations:
# - 20251003_create_fishing_regulations_tables.sql - Creates schema
# - 20251003_seed_current_regulations.sql - Seeds areas 19 & 20
# - 20251031_add_more_fishing_areas.sql - Adds 7 new areas
```

## Environment Variables

Required environment variables:

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key # For scraping/admin
```

## Adding New Fishing Areas

1. **Add to scraper configuration**:
   ```typescript
   // src/app/utils/dfoScraperV2.ts
   const AREA_NAMES: Record<string, string> = {
     '31': 'New Location Name', // Add new area
   }
   ```

2. **Create database entry**:
   ```sql
   INSERT INTO fishing_regulations (area_id, area_name, official_url, ...)
   VALUES ('31', 'New Location Name', 'https://dfo-url...', ...);
   ```

3. **Run scraper**:
   ```bash
   pnpm tsx scripts/scrape-and-update-regulations.ts 31
   ```

## Caching Strategy

### Client-Side
- 1-hour cache in browser memory
- Stale-while-revalidate pattern
- Fallback to cached data on error

### Server-Side
- API responses cached for 1 hour
- CDN caching headers configured
- Database queries optimized with indexes

## Error Handling

The system handles errors gracefully at multiple levels:

1. **Scraper**: Continues with other areas if one fails
2. **API**: Returns cached data or empty array on database error
3. **Frontend**: Shows cached data or appropriate error messages
4. **Components**: Graceful degradation with placeholder content

## Future Enhancements

### Planned Features

1. **Admin Dashboard**
   - View pending regulation updates
   - Approve/reject scraped changes
   - Manual regulation editing
   - Scraping schedule management

2. **Enhanced Scraping**
   - OpenAI integration for complex sections
   - Image extraction for maps/diagrams
   - Multi-language support (French)
   - Historical data tracking

3. **User Features**
   - Regulation change notifications
   - Favorite locations
   - Offline support with PWA
   - Mobile app integration

4. **Data Enrichment**
   - Species images and descriptions
   - Interactive maps of fishing areas
   - Real-time closure notifications
   - Integration with licensing system

## Troubleshooting

### Common Issues

1. **Regulations not loading**
   - Check Supabase connection
   - Verify RLS policies are correct
   - Check browser console for errors

2. **Scraper failures**
   - Verify DFO website structure hasn't changed
   - Check network connectivity
   - Review scraper logs for specific errors

3. **Stale data**
   - Clear browser cache
   - Run manual scraper update
   - Check database last_updated timestamps

## API Reference

### Get All Regulations
```
GET /api/regulations
```

### Get Specific Area
```
GET /api/regulations?area_id=19
```

### Response Schema
```typescript
interface AreaRegulations {
  areaId: string
  areaName: string
  url: string
  lastUpdated: string
  lastVerified: string
  nextReviewDate: string
  dataSource: string
  species: SpeciesRegulation[]
  generalRules: string[]
  protectedAreas?: string[]
}
```

## Testing

### Unit Tests (TODO)
```bash
pnpm test src/app/services/regulations.test.ts
pnpm test src/hooks/use-regulations.test.ts
```

### Integration Tests (TODO)
```bash
pnpm test:e2e regulations.spec.ts
```

### Manual Testing
1. Load main page with different locations
2. Verify regulations display correctly
3. Test error states by blocking API
4. Verify caching by checking network tab

## Support

For issues or questions:
1. Check this documentation
2. Review error logs in browser console
3. Check Supabase dashboard for database issues
4. Contact development team