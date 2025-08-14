import { NextRequest, NextResponse } from 'next/server'

// CHS API proxy to handle CORS issues
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await params as they're now a Promise in Next.js 15
    const { path: pathSegments } = await params
    
    // Reconstruct the path from dynamic segments
    const path = pathSegments.join('/')
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    
    // Construct the CHS API URL
    const chsUrl = `https://api.iwls-sine.azure.cloud-nuage.dfo-mpo.gc.ca/api/v1/${path}${queryString ? '?' + queryString : ''}`
    
    console.log('Proxying to:', chsUrl)
    
    // Forward the request to CHS API
    const response = await fetch(chsUrl, {
      headers: {
        'Accept': 'application/json',
      },
    })

    // If the response is not ok, return error
    if (!response.ok) {
      console.warn(`CHS API returned ${response.status} for ${chsUrl}`)
      const errorText = await response.text()
      return NextResponse.json(
        { error: `CHS API error: ${response.status}`, details: errorText },
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
      { error: 'Failed to fetch tide data', details: error instanceof Error ? error.message : 'Unknown error' },
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