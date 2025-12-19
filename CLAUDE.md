# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReelCaster Frontend is a Next.js 15 application that provides fishing forecasts and historical data analysis for British Columbia, Canada. It integrates multiple APIs to deliver weather, marine conditions, tide data, and fishing statistics to help anglers make informed decisions.

## Development Commands

```bash
# Development with Turbopack (fast refresh)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 15.3.4 with App Router
- **Language**: TypeScript with strict mode
- **UI Library**: shadcn/ui (New York style) with Radix UI primitives
- **Styling**: Tailwind CSS v4 with PostCSS
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **Date Handling**: date-fns v4 and react-day-picker

### Project Structure

```
src/app/
├── components/         # Feature-specific components
│   ├── auth/          # Authentication components (auth-button, auth-dialog, user-menu)
│   ├── charts/        # Data visualization (mobile-friendly-chart)
│   ├── common/        # Shared components (sidebar, loading, error states)
│   ├── forecast/      # Active forecast UI (day-outlook, hourly-chart, weather-conditions, etc.)
│   ├── location/      # Location selection (compact-location-selector)
│   └── ui/           # Enhanced UI components
├── utils/            # API integrations and utilities
├── profile/          # User profile page
├── page.tsx          # Main application page (fishing forecast)
└── layout.tsx        # Root layout
```

### Key Routes

- `/` - Main fishing forecast page with location-based forecasts
- `/profile` - User profile and preferences page
- `/admin/send-email` - Admin email broadcast system (manual email sending)

## External APIs

The application integrates with multiple data sources:

1. **DFO API** (Department of Fisheries and Oceans)

   - Base URL: `https://open.canada.ca/data/api/3/action/datastore_search`
   - Provides fishing catch data and statistics

2. **Open Meteo API**

   - Forecast: `https://api.open-meteo.com/v1/forecast`
   - Historical: `https://archive-api.open-meteo.com/v1/archive`
   - Provides weather and marine conditions

3. **Tide API**

   - Uses proxy: `https://api.allorigins.win/get`
   - Original source: `https://www.dairiki.org/tides/`
   - Provides tide predictions

4. **iNaturalist API**

   - URL: `https://api.inaturalist.org/v1/observations`
   - Species observation data

5. **PACFIN**
   - URL: `https://pacfin.psmfc.org/`
   - Pacific Fisheries data

6. **OpenWeatherMap API** (Weather Tile Layers)
   - Tile URL: `https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png`
   - Provides visual weather overlays (temperature, precipitation, wind, clouds)
   - Used in forecast weather map for enhanced visualizations

## Interactive Weather Map

The forecast page includes an interactive weather map with **dual visualization options**: a custom Mapbox-based map and an official Windy-powered map. Users can toggle between both map types, with their preference saved locally.

### Map Options

#### 1. Mapbox Map (Custom Implementation)

**Features:**
- **Mapbox GL Base Map**: Dark theme matching app design
- **Hotspot Markers**: Clickable markers for all fishing locations in the selected area
- **Weather Tile Layers**: Real-time weather overlays from OpenWeatherMap
  - Temperature layer (heat map visualization)
  - Precipitation layer (rainfall intensity)
  - Wind layer (direction and speed)
  - Cloud cover layer
- **Layer Controls**: Toggle individual layers on/off with opacity adjustment
- **Timeline Scrubber**: Playback forecast data through 14-day period
- **Current Weather Display**: Real-time temp, wind, and precipitation metrics
- **Interactive Markers**: Click hotspot markers to change location and reload forecast
- **Wind Flow Visualization**: Custom animated directional arrows showing wind patterns over water (arrow length indicates wind intensity)

**Environment Variables:**
```env
# Required - Mapbox GL base map
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_access_token

# Optional - Weather tile layers (map works without this, but layers won't display)
NEXT_PUBLIC_OPENWEATHERMAP_API_KEY=your_openweathermap_api_key
```

**API Keys:**
- **Mapbox** (Free tier: 50,000 loads/month): https://account.mapbox.com/access-tokens/
- **OpenWeatherMap** (Free tier: 60 calls/min, 1M tiles/month): https://home.openweathermap.org/api_keys

**Technical Implementation:**
- Map Library: react-map-gl v8.x with Mapbox GL JS
- Tile Rendering: OpenWeatherMap raster tiles via Source/Layer
- Timeline Playback: Auto-advance through forecast data points (500ms intervals)
- Marker Interaction: Click handler updates URL params and triggers forecast reload
- Responsive Design: 500px height on mobile, maintains aspect ratio on desktop

