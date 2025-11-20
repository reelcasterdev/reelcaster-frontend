# Automated Notification System

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [User Preferences](#user-preferences)
5. [Notification Logic](#notification-logic)
6. [Email Templates](#email-templates)
7. [API Endpoints](#api-endpoints)
8. [Automation](#automation)
9. [Setup Guide](#setup-guide)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)

---

## Overview

ReelCaster's Automated Notification System sends personalized fishing alerts to users based on their preferences and weather forecasts. The system runs daily via GitHub Actions, evaluating conditions for each user and sending emails only when thresholds are met.

### Key Features

- **Scheduled Delivery**: Daily or weekly notifications sent automatically
- **Location-Based**: User-selected coordinates with adjustable radius (5-100km)
- **Species-Specific**: Personalized fishing scores for favorite species
- **Weather Thresholds**: 11 customizable weather metrics
- **Safety Alerts**: Thunderstorm, gale, and pressure drop warnings
- **Regulation Updates**: Bundled regulatory change notifications
- **Smart Filtering**: Only sends when conditions meet user criteria

---

## System Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub Actions Workflow                     │
│                    (Daily at 2 AM UTC)                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              /api/notifications/send-scheduled                   │
│                  (Notification Orchestrator)                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│  Supabase    │ │ Open Meteo  │ │   Resend     │
│  Database    │ │ Weather API │ │ Email Service│
└──────────────┘ └─────────────┘ └──────────────┘
```

### Data Flow

1. **Trigger**: GitHub Actions cron job fires daily
2. **Fetch Users**: Query `notification_preferences` for enabled users
3. **For Each User**:
   - Check if notification is due (frequency + last_sent)
   - Fetch 7-day forecast for user's location
   - Calculate fishing scores for user's species
   - Evaluate weather thresholds
   - Fetch regulation changes (if enabled)
   - Determine if email should be sent
4. **Batch Send**: Send emails in batches of 20 via Resend
5. **Update**: Record `last_notification_sent` timestamp

---

## Database Schema

### `notification_preferences` Table

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification Toggles
  notification_enabled BOOLEAN DEFAULT false,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT false,

  -- Schedule
  notification_frequency TEXT DEFAULT 'weekly' CHECK (notification_frequency IN ('daily', 'weekly')),
  notification_time TIME DEFAULT '06:00:00',
  timezone TEXT DEFAULT 'America/Vancouver',

  -- Location (single location for Phase 1)
  location_lat NUMERIC(10, 7),
  location_lng NUMERIC(10, 7),
  location_radius_km NUMERIC(5, 2) DEFAULT 25.0,
  location_name TEXT,

  -- Species Preferences
  favorite_species TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Weather Thresholds
  wind_speed_threshold_kph NUMERIC(5, 2) DEFAULT 30.0,
  wave_height_threshold_m NUMERIC(4, 2) DEFAULT 1.5,
  precipitation_threshold_mm NUMERIC(5, 2) DEFAULT 5.0,
  temperature_min_c NUMERIC(4, 1) DEFAULT 5.0,
  temperature_max_c NUMERIC(4, 1) DEFAULT 25.0,
  fishing_score_threshold INTEGER DEFAULT 60 CHECK (fishing_score_threshold >= 0 AND fishing_score_threshold <= 100),
  uv_index_threshold INTEGER DEFAULT 6 CHECK (uv_index_threshold >= 0 AND uv_index_threshold <= 11),

  -- Alert Toggles
  alert_on_thunderstorm BOOLEAN DEFAULT true,
  alert_on_gale_warning BOOLEAN DEFAULT true,
  alert_on_pressure_drop BOOLEAN DEFAULT true,

  -- Regulatory Notifications
  include_regulation_changes BOOLEAN DEFAULT true,

  -- Tracking
  last_notification_sent TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)

Users can only access their own preferences:

```sql
-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- View own preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Insert own preferences
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update own preferences
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Delete own preferences
CREATE POLICY "Users can delete own notification preferences"
  ON notification_preferences FOR DELETE
  USING (auth.uid() = user_id);
```

---

## User Preferences

### UI Components

#### 1. **Notification Preferences Form** (`notification-preferences-form.tsx`)

Main container component that orchestrates all preference sections:
- Master enable/disable toggle
- Notification type selection (email/push)
- Schedule configuration (frequency, time, timezone)
- Integrates all sub-components

#### 2. **Location Selector** (`notification-location-selector.tsx`)

Interactive Mapbox map for location selection:
- Draggable center marker
- Adjustable radius circle (5-100km slider)
- Visual feedback for coverage area
- Displays coordinates and radius

#### 3. **Species Selector** (`species-selector.tsx`)

Multi-select interface for favorite species:
- 8 supported species with descriptions
- Visual card layout with icons
- "Select All" / "Clear All" buttons
- Shows selection count

#### 4. **Weather Threshold Sliders** (`weather-threshold-sliders.tsx`)

Comprehensive threshold controls:
- **Fishing Score**: 0-100 (primary threshold)
- **Wind Speed**: 0-60 km/h
- **Wave Height**: 0-5m
- **Precipitation**: 0-20mm/h
- **Temperature Range**: -5 to 35°C (min/max)
- **UV Index**: 0-11
- **Safety Alerts**: Checkboxes for thunderstorm, gale, pressure drop
- "Reset to Defaults" button

#### 5. **Regulatory Preferences** (`regulatory-preferences.tsx`)

Simple toggle for regulation change notifications:
- Enable/disable checkbox
- Information about bundled delivery
- Examples of tracked changes

### Default Values

```typescript
{
  notification_enabled: false,
  email_enabled: true,
  push_enabled: false,
  notification_frequency: 'weekly',
  notification_time: '06:00:00',
  timezone: 'America/Vancouver',
  location_lat: 48.4284, // Victoria, BC
  location_lng: -123.3656,
  location_radius_km: 25.0,
  favorite_species: [],
  wind_speed_threshold_kph: 30.0,
  wave_height_threshold_m: 1.5,
  precipitation_threshold_mm: 5.0,
  temperature_min_c: 5.0,
  temperature_max_c: 25.0,
  fishing_score_threshold: 60,
  uv_index_threshold: 6,
  alert_on_thunderstorm: true,
  alert_on_gale_warning: true,
  alert_on_pressure_drop: true,
  include_regulation_changes: true,
}
```

---

## Notification Logic

### Core Service (`notification-service.ts`)

#### 1. **User Filtering**

```typescript
getUsersWithNotificationsEnabled()
```
- Fetches all users from `auth.users`
- Joins with `notification_preferences` where `notification_enabled = true` and `email_enabled = true`
- Returns array of `UserWithPreferences` objects

#### 2. **Notification Timing**

```typescript
shouldSendNotification(lastSent: string | null, frequency: 'daily' | 'weekly')
```
- **Daily**: Send if >23 hours since last notification
- **Weekly**: Send if >167 hours (6.9 days) since last notification
- **Never sent**: Always returns true

#### 3. **Forecast Fetching**

```typescript
fetchForecastForLocation(lat: number, lng: number)
```
- Calls Open Meteo API for 7-day forecast
- Returns 15-minute interval weather data
- Includes temperature, wind, precipitation, pressure, etc.

#### 4. **Daily Score Calculation**

```typescript
calculateDailyScores(forecast: ProcessedOpenMeteoData, species: string[])
```
- Groups 15-minute data by day
- For each species, calculates scores using `calculateOpenMeteoFishingScore()`
- Averages scores across species and time periods
- Returns array of 7 `ForecastDay` objects with:
  - Date
  - Score (0-100)
  - Average temperature
  - Average wind speed
  - Total precipitation
  - Conditions label (Excellent/Good/Fair/Poor)

#### 5. **Weather Threshold Checking**

```typescript
checkWeatherThresholds(minutelyData: OpenMeteo15MinData[], thresholds: NotificationPreferences)
```
- Iterates through all 15-minute data points
- Checks for safety alerts (thunderstorm, gale, pressure drop)
- Counts hours that meet ALL weather thresholds:
  - Wind ≤ threshold
  - Precipitation ≤ threshold
  - Temperature within min/max range
- Returns:
  - `meetsThresholds`: boolean (any hours meet criteria)
  - `alerts`: array of weather alerts
  - `bestHours`: array of qualifying hours

#### 6. **Notification Decision**

```typescript
generateNotificationForUser(user: UserWithPreferences)
```

A notification is sent ONLY if ALL conditions are met:
1. ✅ Notification is due (based on frequency + last_sent)
2. ✅ User has location set
3. ✅ Best day's fishing score ≥ user's threshold
4. ✅ Weather conditions meet user's thresholds

If any condition fails, notification is skipped with a reason logged.

#### 7. **Regulation Changes**

```typescript
fetchRegulationChanges(lastNotificationSent: string | null)
```
- Queries `fishing_regulations` table for updates since last notification
- Returns array of `RegulationChange` objects
- **Note**: Currently returns empty array; full implementation requires a dedicated `regulation_changes` tracking table

---

## Email Templates

### Scheduled Notification Template (`scheduled-notification.ts`)

#### Structure

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Your Fishing Forecast - ReelCaster</title>
  </head>
  <body>
    <!-- Header -->
    <div style="gradient background, blue">
      <h1>Great Fishing Ahead!</h1>
      <p>Your personalized forecast for {location}</p>
    </div>

    <!-- Best Day Alert -->
    <div style="highlight box">
      <h2>Best Day: {date}</h2>
      <div>Score: {score} - {conditions}</div>
      <div>Temp: {temp}°C | Wind: {wind} km/h | Rain: {rain}mm</div>
    </div>

    <!-- Species Info (if selected) -->
    <div>Forecast optimized for: {species1, species2...}</div>

    <!-- Weather Alerts (if any) -->
    <div>⚠️ Weather Alerts: {alerts}</div>

    <!-- 7-Day Forecast Table -->
    <table>
      {for each day: date, score, conditions}
    </table>

    <!-- Regulation Changes (if any) -->
    <div>📋 Regulation Updates: {changes}</div>

    <!-- CTA Button -->
    <button>View Full Forecast</button>

    <!-- Footer -->
    <div>
      Manage Preferences | Unsubscribe
    </div>
  </body>
</html>
```

#### Subject Line Generation

```typescript
generateNotificationSubject(data: ScheduledNotificationEmailData): string
```

Format: `🎣 {conditions} Fishing Expected {day} - {score}/100 in {location}`

Examples:
- `🎣 Excellent Fishing Expected Saturday - 87/100 in Victoria, BC`
- `🎣 Good Fishing Expected Tuesday - 65/100 in Sooke, Port Renfrew`

#### Color Coding

- **Excellent (75-100)**: Green (#10b981)
- **Good (60-74)**: Blue (#3b82f6)
- **Fair (40-59)**: Amber (#f59e0b)
- **Poor (0-39)**: Red (#ef4444)

---

## API Endpoints

### 1. **Send Scheduled Notifications**

**Endpoint**: `POST /api/notifications/send-scheduled`

**Authentication**: Bearer token with `CRON_SECRET`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {CRON_SECRET}
```

**Response**:
```json
{
  "success": true,
  "message": "Notifications sent successfully",
  "stats": {
    "total": 8,
    "sent": 3,
    "skipped": 5,
    "failed": 0,
    "skipReasons": {
      "Notification not due yet": 2,
      "Best fishing score (45) below threshold (60)": 2,
      "Weather conditions do not meet thresholds": 1
    }
  }
}
```

**Process**:
1. Verify CRON_SECRET
2. Fetch users with notifications enabled
3. Generate notification data for each user
4. Filter users who meet criteria
5. Generate personalized emails
6. Send in batches of 20
7. Update `last_notification_sent` timestamps
8. Return stats summary

### 2. **Preview Notification**

**Endpoint**: `GET /api/notifications/preview`

**Authentication**: User's JWT token

**Headers**:
```
Authorization: Bearer {user_jwt_token}
```

**Response**:
```json
{
  "success": true,
  "preview": {
    "subject": "🎣 Excellent Fishing Expected Saturday - 87/100 in Victoria, BC",
    "html": "<html>...</html>"
  },
  "metadata": {
    "bestDayScore": 87,
    "forecastDays": 7,
    "hasAlerts": false,
    "hasRegulationChanges": false,
    "species": ["Chinook Salmon", "Coho Salmon"]
  }
}
```

**Use Case**: Allows users to preview their notification email based on current preferences and actual forecast data without actually sending it.

---

## Automation

### GitHub Actions Workflow

**File**: `.github/workflows/scrape-data.yml`

**Schedule**: Daily at 2 AM UTC (6 PM PST previous day)

**Notification Step**:
```yaml
- name: Send Scheduled Notifications
  id: send_notifications
  run: |
    echo "📧 Sending scheduled fishing notifications..."

    curl -X POST "${{ secrets.APP_URL }}/api/notifications/send-scheduled" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
      --fail \
      --show-error \
      --max-time 600 || echo "notifications_failed=true" >> $GITHUB_OUTPUT
  continue-on-error: true
```

**Workflow Sequence**:
1. Scrape DFO Regulations (Area 19 & 20)
2. Scrape Fishing Reports
3. **Send Scheduled Notifications** ← NEW
4. Create summary report

**Required GitHub Secrets**:
- `APP_URL`: Production app URL (e.g., `https://reelcaster.com`)
- `CRON_SECRET`: Secret key matching local `CRON_SECRET` env var

---

## Setup Guide

### 1. Environment Variables

Add to `.env.local`:
```env
# Mapbox Access Token (for location selector map)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijoie...}

# Cron Secret (for securing scheduled notification endpoint)
# Generate with: openssl rand -base64 32
CRON_SECRET=abc123randomsecret456
```

### 2. GitHub Secrets

Add to repository settings (Settings > Secrets and variables > Actions):
```
CRON_SECRET=abc123randomsecret456  # Same value as local
APP_URL=https://reelcaster.com      # Your production URL
```

### 3. Database Migration

Run the database migrations to create the `notification_preferences` table:
```bash
# Migrations are already applied via Supabase MCP during implementation
# Verify table exists in Supabase Dashboard > Table Editor
```

### 4. Data Migration (One-time)

Migrate existing user preferences from `auth.users.raw_user_meta_data` to new table:
```bash
npx tsx scripts/migrate-notification-preferences.ts
```

Expected output:
```
🚀 Starting notification preferences migration...

📊 Found 8 users to migrate

Processing user: user@example.com
  ✅ Successfully migrated preferences

=================================================
📈 Migration Summary:
=================================================
✅ Migrated:  8 users
⏭️  Skipped:   0 users (already migrated)
❌ Errors:    0 users
=================================================

🎉 Migration completed successfully!
```

### 5. Mapbox Setup

1. Create account at https://account.mapbox.com/
2. Navigate to Access Tokens
3. Create a new token with default scopes
4. Copy token to `NEXT_PUBLIC_MAPBOX_TOKEN`
5. **Free tier**: 50,000 map loads/month

### 6. Verify Setup

1. **Test UI**: Navigate to `/profile/notification-settings`
   - Map should load
   - All components should render
2. **Test Preview**: Set preferences, call preview API
3. **Test Manual Send**: Trigger workflow manually in GitHub Actions

---

## Testing

### Manual Testing

#### 1. **Preview Notification**

Test that email generation works without sending:

```bash
# Get user JWT token from browser (inspect auth header)
TOKEN="your-jwt-token"

curl -X GET "https://your-app.com/api/notifications/preview" \
  -H "Authorization: Bearer $TOKEN"
```

Expected: Returns preview HTML and metadata

#### 2. **Manual Workflow Trigger**

Test full notification flow:

1. Go to GitHub > Actions > Daily Data Scraping
2. Click "Run workflow"
3. Enable all options
4. Click "Run workflow"
5. Monitor execution logs
6. Check email inbox

#### 3. **Test with Low Thresholds**

To guarantee a notification is sent:

1. Set `fishing_score_threshold` to 0
2. Set all weather thresholds to maximum values
3. Wait for daily workflow or trigger manually
4. Should receive notification for best day

### Automated Testing (Future)

Potential test cases to implement:

```typescript
// Unit Tests
describe('Notification Service', () => {
  test('shouldSendNotification - daily frequency', () => {
    // Test 23 hour logic
  });

  test('calculateDailyScores - multiple species', () => {
    // Test score averaging
  });

  test('checkWeatherThresholds - all conditions', () => {
    // Test threshold evaluation
  });
});

// Integration Tests
describe('Notification API', () => {
  test('POST /api/notifications/send-scheduled - authorized', () => {
    // Test with valid CRON_SECRET
  });

  test('POST /api/notifications/send-scheduled - unauthorized', () => {
    // Test with invalid CRON_SECRET
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. **No emails being sent**

**Symptoms**: Workflow runs successfully but no emails arrive

**Checklist**:
- ✅ Users have `notification_enabled = true`?
- ✅ Users have `email_enabled = true`?
- ✅ Users have location set (lat/lng)?
- ✅ Fishing scores meet user thresholds?
- ✅ Weather conditions meet user thresholds?
- ✅ Check workflow logs for skip reasons
- ✅ Verify Resend API key is valid

**Debug**:
```sql
-- Check active users
SELECT user_id, notification_enabled, email_enabled, location_lat, location_lng, fishing_score_threshold
FROM notification_preferences
WHERE notification_enabled = true;

-- Check last notification times
SELECT user_id, last_notification_sent, notification_frequency
FROM notification_preferences
WHERE notification_enabled = true;
```

#### 2. **Map not loading in preferences**

**Symptoms**: Blank space where map should be

**Solutions**:
- Verify `NEXT_PUBLIC_MAPBOX_TOKEN` is set
- Check browser console for Mapbox errors
- Verify token has correct permissions
- Check Mapbox account usage limits

#### 3. **Workflow failing with 401 Unauthorized**

**Symptoms**: GitHub Actions logs show "Unauthorized" error

**Solutions**:
- Verify `CRON_SECRET` matches between:
  - Local `.env.local`
  - GitHub Secrets
  - API endpoint verification
- Regenerate secret if mismatch

#### 4. **Emails have no data / blank sections**

**Symptoms**: Email arrives but missing forecast data

**Checklist**:
- ✅ Open Meteo API responding?
- ✅ User's location valid coordinates?
- ✅ Forecast data being fetched successfully?
- ✅ Check API endpoint logs

#### 5. **Notifications sending too frequently**

**Symptoms**: Users receiving multiple emails per day

**Debug**:
```sql
-- Check last_notification_sent timestamps
SELECT user_id, last_notification_sent, notification_frequency
FROM notification_preferences
WHERE notification_enabled = true
ORDER BY last_notification_sent DESC;
```

**Solution**: Verify `updateLastNotificationSent()` is being called after successful sends

---

## Future Enhancements

### Phase 2: Push Notifications

- Implement web push notifications via service workers
- Add push subscription management
- Enable `push_enabled` toggle
- Send both email + push when conditions are met

### Phase 3: Multiple Locations

- Update schema to support many locations per user
- Create junction table: `user_notification_locations`
- Update UI to manage multiple locations
- Send separate notifications for each location

### Phase 4: Advanced Features

- **SMS Notifications**: Integrate Twilio for SMS alerts
- **Custom Notification Times**: Per-location notification times
- **Tide Integration**: Add tide height/current thresholds
- **Historical Tracking**: Track notification accuracy vs. actual conditions
- **User Feedback**: "Was this forecast accurate?" button in emails
- **Machine Learning**: Personalize thresholds based on user behavior

### Phase 5: Analytics

- Track email open rates (Resend webhooks)
- Track link clicks (forecast page visits from emails)
- Notification effectiveness dashboard for admins
- User engagement metrics

---

## Maintenance

### Regular Tasks

**Weekly**:
- Monitor GitHub Actions workflow success rate
- Check Resend email sending stats
- Review skip reason logs for common issues

**Monthly**:
- Review Mapbox usage (should be well under 50k/month)
- Review Resend usage (100 emails/day, 3,000/month)
- Check for users with invalid locations

**Quarterly**:
- Review notification thresholds vs. user engagement
- Consider adjusting default values based on data
- Update species list if new species added

### Monitoring Queries

```sql
-- Users with notifications enabled
SELECT COUNT(*) FROM notification_preferences WHERE notification_enabled = true;

-- Notification frequency distribution
SELECT notification_frequency, COUNT(*)
FROM notification_preferences
WHERE notification_enabled = true
GROUP BY notification_frequency;

-- Users without location set
SELECT COUNT(*) FROM notification_preferences
WHERE notification_enabled = true
AND (location_lat IS NULL OR location_lng IS NULL);

-- Recent notifications sent
SELECT COUNT(*), MAX(last_notification_sent), MIN(last_notification_sent)
FROM notification_preferences
WHERE last_notification_sent IS NOT NULL;
```

---

## Additional Resources

- **Mapbox GL JS Documentation**: https://docs.mapbox.com/mapbox-gl-js/
- **Open Meteo API Docs**: https://open-meteo.com/en/docs
- **Resend Documentation**: https://resend.com/docs
- **GitHub Actions Cron Syntax**: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule

---

**Last Updated**: 2025-01-12
**Version**: 1.0.0
**Author**: ReelCaster Development Team
