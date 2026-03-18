import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// =============================================================================
// Auth Helper
// =============================================================================

async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.substring(7)
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user.id
}

// =============================================================================
// Prompts
// =============================================================================

const SYSTEM_PROMPT = `You are a fishing guide for British Columbia's Pacific coast. Give one concise tactical fishing tip (2-3 sentences max). Be specific about timing, technique, or location strategy. No greetings or disclaimers.`

function buildScoreBasedPrompt(data: ScoreBasedInput): string {
  const lines = [
    `Location: ${data.location}`,
    data.species ? `Target species: ${data.species}` : null,
    `Date: ${data.forecastDate}`,
    `Overall fishing score: ${data.scoreData.overallScore}/10`,
    `Best time window: ${data.scoreData.bestTimeWindow.start}–${data.scoreData.bestTimeWindow.end} (score: ${data.scoreData.bestTimeWindow.score}/10)`,
    '',
    'Factor breakdown (0-10):',
    ...Object.entries(data.scoreData.breakdown).map(([k, v]) => `  ${k}: ${v}`),
  ]

  if (data.scoreData.speciesFactors) {
    lines.push('', 'Species-specific factors:')
    for (const [k, v] of Object.entries(data.scoreData.speciesFactors)) {
      lines.push(`  ${k}: value=${v.value}, score=${v.score}${v.description ? ` (${v.description})` : ''}`)
    }
  }

  lines.push(
    '',
    `Safe conditions: ${data.scoreData.isSafe ? 'Yes' : 'No – ' + data.scoreData.safetyWarnings.join(', ')}`,
    `In season: ${data.scoreData.isInSeason ? 'Yes' : 'No'}`,
    '',
    'Based on these scores, what\'s the best tactical approach for today?'
  )

  return lines.filter(l => l !== null).join('\n')
}

function buildRawDataPrompt(data: RawDataInput): string {
  const w = data.rawData.weather
  const lines = [
    `Location: ${data.location}`,
    data.species ? `Target species: ${data.species}` : null,
    `Date: ${data.rawData.date}, Season: ${data.rawData.season}`,
    '',
    'Weather conditions:',
    `  Temperature: ${w.temperature}°C (feels like ${w.apparentTemperature}°C)`,
    `  Humidity: ${w.humidity}%`,
    `  Pressure: ${w.pressure} hPa`,
    `  Wind: ${w.windSpeed} km/h, gusts ${w.windGusts} km/h, direction ${w.windDirection}°`,
    `  Cloud cover: ${w.cloudCover}%`,
    `  Precipitation: ${w.precipitation} mm (${w.precipitationProbability}% probability)`,
    `  Visibility: ${w.visibility} m`,
  ]

  if (data.rawData.tide) {
    const t = data.rawData.tide
    lines.push(
      '',
      'Tide conditions:',
      `  Current height: ${t.currentHeight} m, ${t.isRising ? 'Rising' : 'Falling'}`,
      `  Change rate: ${t.changeRate} m/hr, Tidal range: ${t.tidalRange} m`,
      t.nextTide ? `  Next tide: ${t.nextTide}` : null,
      t.waterTemperature != null ? `  Water temperature: ${t.waterTemperature}°C` : null,
      t.currentSpeed != null ? `  Current speed: ${t.currentSpeed} m/s, direction ${t.currentDirection}°` : null,
    )
  }

  lines.push(
    '',
    `Sunrise: ${data.rawData.sun.sunrise}, Sunset: ${data.rawData.sun.sunset}`,
    `Moon phase: ${data.rawData.moonPhase}`,
    '',
    'Based on these raw conditions, what fishing approach do you recommend?'
  )

  return lines.filter(l => l !== null).join('\n')
}

// =============================================================================
// Types
// =============================================================================

interface ScoreBasedInput {
  version: 'score_based'
  pairId: string
  location: string
  species: string | null
  dayIndex: number
  forecastDate: string
  latitude: number
  longitude: number
  scoreData: {
    overallScore: number
    bestTimeWindow: { start: string; end: string; score: number }
    breakdown: Record<string, number>
    speciesFactors?: Record<string, { value: number | string; score: number; description?: string }>
    isSafe: boolean
    safetyWarnings: string[]
    isInSeason: boolean
  }
}

interface RawDataInput {
  version: 'raw_data'
  pairId: string
  location: string
  species: string | null
  dayIndex: number
  forecastDate: string
  latitude: number
  longitude: number
  rawData: {
    weather: {
      temperature: number
      apparentTemperature: number
      humidity: number
      pressure: number
      windSpeed: number
      windDirection: number
      windGusts: number
      cloudCover: number
      precipitation: number
      precipitationProbability: number
      visibility: number
    }
    tide: {
      currentHeight: number
      isRising: boolean
      changeRate: number
      tidalRange: number
      nextTide: string | null
      waterTemperature: number | null
      currentSpeed: number | null
      currentDirection: number | null
    } | null
    sun: { sunrise: string; sunset: string }
    moonPhase: string
    season: string
    date: string
  }
}

type RequestInput = ScoreBasedInput | RawDataInput

// =============================================================================
// POST — Generate suggestion
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: RequestInput = await request.json()

    // Validate common fields
    if (!body.version || !['score_based', 'raw_data'].includes(body.version)) {
      return NextResponse.json({ error: 'Invalid version' }, { status: 400 })
    }
    if (!body.pairId || !body.location || !body.forecastDate || body.dayIndex == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Build prompt based on version
    let userMessage: string
    if (body.version === 'score_based') {
      if (!(body as ScoreBasedInput).scoreData) {
        return NextResponse.json({ error: 'scoreData required for score_based version' }, { status: 400 })
      }
      userMessage = buildScoreBasedPrompt(body as ScoreBasedInput)
    } else {
      if (!(body as RawDataInput).rawData) {
        return NextResponse.json({ error: 'rawData required for raw_data version' }, { status: 400 })
      }
      userMessage = buildRawDataPrompt(body as RawDataInput)
    }

    // Call Claude
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    const anthropic = new Anthropic({ apiKey })
    const startTime = Date.now()

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const latencyMs = Date.now() - startTime
    const suggestion = response.content[0].type === 'text' ? response.content[0].text : ''
    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens

    // Store in database
    const { data: record, error: dbError } = await supabaseAdmin
      .from('ai_suggestions')
      .insert({
        user_id: userId,
        version: body.version,
        pair_id: body.pairId,
        location_name: body.location,
        species: body.species,
        forecast_date: body.forecastDate,
        day_index: body.dayIndex,
        input_payload: body.version === 'score_based'
          ? (body as ScoreBasedInput).scoreData
          : (body as RawDataInput).rawData,
        suggestion,
        model: 'claude-haiku-4-5',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        latency_ms: latencyMs,
        latitude: body.latitude,
        longitude: body.longitude,
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('Error storing suggestion:', dbError)
      // Still return the suggestion even if DB fails
      return NextResponse.json({ suggestion, version: body.version, id: null })
    }

    return NextResponse.json({ suggestion, version: body.version, id: record.id })
  } catch (error) {
    console.error('Error in POST /api/ai-recommendation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============================================================================
// PATCH — User rating
// =============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, user_rating } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Suggestion ID required' }, { status: 400 })
    }
    if (user_rating !== null && user_rating !== 1 && user_rating !== -1) {
      return NextResponse.json({ error: 'user_rating must be 1, -1, or null' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('ai_suggestions')
      .update({ user_rating })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating rating:', error)
      return NextResponse.json({ error: 'Failed to update rating' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/ai-recommendation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