#### 2. Windy Map (Official Integration)

**Features:**
- **Official Windy Visualization**: Industry-leading wind flow animations
- **Multiple Weather Layers**: Wind, temperature, precipitation, clouds, and 20+ other parameters
- **Hotspot Markers**: Same clickable markers as Mapbox version
- **Interactive Forecast**: Click anywhere on map for detailed point forecast
- **Timeline Controls**: Playback forecast data with Windy's built-in timeline
- **Layer Menu**: Access to Windy's full layer selection (bottom-right)

**Environment Variables:**
```env
# Required - Windy API key
NEXT_PUBLIC_WINDY_API_KEY=your_windy_api_key
```

**API Keys:**
- **Windy API** (Testing tier: Free for development only): https://api.windy.com/keys
  - **Note**: Professional tier required for production use (contact Windy for pricing)

**Technical Implementation:**
- Map Library: Leaflet 1.4.x (loaded via Windy CDN)
- API Integration: Windy Map Forecast API
- Custom Markers: Leaflet divIcon with custom styling
- Documentation: https://api.windy.com/map-forecast/docs

### Map Switcher

Users can toggle between map types using the **Map Type** switcher above the map. The selection is saved to `localStorage` and persists across sessions.

### Key Files

- **Switcher**: `src/app/components/forecast/forecast-map-switcher.tsx` - Main component with toggle
- **Mapbox Map**: `src/app/components/forecast/forecast-map.tsx` - Custom Mapbox implementation
- **Windy Map**: `src/app/components/forecast/forecast-map-windy.tsx` - Official Windy integration
- **Wind Particles**: `src/app/components/forecast/wind-particle-layer.tsx` - Custom wind animation (Mapbox only)
- **Integration**: `src/app/page.tsx` - Integrated between location selector and forecast header
- **Data Flow**: Uses existing `openMeteoData` state for timeline playback

## Important Development Notes

### Component Creation

When creating new components:

1. Check existing components in `src/app/components/` for patterns
2. Use shadcn/ui components from the ui directory as base
3. Follow the existing file naming convention (camelCase for files)
4. Place feature-specific components in appropriate subdirectories

### Active Components

Based on current usage analysis, these components are actively used:

**Auth Components:**

- `auth-button.tsx` - Authentication button with user menu
- `auth-dialog.tsx` - Login/signup dialog
- `forecast-section-overlay.tsx` - Auth overlay for forecast sections
- `user-menu.tsx` - User profile menu

**Charts:**

- `mobile-friendly-chart.tsx` - Data visualization component for charts

**Common:**

- `sidebar.tsx` - Main navigation sidebar
- `modern-loading-state.tsx` - Loading state component
- `error-state.tsx` - Error display component

**Forecast (Main UI):**

- `new-forecast-header.tsx` - Forecast page header
- `forecast-map-switcher.tsx` - Map type switcher with localStorage persistence
- `forecast-map.tsx` - Custom Mapbox GL map with OpenWeatherMap layers
- `forecast-map-windy.tsx` - Official Windy map integration with Leaflet
- `wind-particle-layer.tsx` - Custom canvas-based wind animation overlay
- `day-outlook.tsx` - Daily forecast overview
- `overall-score.tsx` - Fishing score summary
- `hourly-chart.tsx` - Hourly fishing score chart
- `hourly-table.tsx` - Detailed hourly data table
- `weather-conditions.tsx` - Current conditions display
- `species-regulations.tsx` - Fishing regulations info
- `fishing-reports.tsx` - Recent fishing reports

**Location:**

- `compact-location-selector.tsx` - Location picker component

### API Integration

When working with APIs:

1. Add new API utilities in `src/app/utils/`
2. Follow existing patterns for error handling and data transformation
3. Use TypeScript interfaces for API responses
4. Handle loading and error states using the common components

### State Management

- The app uses React state and props for state management
- Authentication context provides user state management
- Location selection is passed through URL parameters
- User preferences are managed via UserPreferencesService

### Styling Guidelines

- Use Tailwind CSS classes for styling
- CSS variables are defined for theming (check globals.css)
- Custom animations use tw-animate-css
- Follow the existing responsive design patterns

### TypeScript

