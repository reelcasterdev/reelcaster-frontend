import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserPreference {
  user_id: string
  email: string
  email_forecasts: boolean
  favorite_location: string
  favorite_lat: number
  favorite_lon: number
  notification_time: string
  timezone: string
  favorite_species?: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all users who have email forecasts enabled
    const { data: users, error: usersError } = await supabaseClient
      .from('user_preferences')
      .select('user_id, favorite_location, favorite_lat, favorite_lon, notification_time, timezone, favorite_species')
      .eq('email_forecasts', true)
      .not('favorite_location', 'is', null)
      .not('favorite_lat', 'is', null)
      .not('favorite_lon', 'is', null)

    if (usersError) {
      throw new Error(`Error fetching user preferences: ${usersError.message}`)
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users with email forecasts enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user emails
    const userIds = users.map(u => u.user_id)
    const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers()
    
    if (authError) {
      throw new Error(`Error fetching user emails: ${authError.message}`)
    }

    // Create a map of user_id to email
    const userEmailMap = new Map(
      authUsers.users
        .filter(u => userIds.includes(u.id))
        .map(u => [u.id, u.email])
    )

    // Process each user
    const results = []
    for (const userPref of users) {
      const email = userEmailMap.get(userPref.user_id)
      if (!email) continue

      try {
        // Fetch forecast data using the existing API endpoints
        const forecastUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/get-fishing-forecast`
        const forecastResponse = await fetch(forecastUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
          },
          body: JSON.stringify({
            lat: userPref.favorite_lat,
            lon: userPref.favorite_lon,
            species: userPref.favorite_species
          })
        })

        if (!forecastResponse.ok) {
          throw new Error(`Failed to fetch forecast for user ${userPref.user_id}`)
        }

        const forecastData = await forecastResponse.json()
        
        // Generate report using the same algorithm as frontend
        const reportData = generateDailyReportFromForecast(
          forecastData,
          userPref.favorite_location,
          { lat: userPref.favorite_lat, lon: userPref.favorite_lon }
        )

        // Send email
        const emailHtml = generateEmailHtml(reportData, email)
        
        const { error: emailError } = await supabaseClient.auth.admin.sendEmail({
          email: email,
          options: {
            subject: `🎣 Your Daily Fishing Report - ${userPref.favorite_location}`,
            html: emailHtml
          }
        })

        if (emailError) {
          throw new Error(`Failed to send email to ${email}: ${emailError.message}`)
        }

        results.push({ user_id: userPref.user_id, status: 'success' })
      } catch (error) {
        console.error(`Error processing user ${userPref.user_id}:`, error)
        results.push({ user_id: userPref.user_id, status: 'error', error: error.message })
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Daily reports processing complete',
        results,
        processed: results.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

// Helper function to generate report from forecast data
function generateDailyReportFromForecast(forecastData: any, location: string, coordinates: { lat: number; lon: number }) {
  const forecasts = forecastData.forecasts || []
  
  // Take only the next 7 days
  const next7Days = forecasts.slice(0, 7)
  
  // Calculate daily scores and prepare day data
  const daysWithScores = next7Days.map((forecast: any) => {
    // Calculate overall day score (best 2-hour period score)
    const bestScore = forecast.twoHourForecasts.length > 0 
      ? Math.max(...forecast.twoHourForecasts.map((f: any) => f.score.total)) 
      : 0
    
    // Get the top 3 2-hour periods for this day
    const sortedPeriods = [...forecast.twoHourForecasts]
      .sort((a: any, b: any) => b.score.total - a.score.total)
      .slice(0, 3)
    
    return {
      date: forecast.date,
      dayName: forecast.dayName,
      overallScore: bestScore,
      bestPeriods: sortedPeriods.map((period: any) => ({
        startTime: period.startTime,
        endTime: period.endTime,
        score: period.score.total,
        conditions: period.conditions,
        windSpeed: period.windSpeed,
        temperature: period.avgTemp
      })),
      sunrise: forecast.sunrise,
      sunset: forecast.sunset
    }
  })
  
  // Sort by overall score and take the best 3 days
  const best3Days = daysWithScores
    .sort((a: any, b: any) => b.overallScore - a.overallScore)
    .slice(0, 3)
    // Re-sort by date (chronological order)
    .sort((a: any, b: any) => a.date - b.date)
  
  return {
    location,
    coordinates,
    generatedAt: Date.now() / 1000,
    bestDays: best3Days
  }
}

// Helper function to generate email HTML
function generateEmailHtml(reportData: any, userEmail: string): string {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
  }

  const getQualityLabel = (score: number) => {
    if (score >= 8) return 'Excellent'
    if (score >= 6) return 'Good'
    if (score >= 4) return 'Fair'
    return 'Poor'
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#10b981' // green
    if (score >= 6) return '#f59e0b' // amber
    if (score >= 4) return '#f97316' // orange
    return '#ef4444' // red
  }

  let daysHtml = ''
  reportData.bestDays.forEach((day: any, index: number) => {
    const dayScore = Math.round(day.overallScore)
    const scoreColor = getScoreColor(dayScore)
    
    daysHtml += `
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0; color: #ffffff; font-size: 20px;">${formatDate(day.date)}</h3>
            <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 14px;">
              Sunrise: ${formatTime(day.sunrise)} | Sunset: ${formatTime(day.sunset)}
            </p>
          </div>
          <div style="text-align: center;">
            <div style="background: ${scoreColor}; color: white; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;">
              ${dayScore}
            </div>
            <p style="margin: 4px 0 0 0; color: ${scoreColor}; font-size: 14px; font-weight: 600;">
              ${getQualityLabel(dayScore)}
            </p>
          </div>
        </div>
        
        <div style="background: #0f172a; border-radius: 8px; padding: 16px;">
          <h4 style="margin: 0 0 12px 0; color: #cbd5e1; font-size: 16px;">Best Fishing Times:</h4>
          ${day.bestPeriods.map((period: any, pIndex: number) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; ${pIndex < day.bestPeriods.length - 1 ? 'border-bottom: 1px solid #1e293b;' : ''}">
              <div>
                <p style="margin: 0; color: #ffffff; font-weight: 500;">
                  ${formatTime(period.startTime)} - ${formatTime(period.endTime)}
                </p>
                <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">
                  ${period.conditions} • ${Math.round(period.temperature)}°C • Wind: ${Math.round(period.windSpeed)} km/h
                </p>
              </div>
              <div style="color: ${getScoreColor(period.score)}; font-weight: bold;">
                ${period.score.toFixed(1)}/10
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Daily Fishing Report</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a; color: #ffffff;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🎣 Daily Fishing Report</h1>
          <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 16px;">${reportData.location}</p>
        </div>
        
        <!-- Best 3 Days -->
        <div style="background: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 22px;">Best 3 Days This Week</h2>
          ${daysHtml}
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 20px;">
          <p style="margin: 0; color: #64748b; font-size: 14px;">
            Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p style="margin: 8px 0 0 0; color: #64748b; font-size: 12px;">
            You're receiving this because you subscribed to daily fishing forecasts.
          </p>
          <a href="${Deno.env.get('SITE_URL')}/profile" style="color: #3b82f6; text-decoration: none; font-size: 12px;">
            Manage your preferences
          </a>
        </div>
      </div>
    </body>
    </html>
  `
}