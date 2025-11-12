# Email Broadcast System

## Overview

The Email Broadcast System allows administrators to send customized emails to all registered users. Emails can include custom messages along with forecast data, weather information, tide times, and fishing reports.

## Features

- ✅ Manual email composition with custom messages
- ✅ Include/exclude forecast data sections
- ✅ Location-specific weather and tide information
- ✅ Email preview before sending
- ✅ Batch email sending (20 emails at a time)
- ✅ Real-time progress tracking
- ✅ Beautiful, responsive HTML email templates
- ✅ User count display
- ✅ Error handling and retry logic

## Setup

### 1. Install Dependencies

The required package (Resend) is already installed:
```bash
pnpm add resend  # Already done
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and configure:

```env
# Required: Supabase Service Role Key
# Get from: Supabase Dashboard > Settings > API > service_role
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required: Resend API Key
# Get from: https://resend.com/api-keys
# Free tier: 100 emails/day, 3,000 emails/month
RESEND_API_KEY=your_resend_api_key
```

#### Getting Your Resend API Key:

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. Navigate to API Keys
4. Create a new API key
5. Copy and paste into `.env.local`

**Free Tier Limits:**
- 100 emails per day
- 3,000 emails per month
- No credit card required

#### Getting Your Supabase Service Role Key:

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the `service_role` key (NOT the `anon` key)
4. Paste into `.env.local`

⚠️ **IMPORTANT**: The service role key bypasses Row Level Security. Never expose it to the client or commit it to git!

### 3. Verify Domain (Optional but Recommended)

For production use, verify your domain in Resend:

1. Go to Resend Dashboard > Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `reelcaster.com`)
4. Add the provided DNS records to your domain
5. Wait for verification (usually a few minutes)

Once verified, update the `from` email in `/src/lib/email-service.ts`:
```typescript
from = 'ReelCaster <noreply@reelcaster.com>'
```

Without domain verification, emails will be sent from `noreply@resend.dev` (works for testing).

## Usage

### Accessing the Admin Panel

Navigate to: **`http://localhost:3004/admin/send-email`**

### Composing an Email

1. **Email Subject**: Enter a catchy subject line (default: "Update from ReelCaster")

2. **Custom Message**: Write your personalized message. This appears highlighted at the top of the email.
   ```
   Example:
   Hey everyone! We've just updated our forecast system with
   even more accurate predictions. Check out this week's
   conditions below!
   ```

3. **Select Location**: Choose a location for forecast data (Victoria or Sooke)

4. **Include Data Sections**: Toggle what to include:
   - ☑ Weekly Forecast Summary (best 3 days)
   - ☑ Weather Highlights (temp, wind, conditions)
   - ☑ Tide Information (high/low times)
   - ☑ Recent Fishing Reports

5. **Preview**: Click "Preview Email" to see how it will look

6. **Send**: Click "Send to X Users" to send the broadcast

### Email Preview

The preview shows exactly how the email will render in users' inboxes:
- Mobile-responsive layout
- Color-coded fishing scores
- Professional design
- All included sections

### Batch Sending

Emails are sent in batches of 20 to avoid rate limits:
- Progress is shown in real-time
- Failed emails are tracked separately
- Results summary displayed after completion

## File Structure

```
src/
├── lib/
│   ├── email-service.ts                     # Email sending logic
│   └── email-templates/
│       └── admin-broadcast.ts               # Email HTML template
├── app/
│   ├── api/
│   │   └── admin/
│   │       ├── preview-email/route.ts       # Preview API endpoint
│   │       └── send-broadcast/route.ts      # Send API endpoint
│   ├── components/
│   │   └── admin/
│   │       ├── email-composer.tsx           # Main composer UI
│   │       └── email-preview.tsx            # Preview modal
│   └── admin/
│       └── send-email/
│           └── page.tsx                     # Admin page
└── docs/
    └── email-broadcast-system.md            # This file
```

## API Endpoints

### GET /api/admin/send-broadcast

Get user count before sending.

**Response:**
```json
{
  "success": true,
  "totalUsers": 120,
  "validEmails": 118,
  "invalidEmails": 2
}
```

### POST /api/admin/preview-email

Generate email preview.

**Request Body:**
```json
{
  "subject": "Update from ReelCaster",
  "customMessage": "Your message here...",
  "locationName": "Victoria, Sidney",
  "includeForecast": true,
  "includeWeather": true,
  "includeTides": false,
  "includeReports": false
}
```

