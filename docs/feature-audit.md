# ReelCaster Feature Audit

## Current Features

### Core

- **Fishing Forecast** — 14-day forecasts with fishing scores based on 13+ factors (wind, tide, pressure, temperature, UV, solunar, etc.). Supports 20+ BC locations and 11 species-specific scoring algorithms.
- **Interactive Weather Map** — Two map options: custom Mapbox map with weather overlays and animated wind flow, or official Windy map. Both have clickable hotspot markers and timeline playback.
- **Species Calendar** — Shows which species are open, restricted, or closed by location with links to official DFO regulation pages.
- **DFO Fishery Notices** — Filterable feed of closures, openings, biotoxin alerts, and safety notices from the Department of Fisheries and Oceans.
- **Historical Fishing Reports** — Weekly report archive from FishingVictoria.com with condition summaries, catch updates, and fishing tips.

### Catch Logging

- **Fish On Button** — Global floating button for 2-tap catch logging. Auto-captures GPS, speed, and heading.
- **Catch History** — View all logged catches with stats (total, landed, bites, monthly breakdown).
- **Offline Support** — Catches save locally first and sync to the server when back online.
- **Lure Library** — Predefined BC lures plus custom entries.

### Alerts & Notifications

- **Custom Alerts** — Define multi-condition triggers (wind, tide, pressure, water temp, solunar, fishing score) with AND/OR logic. Checked every 30 minutes. Anti-spam cooldowns prevent alert flooding.
- **Scheduled Notifications** — Daily or weekly personalized forecast emails based on location, species, and weather thresholds. Includes safety alerts for storms, gale winds, and pressure drops.
- **Admin Email Broadcast** — Compose and send custom emails to all users with optional forecast, weather, tide, and report data sections.

### User Account

- **Profile** — Default location, species, and unit preferences (metric/imperial with granular options).
- **Authentication** — Login/signup via Supabase with protected routes and session persistence.
- **Analytics** — Mixpanel tracking for page views, forecast loads, hotspot selections, and catch events.

### Work in Progress

- **14-Day Report** — Calendar view of extended forecast with export buttons (UI built, export logic not wired).
- **Favorite Spots** — Save and manage fishing locations (UI ready, backend incomplete).
- **Species ID Guide** — Fish reference with limits, seasons, and descriptions (UI with mock data).
- **Notification Center** — Centralized notification history page (UI mockup only).
- **Report Customization** — Toggle and reorder forecast widgets (UI framework only).

### Backend / Automated

- **Daily Scraping** — GitHub Actions runs at 2 AM UTC to scrape DFO regulations, fishing reports (AI-assisted parsing), and fishery notices.
- **Forecast Caching** — 6-hour server-side cache with background refresh for fast page loads.
- **Tide API Proxy** — Server-side proxy to the Canadian Hydrographic Service to avoid browser restrictions.
- **Email Templates** — Three responsive HTML templates for broadcasts, scheduled notifications, and custom alerts.
- **Solunar Calculations** — Sun/moon position math for major and minor fishing periods.

---

## Features Not Yet Built

### High Priority

1. **Push Notifications** — Browser push alerts for custom triggers and forecast updates instead of email only.
2. **Catch Log Analytics** — Charts and trends over time, best lures, success rate by conditions, catch location heatmap.
3. **Trip Planner** — Pick a date, location, and species to get a pre-trip briefing with best times and tide windows.
4. **Photo Logging** — Attach photos to catches with a gallery view in catch history.
5. **PDF/CSV Export** — Download forecast reports and catch history as files.
6. **PWA / Installable App** — Add-to-homescreen support with offline forecast caching.

### Maps & Visualization

7. **Real-Time Tide Chart** — Interactive tide graph with current position marker and fishing score overlay.
8. **Weather Radar** — Environment Canada radar and satellite imagery on the map.
9. **Tidal Current Animation** — Animated water flow visualization, important for trolling.
10. **Depth / Bathymetry Layer** — Seafloor contour overlay for bottom fishing.
11. **Boat Ramp Finder** — Map layer showing nearby launches, parking, and amenities.
12. **Species Sighting Map** — Show recent iNaturalist fish observations near fishing spots.
13. **Barometric Pressure Chart** — Dedicated pressure trend graph with fishing score correlation.
14. **Moon Phase Calendar** — Monthly moon phases with solunar fishing ratings per day.

### Community & Social

15. **Community Reports** — User-submitted fishing reports and hotspot ratings.
16. **Shared Catch Logs** — Friends can view each other's catches and trip summaries.
17. **Leaderboards & Gamification** — Badges, seasonal challenges, species collection tracker.
18. **Fishing Tournament Mode** — Live leaderboard, weigh-in logging, team tracking.
19. **Collaborative Trips** — Group trip logging where each angler logs their own catches.

### Smart Features

20. **AI Fishing Assistant** — Chat interface for questions like "Where should I fish for chinook this weekend?"
21. **Gear Recommendations** — Suggest lures and tackle based on current conditions and historical success.
22. **Regulation Change Alerts** — Detect and highlight what changed when regulations are updated.
23. **Algorithm Feedback** — Let users rate forecast accuracy to improve scoring over time.

### Data Integrations

24. **Hatchery Release Schedules** — Show stocking data and correlate with catch rates.
25. **River Flow & Water Levels** — Water Survey of Canada gauge data for freshwater spots.
26. **Fishing License Tracker** — Store license info and auto-check retention limits.
27. **Dark Sky / Light Pollution** — Night fishing planning layer on the map.

### Platform & Business

28. **Multi-Language Support** — French and other languages for broader reach.
29. **Apple Watch / Widgets** — Quick-glance fishing score on phone home screen or watch.
30. **Public API** — Expose fishing scores for third-party apps.
31. **Premium Subscription** — Gate advanced features behind a paid tier.