- Strict mode is enabled
- `@typescript-eslint/no-explicit-any` is disabled (but avoid using `any` when possible)
- Define proper types for all props and API responses

## Testing

Currently, no testing framework is configured. When implementing tests:

- Consider adding Jest or Vitest for unit tests
- Add React Testing Library for component tests
- Place test files adjacent to source files with `.test.ts(x)` extension

## Application Features

The current application focuses on:

- **Fishing Forecasts**: Real-time weather and marine conditions analysis
- **Location-Based Data**: Multiple fishing locations in British Columbia
- **Species Information**: Fishing regulations and species data
- **User Authentication**: Profile management and personalized preferences
- **Email Broadcast System**: Admin tool for sending customized emails to all users
- **Responsive Design**: Mobile-first responsive interface

## Missing Configurations

The following are not currently set up but may be beneficial:

- Prettier for code formatting
- Husky for pre-commit hooks
- Environment variables for API endpoints
- Testing framework
- CI/CD pipeline configuration

## Automated Scraping System

ReelCaster uses two automated scraping systems to keep data fresh:

### 1. Fishing Reports Scraper

- **Source**: FishingVictoria.com weekly reports (published Sundays)
- **Parser**: Hybrid Cheerio+OpenAI approach (Cheerio extracts sections, AI parses natural language)
- **Cost Optimization**: ~25-40% token reduction via pre-extraction with Cheerio
- **Alternatives**: Claude Haiku (80% cheaper), Groq Llama (95% cheaper), pure Cheerio (impossible - unstructured text)
- **Frequency**: Daily check at 2 AM UTC (reports published Sundays)
- **Smart Logic**: Checks Sunday dates specifically, stops after finding latest report per location
- **Storage**: `fishing_reports` table (JSONB)
- **API**: `/api/fishing-reports/scrape?weeks=4` (PUBLIC - no auth required)

### 2. Regulations Scraper

- **Source**: DFO Pacific Region fishing regulations
- **Parser**: Cheerio (HTML parsing) - NO OpenAI needed
- **Areas**: 19 (Victoria, Sidney), 20 (Sooke, Port Renfrew)
- **Storage**: `fishing_regulations` + related tables (normalized)
- **API**: `/api/regulations/scrape?area_id=19`

### Key Files

- **API Endpoints**: `src/app/api/fishing-reports/scrape/` and `src/app/api/regulations/scrape/`
- **Scrapers**: `src/app/utils/scrape-fishing-report.ts` and `src/app/utils/dfoScraperV2.ts`
- **Manual Scripts**: `scripts/scrape-historical-reports.ts` and `scripts/scrape-and-update-regulations.ts`
- **GitHub Actions**: `.github/workflows/scrape-data.yml` (runs daily at 2 AM UTC)
- **Documentation**: `docs/scraping-system.md` (comprehensive guide)

### Adding New Areas/Locations

The system is fully dynamic - just add data to the database and the frontend automatically displays it.

**For Fishing Reports**: Update locations array in `/api/fishing-reports/scrape/route.ts`
**For Regulations**: Add to `AREA_NAMES` in `src/app/utils/dfoScraperV2.ts`, run scraper

See `docs/scraping-system.md` for detailed instructions.

## Email Broadcast System

ReelCaster includes an admin email broadcast system for sending customized emails to all registered users.

### Features

- **Manual Email Composition**: Admin can compose custom messages with rich text
- **Optional Data Sections**: Toggle inclusion of forecast, weather, tides, and fishing reports
- **Location-Specific Data**: Select location for forecast/tide data
- **Email Preview**: Preview emails before sending
- **Batch Sending**: Emails sent in batches of 20 to avoid rate limits
- **Progress Tracking**: Real-time progress and result reporting
- **Responsive Templates**: Beautiful, mobile-friendly HTML email templates

### Setup Requirements

**Environment Variables** (add to `.env.local`):
```env
# Supabase Service Role Key (for accessing auth.users)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Resend API Key (for email sending)
# Free tier: 100 emails/day, 3,000 emails/month
RESEND_API_KEY=your_resend_api_key
```

### Key Files

- **Admin Page**: `/admin/send-email` - Email composition interface
- **API Endpoints**:
  - `/api/admin/preview-email` - Generate email preview
  - `/api/admin/send-broadcast` - Send emails to all users
