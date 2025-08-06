# Daily Fishing Report Generation

This system generates and sends daily fishing reports to users who have opted in for email notifications. The reports show the best 3 fishing days in the next 7 days, using the same algorithm as the frontend UI.

## Architecture

### Components

1. **Report Generation Utility** (`src/app/utils/reportGeneration.ts`)
   - Uses the same fishing score algorithm as the frontend
   - Identifies the best 3 days out of the next 7 days
   - Generates structured report data

2. **Edge Functions**
   - `get-fishing-forecast`: Fetches weather data and calculates fishing scores
   - `send-daily-reports`: Generates and sends email reports to all subscribed users
   - `schedule-daily-reports`: Wrapper function for cron job scheduling

### Algorithm

The report generation uses the exact same algorithm as the frontend:
- Analyzes 7 days of forecast data
- For each day, finds the best 2-hour fishing window
- Ranks days by their best period's score
- Selects the top 3 days
- For each selected day, shows the top 3 2-hour periods

## Setup Instructions

### 1. Deploy Edge Functions

```bash
# Deploy the forecast fetching function
supabase functions deploy get-fishing-forecast

# Deploy the email sending function
supabase functions deploy send-daily-reports

# Deploy the scheduler function
supabase functions deploy schedule-daily-reports
```

### 2. Set Environment Variables

Add these to your Supabase project settings:

```bash
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SITE_URL=https://your-site-url.com
```

### 3. Configure Email Service

Ensure your Supabase project has email sending configured:
- Go to Authentication > Email Templates
- Customize the email templates if needed
- Verify SMTP settings are configured

### 4. Set Up Cron Job

You can use Supabase's pg_cron extension or an external service:

#### Using pg_cron (Recommended)

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily reports at 6 AM UTC
SELECT cron.schedule(
  'send-daily-fishing-reports',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/schedule-daily-reports',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('trigger', 'cron')
  );
  $$
);
```

#### Using External Cron Service

Services like cron-job.org, EasyCron, or GitHub Actions can call:
```
POST https://your-project.supabase.co/functions/v1/schedule-daily-reports
Authorization: Bearer YOUR_SERVICE_ROLE_KEY
Content-Type: application/json
```

## Email Report Format

The email includes:
- Header with location name
- Best 3 days in chronological order
- For each day:
  - Overall fishing score (0-10)
  - Quality label (Excellent/Good/Fair/Poor)
  - Top 3 2-hour fishing windows
  - Weather conditions for each period
  - Temperature and wind speed

## User Preferences

Users can manage their email preferences in the profile page:
- Enable/disable email forecasts
- Set preferred notification time
- Select timezone
- Choose favorite fishing location
- Select target species (affects scoring)

## Testing

### Test Individual Functions

```bash
# Test forecast generation
curl -X POST https://your-project.supabase.co/functions/v1/get-fishing-forecast \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"lat": 48.4284, "lon": -123.3656}'

# Test email sending (requires service role key)
curl -X POST https://your-project.supabase.co/functions/v1/send-daily-reports \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Local Testing

```bash
# Serve functions locally
supabase functions serve

# Test locally
curl -X POST http://localhost:54321/functions/v1/send-daily-reports \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Monitoring

Monitor the daily report generation:
1. Check Supabase Functions logs
2. Monitor email delivery rates
3. Track user engagement with reports

## Troubleshooting

Common issues:
- **No emails sent**: Check user_preferences table for users with email_forecasts=true
- **Email delivery fails**: Verify SMTP configuration and email service limits
- **Forecast data missing**: Check Open-Meteo API availability
- **Cron not running**: Verify pg_cron is enabled and scheduled correctly