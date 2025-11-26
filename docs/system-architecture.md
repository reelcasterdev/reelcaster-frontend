# ReelCaster System Architecture Documentation

This document provides comprehensive documentation of the ReelCaster Frontend application architecture, algorithms, database schema, and automated systems.

## Table of Contents

1. [Fishing Score Algorithm](#1-fishing-score-algorithm)
2. [Scraping Systems](#2-scraping-systems)
3. [Notification System](#3-notification-system)
4. [Cron Jobs & Automation](#4-cron-jobs--automation)
5. [Database Schema](#5-database-schema)
6. [API Integrations](#6-api-integrations)
7. [Application Architecture](#7-application-architecture)

---

## 1. Fishing Score Algorithm

The ReelCaster application uses a sophisticated two-tier scoring system for fishing forecasts.

### 1.1 General Algorithm (13 Factors)

**File:** `src/app/utils/fishingCalculations.ts`

The general algorithm scores 13 different factors and combines them with weighted percentages:

#### Weight Distribution (With CHS Water Data)

| Factor | Weight | Scale |
|--------|--------|-------|
| Pressure | 13% | 0-10 |
| Wind | 12% | 0-10 |
| Temperature | 9% | 0-10 |
| Water Temperature | 5% | 0-10 |
| Precipitation | 10% | 0-10 |
| Tide | 8% | 0-10 |
| Current Speed | 4% | 0-10 |
| Current Direction | 2% | 0-10 |
| Cloud Cover | 6% | 0-10 |
| Visibility | 6% | 0-10 |
| Sunshine Duration | 5% | 0-10 |
| Lightning | 5% | 0-10 |
| Atmospheric Stability | 4% | 0-10 |
| Comfort | 4% | 0-10 |
| Time of Day | 4% | 0-10 |
| Species Factor | 3% | 0-10 |

#### Individual Factor Scoring

**Pressure Score:**
- Optimal: 1015-1020 hPa (1017.5 midpoint)
- ±2.5 hPa: 10/10 | ±5 hPa: 8-10/10 | ±10 hPa: 2-8/10 | >20 hPa: 1/10

**Wind Score:**
- ≤1 m/s: 10/10 | 1-3 m/s: 9-10/10 | 3-6 m/s: 7-9/10 | 6-10 m/s: 5-7/10
- Gust penalty: 0.7x-0.9x multiplier based on gust ratio
- Direction bonus: East (45-135°) = 1.05x, West = 0.95x

**Temperature Score:**
- Optimal range: 10-14°C = 10/10
- 6-10°C or 14-18°C: 6-10/10
- Extreme (<-2°C or >30°C): 0.2/10

**Time of Day Score:**
- Dawn/Dusk (±30 min from sunrise/sunset): 10/10
- Early morning (6-9 AM): 5.8-6.6/10
- Midday (10 AM-4 PM): 3-4/10
- Night: 0.5-1.5/10

### 1.2 Species-Specific Algorithms

Each species has unique weight distributions and optimal ranges:

#### Chinook Salmon
| Factor | Weight |
|--------|--------|
| Light/Time | 20% |
| Tidal Range | 15% |
| Current Flow | 15% |
| Seasonality | 15% |
| Barometric Pressure | 10% |
| Moon Phase | 5% |
| Temperature | 5% |
| Wind | 5% |
| Wave Height | 5% |
| Precipitation | 5% |

**Optimal conditions:** 10-15°C water, 0.5-2.0 knots current, 5-15 knots wind ("salmon chop")

**Safety Cut-offs:** Current >4 knots, Air <5°C or water <8°C, Wind >20 knots, Waves >2.0m = UNSAFE

#### Other Species Algorithms

| Species | Primary Factors | Unique Features |
|---------|-----------------|-----------------|
| **Coho Salmon** | Seasonality (25%), Light (20%), Current (20%) | Visual hunter, dawn/dusk bonus |
| **Chum Salmon** | Seasonality (25%), Current (20%), Tidal (20%) | Fall peak (Sept-Nov), precipitation tolerant |
| **Pink Salmon** | Seasonality (30%), Light (15%), Current (15%) | **Odd-year only** (score=0 even years) |
| **Sockeye Salmon** | Seasonality (30%), Current (20%), Tidal (15%) | June-Aug peak |
| **Halibut** | Tidal Range (25%), Current (25%) | **Inverted logic**: small tides optimal |
| **Lingcod** | Slack Tide (30%), Tidal Range (20%) | Slack tide window (90 min) |
| **Rockfish** | Slack Tide (35%), Wind (20%), Waves (20%) | Highest slack tide priority |
| **Crab** | Soak Time/Current (30%), Seasonality (25%) | Molt cycle critical (June-July worst) |
| **Spot Prawn** | Seasonality (50%) | **Extreme**: May-June ONLY |

### 1.3 Species Profile Parameters

Each species profile includes 15+ parameters:

```typescript
interface SpeciesProfile {
  optimalTempRange: [number, number];      // Air temp preference
  tolerableTempRange: [number, number];    // Acceptable air range
  optimalWaterTempRange: [number, number]; // Water temp preference
  tolerableWaterTempRange: [number, number];
  pressureSensitivity: number;             // 0.5-2.0 multiplier
  windTolerance: number;                   // 0.5-2.0 multiplier
  tideImportance: number;                  // 0.5-2.0 multiplier
  currentSpeedPreference: number;          // 0.5-2.0 multiplier
  optimalCurrentSpeed: [number, number];   // Knots range
  dawnActivityBonus: number;               // 0.8-1.5x
  duskActivityBonus: number;               // 0.8-1.5x
  midDayActivity: number;                  // 0.5-1.2x
  nightActivity: number;                   // 0.3-1.0x
  lowLightPreference: number;              // 0.7-1.3x for overcast
  precipitationTolerance: number;          // 0.5-1.5x
  seasonalPeaks: { spring, summer, fall, winter };
}
```

---

## 2. Scraping Systems

ReelCaster uses three automated scraping systems to keep data fresh.

### 2.1 Fishing Reports Scraper

**Files:**
- `src/app/utils/scrape-fishing-report.ts`
- `src/app/api/fishing-reports/scrape/route.ts`

**Source:** FishingVictoria.com weekly reports (published Sundays)

**Parsing Approach:** Hybrid Cheerio + OpenAI
1. **Phase 1 (Cheerio):** Extract HTML sections by h3 headings
2. **Phase 2 (OpenAI gpt-4o-mini):** Parse natural language content

**Cost Optimization:**
- Pre-extraction reduces tokens by 25-40%
- Alternative models: Claude Haiku (80% cheaper), Groq Llama (95% cheaper)

**Data Extracted:**
```json
{
  "reportMetadata": { "source", "reportId", "date", "weekEnding", "location" },
  "overallConditions": { "salmon", "bottomFishing", "crabbing" },
  "hotspotReports": { "HotspotName": { "conditions", "species", "topBaits", "techniques" } },
  "recommendedTackle": { "flashers", "spoons", "jigs", "bait", "depths" },
  "fishingTips": ["array of tips"]
}
```

**Smart Logic:**
- Checks Sundays specifically (weekly publication)
- URL validation with HEAD requests
- Stops after finding latest report per location
- Duplicate detection in Supabase

### 2.2 DFO Regulations Scraper

**Files:**
- `src/app/utils/dfoScraperV2.ts`
- `src/app/api/regulations/scrape/route.ts`

**Source:** DFO Pacific Region (`pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/`)

**Parsing:** Pure Cheerio (HTML parsing) - No AI needed

**Areas Supported:**
| Area ID | Name |
|---------|------|
| 3 | Prince Rupert |
| 13 | Campbell River |
| 19 | Victoria, Sidney |
| 20 | Sooke, Port Renfrew |
| 23 | Tofino, Ucluelet |
| 27 | Nanaimo |
| 28 | Pender Harbour |
| 29 | Powell River |
| 121 | Haida Gwaii |

**Data Extracted:**
- Species regulations (daily limits, min size, status, gear, season)
- General rules and restrictions
- Protected/closed areas
- Page modification dates

**Change Detection:** Tracks new species, limit changes, status changes, removed species

### 2.3 DFO Notices Scraper

**Files:**
- `src/app/utils/scrape-dfo-notices.ts`
- `src/app/api/dfo-notices/scrape/route.ts`

**Source:** `notices.dfo-mpo.gc.ca/fns-sap/`

**Parsing:** Hybrid Cheerio + OpenAI

**Data Extracted:**
```typescript
{
  noticeNumber: string;      // e.g., "FN1227"
  dfoCategory: string;       // DFO official category
  noticeType: 'closure' | 'opening' | 'modification' | 'alert' | 'information';
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  species: string[];         // Affected species
  areas: number[];           // Area numbers [19, 20]
  effectiveDate: string;
  expiryDate: string;
  isClosure: boolean;
  isBiotoxinAlert: boolean;
}
```

---

## 3. Notification System

### 3.1 Trigger Mechanism

**File:** `.github/workflows/scrape-data.yml`

**Schedule:** Daily at 2 AM UTC (6 PM PST previous day)
**Endpoint:** `POST /api/notifications/send-scheduled`
**Authentication:** Bearer token with `CRON_SECRET`

### 3.2 Notification Flow

```
GitHub Actions (Daily Cron)
  → POST /api/notifications/send-scheduled
    → Fetch users with notifications enabled
      → For each user: Generate notification data
        → Evaluate all thresholds
          → If conditions met: Generate email
            → Batch send (20 at a time)
              → Update last_notification_sent
```

### 3.3 Threshold Evaluation Logic

A notification is sent **ONLY** if ALL conditions pass:

1. **Timing Check:** Daily (>23 hours since last) or Weekly (>167 hours)
2. **Location Validation:** User has lat/lng set
3. **Forecast Fetch:** Open Meteo API returns 7-day data
4. **Score Threshold:** Best day score ≥ `fishing_score_threshold`
5. **Weather Thresholds:** At least one hour meets ALL criteria:
   - Wind speed ≤ threshold
   - Precipitation ≤ threshold
   - Temperature within min/max range

### 3.4 User Preferences Schema

```typescript
interface NotificationPreferences {
  notification_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  notification_frequency: 'daily' | 'weekly';
  notification_time: string;
  timezone: string;
  location_lat: number | null;
  location_lng: number | null;
  location_radius_km: number;
  location_name: string | null;
  favorite_species: string[];

  // Thresholds
  wind_speed_threshold_kph: number;
  wave_height_threshold_m: number;
  precipitation_threshold_mm: number;
  temperature_min_c: number;
  temperature_max_c: number;
  fishing_score_threshold: number;
  uv_index_threshold: number;

  // Safety Alerts
  alert_on_thunderstorm: boolean;
  alert_on_gale_warning: boolean;
  alert_on_pressure_drop: boolean;

  // Regulatory
  include_regulation_changes: boolean;
  dfo_notices_enabled: boolean;
  dfo_areas_of_interest: number[];
}
```

### 3.5 Email Template Structure

1. **Header:** "Great Fishing Ahead!" + location
2. **Best Day Alert Box:** Score badge, temperature, wind, rain
3. **Species Info:** Selected species badges
4. **Weather Alerts:** Thunderstorm, gale warnings (if triggered)
5. **7-Day Forecast Table:** Date, score, conditions
6. **Regulation Updates:** Changes since last notification
7. **DFO Notices:** Critical/high priority notices
8. **CTA:** "View Full Forecast" button

---

## 4. Cron Jobs & Automation

### 4.1 Main Daily Workflow

**File:** `.github/workflows/scrape-data.yml`
**Schedule:** `0 2 * * *` (2 AM UTC daily)

**Execution Order:**
1. DFO Regulations - Area 19 (Victoria, Sidney)
2. DFO Regulations - Area 20 (Sooke, Port Renfrew)
3. Fishing Reports (FishingVictoria.com)
4. DFO Fishery Notices
5. Send Scheduled Notifications

**Configuration:**
- Total timeout: 15 minutes
- Each step has `continue-on-error: true`
- Generates markdown summary with emoji status

### 4.2 Manual Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `scripts/scrape-historical-reports.ts` | Scrape 20 weeks of reports | `pnpm tsx scripts/scrape-historical-reports.ts` |
| `scripts/scrape-and-update-regulations.ts` | Scrape all/specific areas | `pnpm tsx scripts/scrape-and-update-regulations.ts [areaId]` |
| `scripts/migrate-notification-preferences.ts` | One-time preference migration | `npx tsx scripts/migrate-notification-preferences.ts` |

### 4.3 GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `scrape-data.yml` | Daily cron + manual | Data scraping & notifications |
| `claude-code-review.yml` | PR opened/sync | AI code review |
| `claude.yml` | @claude mentions | AI interaction |

---

## 5. Database Schema

### 5.1 Core Tables

#### forecast_cache
Caches weather forecast data to reduce API calls.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| cache_key | TEXT | Unique: "location\|hotspot\|species\|date" |
| location_name | TEXT | Location identifier |
| hotspot_name | TEXT | Specific hotspot |
| species_name | TEXT | Optional species filter |
| coordinates | JSONB | {lat, lon} |
| forecast_data | JSONB | OpenMeteoDailyForecast array |
| open_meteo_data | JSONB | ProcessedOpenMeteoData |
| tide_data | JSONB | TideData |
| expires_at | TIMESTAMPTZ | Cache expiration |
| hit_count | INTEGER | Performance metric |

#### fishing_regulations
Main regulations registry by area.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| area_id | TEXT | DFO area code (19, 20, etc.) |
| area_name | TEXT | Human-readable name |
| official_url | TEXT | DFO regulations page |
| last_updated | TIMESTAMPTZ | Last scrape time |
| page_modified_date | DATE | DFO meta modification |
| is_active | BOOLEAN | Active flag |

#### species_regulations
Species-specific rules linked to regulations.

| Column | Type | Description |
|--------|------|-------------|
| regulation_id | UUID | FK to fishing_regulations |
| species_id | TEXT | Machine identifier |
| species_name | TEXT | Display name |
| daily_limit | TEXT | e.g., "2" |
| min_size | TEXT | e.g., "62cm" |
| status | ENUM | Open/Closed/Non Retention/Restricted |
| gear | TEXT | e.g., "Barbless hook and line" |
| season | TEXT | e.g., "June - October" |

#### fishing_reports
Weekly fishing reports from FishingVictoria.com.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| location | TEXT | Location name |
| week_ending | DATE | Report week |
| report_data | JSONB | Complete report structure |
| is_active | BOOLEAN | Versioning flag |

#### notification_preferences
User notification settings (1:1 with auth.users).

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | FK to auth.users |
| notification_enabled | BOOLEAN | Master switch |
| email_enabled | BOOLEAN | Email delivery |
| notification_frequency | TEXT | daily/weekly |
| location_lat/lng | NUMERIC | User location |
| favorite_species | TEXT[] | Species IDs |
| fishing_score_threshold | INTEGER | 0-100 |
| last_notification_sent | TIMESTAMPTZ | Tracking |

#### dfo_fishery_notices
DFO fishing and safety notices.

| Column | Type | Description |
|--------|------|-------------|
| notice_number | VARCHAR | e.g., "FN1227" |
| dfo_category | VARCHAR | Official category |
| notice_type | VARCHAR | closure/opening/alert/etc. |
| priority_level | VARCHAR | critical/high/medium/low |
| areas | INTEGER[] | [19, 20] |
| species | TEXT[] | Affected species |
| is_biotoxin_alert | BOOLEAN | Safety flag |

### 5.2 RLS Policies

| Table | SELECT | INSERT/UPDATE |
|-------|--------|---------------|
| fishing_regulations | Public (active) | Authenticated |
| species_regulations | Public | Authenticated |
| fishing_reports | Public (active) | Authenticated |
| notification_preferences | Own record only | Own record only |
| dfo_fishery_notices | Authenticated | Service role only |

### 5.3 Entity Relationships

```
auth.users (Supabase Auth)
├── notification_preferences (1:1)
├── user_dfo_notice_history (1:N)
└── user_metadata (preferences)

fishing_regulations (1:N)
├── species_regulations
├── regulation_general_rules
└── regulation_protected_areas

dfo_fishery_notices (1:N)
└── user_dfo_notice_history
```

---

## 6. API Integrations

### 6.1 External APIs

| API | Purpose | Rate Limiting | Caching |
|-----|---------|---------------|---------|
| **Open Meteo** | Weather forecasts | None | DB-backed (6h) |
| **CHS Tides** | Marine/tide data | 350ms/req | In-memory (5m) |
| **DFO Scraper** | Regulations | 2s/area | Database |
| **Mapbox GL** | Map tiles | Built-in | Browser cache |
| **OpenWeatherMap** | Weather layers | 60 calls/min | Tile cache |
| **Windy** | Weather visualization | Built-in | SDK cache |
| **Resend** | Email service | 1s batch delay | None |
| **OpenAI** | Report parsing | None | None |
| **Supabase** | Database | None | Forecast table |

### 6.2 Open Meteo API

**Files:** `src/app/utils/openMeteoApi.ts`

**Endpoints:**
- Forecast: `api.open-meteo.com/v1/forecast`
- Historical: `archive-api.open-meteo.com/v1/archive`

**Data Fetched:**
- 15-minute intervals: temp, humidity, pressure, wind, visibility, lightning, CAPE
- Daily: sunrise, sunset, min/max temperature
- 14 days forecast + historical data

### 6.3 CHS Tide API

**File:** `src/app/utils/chsTideApi.ts`

**Endpoint:** `api.iwls-sine.azure.cloud-nuage.dfo-mpo.gc.ca/api/v1`

**Data:**
- Water level predictions (height in meters)
- Tide events (high/low)
- Calculated currents (speed, direction, type)

**Station Mapping:** 13 BC fishing locations mapped to CHS station IDs

### 6.4 Email Service (Resend)

**File:** `src/lib/email-service.ts`

**Features:**
- Single and batch email sending
- 20 emails per batch with 1s delay
- Development mode logging
- Rate limiting built-in

---

## 7. Application Architecture

### 7.1 Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.3.4 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 + PostCSS |
| UI Components | shadcn/ui (Radix UI primitives) |
| Charts | Recharts |
| Maps | Mapbox GL + Windy API |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL |
| Analytics | Mixpanel |
| Icons | Lucide React |
| Package Manager | pnpm |

### 7.2 Application Flow

```
User opens app
  ↓
HomePage loads default location (UserPreferencesService)
  ↓
URL redirected with location params
  ↓
NewForecastContent mounts
  ↓
ForecastCacheService.getCachedForecast()
  ├─ Cache hit → Display + background refresh
  └─ Cache miss → Fetch fresh → Store in cache
  ↓
Parallel fetch:
  ├─ Open Meteo API (14 days, 15-min)
  ├─ CHS Tide API (water levels)
  └─ generateOpenMeteoDailyForecasts()
  ↓
useAuthForecast applies auth gates:
  ├─ Authenticated → 14-day forecast
  └─ Anonymous → 3 days (blur days 4-14)
  ↓
Components render with forecast data
```

### 7.3 Context Providers

| Provider | Purpose |
|----------|---------|
| AuthProvider | User session, auth methods |
| MixpanelProvider | Analytics tracking |
| UnitPreferencesProvider | Unit conversions (kph/mph, C/F) |

### 7.4 Key Files Reference

**Core Application:**
- Root layout: `src/app/layout.tsx`
- Main page: `src/app/page.tsx`
- Settings: `src/app/profile/notification-settings/page.tsx`

**Contexts:**
- `src/contexts/auth-context.tsx`
- `src/contexts/mixpanel-context.tsx`
- `src/contexts/unit-preferences-context.tsx`

**Services:**
- `src/lib/user-preferences.ts`
- `src/lib/notification-service.ts`
- `src/lib/email-service.ts`

**Utilities:**
- `src/app/utils/openMeteoApi.ts`
- `src/app/utils/fishingCalculations.ts`
- `src/app/utils/chsTideApi.ts`
- `src/app/utils/forecastCacheService.ts`

**Components:**
- `src/app/components/forecast/` - 22 forecast-related files
- `src/app/components/auth/` - Authentication UI
- `src/app/components/notifications/` - Notification settings UI

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=
NEXT_PUBLIC_OPENWEATHERMAP_API_KEY=
NEXT_PUBLIC_WINDY_API_KEY=

# Email
RESEND_API_KEY=

# AI
OPENAI_API_KEY=

# Cron
CRON_SECRET=

# Analytics
NEXT_PUBLIC_MIXPANEL_TOKEN=

# App
APP_URL=
```

---

*Last updated: 2025-11-25*