- **Email Service**: `src/lib/email-service.ts` - Email sending logic
- **Email Template**: `src/lib/email-templates/admin-broadcast.ts` - HTML template
- **Components**:
  - `src/app/components/admin/email-composer.tsx` - Composer UI
  - `src/app/components/admin/email-preview.tsx` - Preview modal
- **Documentation**: `docs/email-broadcast-system.md` - Comprehensive guide

### Usage

1. Navigate to `/admin/send-email`
2. Compose custom message
3. Select location and toggle data sections
4. Preview email
5. Send to all users

### Technology

- **Email Service**: Resend (https://resend.com)
- **Template Engine**: Custom TypeScript/HTML generator
- **Batch Processing**: 20 emails per batch with rate limiting
- **Authentication**: Supabase Admin API for user access

See `docs/email-broadcast-system.md` for detailed setup and usage instructions.

## Automated Notification System

ReelCaster features a comprehensive automated notification system that sends personalized fishing alerts to users based on their preferences and weather conditions.

### Features

- **Scheduled Notifications**: Daily or weekly emails sent automatically via GitHub Actions
- **Personalized Forecasts**: Location-specific forecasts based on user-selected coordinates and radius
- **Species-Specific Scoring**: Customized fishing scores for user's favorite species
- **Weather Threshold Filtering**: Only send when conditions meet user's preferences
- **Interactive Map Selection**: Mapbox GL integration for location and radius selection
- **Comprehensive Preferences**:
  - Location with adjustable radius (5-100km)
  - Multiple species selection
  - Weather thresholds (wind, waves, precipitation, temperature, UV, fishing score)
  - Safety alerts (thunderstorms, gale warnings, pressure drops)
  - Regulatory change notifications (bundled with scheduled emails)
  - Frequency (daily/weekly) and timezone settings

### Setup Requirements

**Environment Variables** (add to `.env.local`):
```env
# Mapbox Access Token (for location selector map)
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_access_token

# Cron Secret (for securing scheduled notification endpoint)
CRON_SECRET=your_cron_secret_key
```

**GitHub Secrets** (add to repository settings):
- `CRON_SECRET` - Same value as local CRON_SECRET for authenticating workflow requests

### Database Schema

- **`notification_preferences`** table stores all user preferences:
  - Notification toggles (enabled, email, push)
  - Schedule settings (frequency, time, timezone)
  - Location (lat/lng, radius, name)
  - Species preferences (array of IDs)
  - Weather thresholds (11 different metrics)
  - Alert toggles (3 safety alerts)
  - Tracking (last_notification_sent timestamp)

### Key Files

- **Settings Page**: `/profile/notification-settings` - User preferences interface
- **API Endpoints**:
  - `/api/notifications/send-scheduled` - Automated notification sending
  - `/api/notifications/preview` - Preview notification email
- **Core Logic**: `src/lib/notification-service.ts` - Notification generation logic
- **Email Template**: `src/lib/email-templates/scheduled-notification.ts` - Personalized HTML template
- **Components**:
  - `src/app/components/notifications/notification-preferences-form.tsx` - Main form
  - `src/app/components/notifications/notification-location-selector.tsx` - Mapbox map
  - `src/app/components/notifications/species-selector.tsx` - Multi-select species
  - `src/app/components/notifications/weather-threshold-sliders.tsx` - Threshold controls
  - `src/app/components/notifications/regulatory-preferences.tsx` - Regulation settings
- **Automation**: `.github/workflows/scrape-data.yml` - Runs daily at 2 AM UTC after scraping
- **Migration Script**: `scripts/migrate-notification-preferences.ts` - One-time data migration
- **Documentation**: `docs/notification-system.md` - Comprehensive architecture guide

### How It Works

1. **User Configuration**: Users set preferences at `/profile/notification-settings`
2. **Scheduled Trigger**: GitHub Actions workflow runs daily at 2 AM UTC
3. **User Filtering**: System fetches users with notifications enabled
4. **Notification Logic**:
   - Checks if notification is due (based on frequency and last_sent)
   - Fetches 7-day forecast for user's location
   - Calculates fishing scores for user's species
   - Checks weather conditions against user's thresholds
   - Fetches regulation changes since last notification (if enabled)
5. **Threshold Evaluation**: Only sends if conditions meet user's criteria:
   - Fishing score >= threshold
   - Weather within acceptable ranges
   - Best day identified
6. **Email Generation**: Creates personalized email with:
   - Best fishing day highlighted
   - 7-day forecast table
   - Weather alerts (if any)
   - Regulation changes (if any)
   - Species-specific optimizations
7. **Batch Sending**: Sends emails in batches of 20 via Resend
8. **Timestamp Update**: Updates `last_notification_sent` for next cycle

### Technology

- **Map Library**: Mapbox GL JS (react-map-gl wrapper)
- **Email Service**: Resend (shared with broadcast system)
- **Automation**: GitHub Actions (daily cron job)
- **Weather Data**: Open Meteo API (7-day forecasts)
- **Scoring Algorithm**: Species-specific 13-factor calculation
- **Database**: Supabase PostgreSQL with RLS policies

See `docs/notification-system.md` for detailed architecture and implementation guide.

## Custom Alert Engine

ReelCaster includes a custom alert engine that allows users to define multi-variable fishing condition triggers for specific GPS locations. When conditions match, users receive email notifications.

### Features

- **Multi-Variable Triggers**: Wind (speed, direction), Tide (phase, exchange), Pressure (trend, gradient), Water Temperature, Solunar Periods, Fishing Score
- **Logic Modes**: AND (all conditions must match) or OR (any condition can match)
- **Anti-Spam Protection**:
  - Configurable cooldown (1-168 hours between alerts)
  - Hysteresis/deadband logic to prevent flickering
  - Active hours filtering (only check during specified times)
- **Data Smoothing**: 3-point SMA for wind speed to filter gusts
- **Pressure Gradient**: 3-hour lookback for trend detection

### Database Schema

- **`user_alert_profiles`**: Custom alert definitions with JSONB triggers
- **`alert_history`**: Log of triggered alerts with condition snapshots

### Key Files

- **Core Engine**: `src/lib/custom-alert-engine.ts` - Evaluation logic, math functions, anti-spam
- **CRUD API**: `src/app/api/alerts/route.ts` - Create/read/update/delete profiles
- **Evaluation Endpoint**: `src/app/api/alerts/evaluate/route.ts` - Cron job endpoint
- **Email Template**: `src/lib/email-templates/custom-alert.ts` - Notification format
- **UI Page**: `src/app/profile/custom-alerts/page.tsx` - User interface
- **Components**:
  - `src/app/components/alerts/custom-alerts-list.tsx` - Profile list
  - `src/app/components/alerts/custom-alert-form.tsx` - Create/edit form
- **Automation**: `.github/workflows/custom-alerts.yml` - Runs every 30 minutes

### Trigger JSONB Structure

```json
{
  "wind": { "enabled": true, "speed_min": 0, "speed_max": 15, "direction_center": 270, "direction_tolerance": 45 },
  "tide": { "enabled": true, "phases": ["incoming", "high_slack"], "exchange_min": 1.5 },
  "pressure": { "enabled": true, "trend": "falling", "gradient_threshold": -2.0 },
  "water_temp": { "enabled": true, "min": 10.0, "max": 14.0 },
  "solunar": { "enabled": true, "phases": ["major", "minor"] },
  "fishing_score": { "enabled": true, "min_score": 70, "species": "chinook-salmon" }
}
```

### Math Functions

- **Wind Direction**: Angular difference with 360° wrap-around: `Δθ = 180 - | |θ_target - θ_current| - 180 |`
- **Pressure Gradient**: `ΔP = P₀ - P₋₃ₕ` (current vs 3 hours ago)
- **Tide Phase Detection**: Derivative-based: incoming (dH/dt > 0.05), outgoing (< -0.05), slack (|dH/dt| < 0.05)

### Technology

- **Polling Frequency**: Every 30 minutes via GitHub Actions
- **Weather Data**: Open Meteo API (reuses existing integration)
- **Tide Data**: CHS API (reuses existing integration)
- **Email Service**: Resend (shared infrastructure)
- **Database**: Supabase PostgreSQL with RLS policies

## Development Guidelines

When implementing a large new feature always create a detailed step by step plan as a task list. Ask me any clarifying question and then start implementation.
Always act like senior engineer and create smaller and reusable components. Make sure to use the existing components and utilities in the project.

**Important:** Many components in the codebase are legacy or unused. Refer to the "Active Components" section above to understand which components are currently in use before building upon existing functionality.

- for the docs always keep the names in file-name format.
- No need to create new document everytime we change something. We just need to update the CLAUDE.md with anything important regarding the system. and existing docs shouuld be updated if the changes were related.
- use supabase mcp when trying to access anything in supabase.