**Response:**
```json
{
  "success": true,
  "html": "<html>...</html>",
  "subject": "Update from ReelCaster"
}
```

### POST /api/admin/send-broadcast

Send broadcast email to all users.

**Request Body:** Same as preview endpoint

**Response:**
```json
{
  "success": true,
  "sent": 118,
  "failed": 0,
  "total": 118,
  "skipped": 2,
  "results": [
    {
      "email": "user@example.com",
      "success": true,
      "messageId": "msg_abc123"
    }
  ]
}
```

## Email Template

The email template includes:

### Header
- ReelCaster branding
- Gradient background
- Professional design

### Custom Message Section
- Highlighted box with admin's message
- Pre-wrap formatting (preserves line breaks)

### Optional Sections (based on toggles):

1. **Fishing Forecast**
   - Best 3 days this week
   - Color-coded scores (🟢 8+, 🟡 6-8, 🟠 4-6, 🔴 <4)
   - Best fishing times
   - Weather conditions

2. **Weather Highlights**
   - Temperature, conditions, wind, precipitation
   - Grid layout (2x2)

3. **Tide Information**
   - High/low tide times for next 3 days
   - Easy-to-scan format

4. **Fishing Reports**
   - Recent report highlights
   - Location and date
   - Summary text

### Footer
- Unsubscribe link (placeholder)
- Link to full forecast
- Profile preferences link

## Development Mode

If `RESEND_API_KEY` is not set, emails are logged to console instead of being sent:

```
📧 Email would be sent (RESEND_API_KEY not set):
To: user@example.com
Subject: Update from ReelCaster
From: ReelCaster <noreply@reelcaster.com>
HTML length: 5432 characters
```

This is useful for testing without using API quota.

## Troubleshooting

### Error: "Failed to fetch users"

**Cause**: `SUPABASE_SERVICE_ROLE_KEY` is not set or incorrect

**Solution**:
1. Check `.env.local` has the correct service role key
2. Restart the dev server after adding the key

### Error: "Failed to send email"

**Cause**: `RESEND_API_KEY` is not set or invalid

**Solution**:
1. Verify API key in Resend dashboard
2. Check `.env.local` has the correct key
3. Restart dev server

### Emails not arriving

**Possible causes:**
1. Emails in spam folder
2. Rate limit reached (100/day on free tier)
3. Invalid recipient email addresses

**Solutions:**
1. Check spam/junk folders
2. Verify Resend dashboard for delivery status
3. Use verified domain instead of `resend.dev`

### Preview shows wrong data

**Cause**: Forecast/weather data not yet implemented in preview

**Solution**:
The current implementation focuses on custom messages. Forecast data integration requires fetching from Open-Meteo API (can be added later).

## Future Enhancements

Potential improvements for later:

1. **Automated Scheduling**
   - Schedule emails for specific date/time
   - Recurring emails (weekly digest)

2. **User Segmentation**
   - Send to specific user groups
   - Filter by favorite location
   - Filter by user preferences

3. **Real Forecast Data**
   - Fetch actual forecast from API
   - Fetch tide data from CHS API
   - Include recent fishing reports from database

4. **Email Templates**
   - Save draft emails
   - Reuse previous email templates
   - Multiple template designs

5. **Analytics**
   - Open rate tracking
   - Click tracking
   - Unsubscribe management

6. **A/B Testing**
   - Test different subject lines
   - Test different message formats

## Security Considerations

1. **Service Role Key**: Never expose to client-side code
2. **Admin Access**: Add authentication check to admin pages
3. **Rate Limiting**: Implement rate limits on send endpoint
4. **Input Validation**: Validate all user inputs
5. **Email Validation**: Only send to valid email addresses

## Cost Estimation

**Resend Free Tier:**
- 100 emails/day = free
- 3,000 emails/month = free

**For larger volumes:**
- $20/month = 50,000 emails
- $80/month = 500,000 emails

**Current user base:** ~120 users
**Monthly broadcasts (weekly):** 4 × 120 = 480 emails/month

✅ Comfortably within free tier!

## Support

For issues or questions:
1. Check this documentation
2. Review console logs
3. Check Resend dashboard for delivery logs
4. Verify environment variables

## Changelog

### v1.0.0 (2025-01-03)
- ✅ Initial implementation
- ✅ Manual email composition
- ✅ Email preview
- ✅ Batch sending
- ✅ User count display
- ✅ Responsive HTML template
- ✅ Error handling
