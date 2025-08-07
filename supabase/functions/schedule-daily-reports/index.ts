import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // This function should be called by a cron job at the specified times
    // For now, we'll trigger the send-daily-reports function
    
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-daily-reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scheduled: true,
        timestamp: new Date().toISOString()
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to trigger daily reports: ${response.statusText}`)
    }

    const result = await response.json()

    return new Response(
      JSON.stringify({ 
        message: 'Daily reports scheduled successfully',
        result
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