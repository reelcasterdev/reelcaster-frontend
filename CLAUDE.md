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
│   ├── charts/        # Data visualization (shadcn-minutely-bar-chart, weather-data-chart)
│   ├── common/        # Shared components (sidebar, loading, error states)
│   ├── demo/          # Demo components (fishing-forecast, open-meteo-demo)
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
- `shadcn-minutely-bar-chart.tsx` - Minutely data visualization
- `weather-data-chart.tsx` - Weather data charts

**Common:**
- `sidebar.tsx` - Main navigation sidebar
- `modern-loading-state.tsx` - Loading state component
- `error-state.tsx` - Error display component

**Demo:**
- `fishing-forecast.tsx` - Demo forecast component
- `open-meteo-demo.tsx` - Weather API demo

**Forecast (Main UI):**
- `new-forecast-header.tsx` - Forecast page header
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
- **Responsive Design**: Mobile-first responsive interface

## Missing Configurations

The following are not currently set up but may be beneficial:

- Prettier for code formatting
- Husky for pre-commit hooks
- Environment variables for API endpoints
- Testing framework
- CI/CD pipeline configuration

## Development Guidelines

When implementing a large new feature always create a detailed step by step plan as a task list. Ask me any clarifying question and then start implementation.
Always act like senior engineer and create smaller and reusable components. Make sure to use the existing components and utilities in the project.

**Important:** Many components in the codebase are legacy or unused. Refer to the "Active Components" section above to understand which components are currently in use before building upon existing functionality.
