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
│   ├── charts/        # Data visualization (bar charts, weather charts)
│   ├── common/        # Shared components (loading, error, empty states)
│   ├── forecast/      # Fishing forecast UI components
│   ├── historical/    # Historical data display
│   ├── location/      # Location selection
│   └── ui/           # shadcn/ui base components
├── utils/            # API integrations and utilities
└── [routes]/         # Page routes (forecast, historical, data-comparison, etc.)
```

### Key Routes
- `/` - Home page with location selector
- `/forecast` - Main forecast page
- `/new-forecast` - Alternative forecast implementation
- `/historical` - Historical fishing data
- `/data-comparison` - Compare data across locations/time periods
- `/victoria-analysis` - Victoria-specific analysis

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
2. Use shadcn/ui components from `src/components/ui/` as base
3. Follow the existing file naming convention (camelCase for files)
4. Place feature-specific components in appropriate subdirectories

### API Integration
When working with APIs:
1. Add new API utilities in `src/app/utils/`
2. Follow existing patterns for error handling and data transformation
3. Use TypeScript interfaces for API responses
4. Handle loading and error states using the common components

### State Management
- The app uses React state and props for state management
- No global state management library is currently implemented
- Location selection is passed through URL parameters

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

## Missing Configurations
The following are not currently set up but may be beneficial:
- Prettier for code formatting
- Husky for pre-commit hooks
- Environment variables for API endpoints
- Testing framework
- CI/CD pipeline configuration