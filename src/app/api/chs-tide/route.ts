import { NextRequest, NextResponse } from 'next/server'

// CHS API proxy to handle CORS issues
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint parameter is required' }, { status: 400 })
    }

    // Construct the CHS API URL
    const chsUrl = `https://api.iwls-sine.azure.cloud-nuage.dfo-mpo.gc.ca/api/v1${endpoint}`
    
    // Forward the request to CHS API
    const response = await fetch(chsUrl, {
      headers: {
        'Accept': 'application/json',
      },
    })

    // If the response is not ok, return error
    if (!response.ok) {
      console.warn(`CHS API returned ${response.status} for ${chsUrl}`)
      return NextResponse.json(
        { error: `CHS API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Return the data with CORS headers
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Error proxying CHS API request:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tide data' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}