# Daily Fishing Notifications System

## Overview

The daily fishing notifications system sends personalized fishing forecasts to registered users every day at their preferred time. The system uses Supabase Edge Functions with cron job scheduling to process and deliver notifications via email.

## System Architecture

### Components

1. **Edge Function**: `daily-fishing-notifications`
   - Processes user data and generates fishing forecasts
   - Calculates optimal fishing times using weather data
   - Sends personalized email notifications

2. **Cron Job**: Scheduled to run daily at 6 AM Pacific Time
   - Automatically triggers the Edge Function
   - Uses `pg_cron` extension for reliable scheduling

3. **User Preferences**: Enhanced profile system
   - Email notification preferences
   - Favorite location settings
   - Notification timing customization
   - Timezone support

## Setup Instructions

### 1. Environment Variables

Set the following environment variables in your Supabase project:

```bash
# Required for email sending (using Resend)
RESEND_API_KEY=your_resend_api_key_here

# Supabase credentials (automatically available)
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Email Service Setup (Resend)

1. Sign up for a [Resend](https://resend.com) account
2. Create an API key in your Resend dashboard
3. Add the API key to your Supabase project secrets:
   ```sql
   SELECT vault.create_secret('your_resend_api_key', 'RESEND_API_KEY');
   ```

### 3. Email Domain Setup

The system currently uses the default Resend domain (`onboarding@resend.dev`). To use a custom domain:

1. Add your domain in the [Resend Dashboard](https://resend.com/domains)
2. Complete domain verification (DNS setup)
3. Update the Edge Function code:
```typescript
from: 'ReelCaster <noreply@yourdomain.com>',
```

**Current Configuration:**
- ✅ **API Key**: Configured with your Resend API key
- ✅ **From Address**: `ReelCaster <onboarding@resend.dev>` (default domain)
- ✅ **Website Links**: Point to `https://reelcaster-frontend.vercel.app`

### 4. Cron Job Configuration

The cron job is already configured to run at 6 AM Pacific Time daily:
```sql
-- Current schedule: 0 6 * * * (6:00 AM daily)
-- Modify if needed:
SELECT cron.alter_job(1, schedule := '0 7 * * *'); -- 7 AM instead
```

## How It Works

### User Eligibility

Users receive notifications if they meet ALL these criteria:
- ✅ Account is authenticated
- ✅ `notificationsEnabled` is `true`
- ✅ `emailForecasts` is `true`
- ✅ Has a favorite location set (`favoriteLocation`, `favoriteLat`, `favoriteLon`)

### Notification Content

Each email includes:
- **Best 3 fishing periods** for the day with scores
- **Weather conditions** (temperature, wind, precipitation)
- **Fishing tips** based on conditions
- **Personalized location/species preferences**
- **Link to full forecast** on the website

### Fishing Score Algorithm

The algorithm considers:
- **Temperature**: Optimal 10-20°C (+20 points)
- **Wind Speed**: Low wind preferred (+15 points for ≤10 km/h)
- **Precipitation**: No rain is best (+10 points for 0mm)
- **Cloud Cover**: Partial clouds optimal (+10 points for 30-70%)
- **Humidity**: Moderate levels preferred (+5 points for 50-80%)

Base score: 50/100, final score: 0-100

## Testing

### Manual Test

Trigger the function manually:
```bash
curl -X POST "https://your-project-ref.supabase.co/functions/v1/daily-fishing-notifications" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Check Cron Jobs

View scheduled jobs:
```sql
SELECT jobid, jobname, schedule, active FROM cron.job;
```

View job execution history:
```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## User Management

### Profile Settings

Users can customize:
- **Notification Time**: When to receive daily emails (24-hour format)
- **Timezone**: Canadian timezones supported
- **Email Preferences**: Enable/disable daily forecasts
- **Favorite Location**: Required for notifications

### Timezone Support

Currently supports Canadian timezones:
- Pacific Time (Vancouver)
- Mountain Time (Edmonton)  
- Central Time (Winnipeg)
- Eastern Time (Toronto)
- Atlantic Time (Halifax)
- Newfoundland Time

## Monitoring

### Function Logs

Check Edge Function logs:
```sql
-- View recent logs in Supabase Dashboard
-- Or use the Logs section in the Dashboard
```

### Email Delivery

Monitor email delivery through:
- Resend Dashboard (delivery status, bounces, opens)
- Function response data (sent/failed counts)

### Cron Job Status

```sql
-- Check if cron jobs are running
SELECT * FROM cron.job_run_details 
WHERE jobname = 'daily-fishing-notifications' 
ORDER BY start_time DESC LIMIT 5;
```

## Troubleshooting

### Common Issues

1. **No emails sent**
   - Check RESEND_API_KEY is set correctly
   - Verify users have `emailForecasts` enabled
   - Ensure users have favorite locations set

2. **Function timeout**
   - Increase timeout in cron job (currently 30 seconds)
   - Check weather API response times

3. **Invalid weather data**
   - Verify Open-Meteo API is accessible
   - Check coordinate validity in user preferences

4. **Cron job not running**
   - Ensure `pg_cron` extension is enabled
   - Check job is active: `SELECT * FROM cron.job;`

### Debugging

1. **Test with single user**:
   ```sql
   -- Temporarily modify user preferences for testing
   UPDATE auth.users 
   SET user_metadata = jsonb_set(
     user_metadata, 
     '{preferences,emailForecasts}', 
     'true'
   ) 
   WHERE email = 'test@example.com';
   ```

2. **Manual function execution**:
   - Use curl command above
   - Check response for detailed error messages

3. **Monitor weather API**:
   - Test Open-Meteo directly: `https://api.open-meteo.com/v1/forecast?latitude=48.4284&longitude=-123.3656&daily=temperature_2m_max`

## Security Considerations

- Service role key is used for user data access (secure)
- Email API key stored in Supabase Vault (encrypted)
- No user PII logged in function output
- Weather data is public (no privacy concerns)

## Future Enhancements

- SMS notifications (via Twilio integration)
- Push notifications (via web push API)
- Personalized notification timing per user
- Weather alert thresholds
- Fishing report integration
- Multi-language support

## Support

For issues or questions:
1. Check Supabase Dashboard logs
2. Review function response messages
3. Test individual components (auth, weather API, email service)
4. Monitor cron job execution history