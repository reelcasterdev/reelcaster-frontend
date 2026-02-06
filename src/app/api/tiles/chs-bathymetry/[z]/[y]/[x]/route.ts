import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy for CHS NONNA 10m Bathymetry tiles
 *
 * This proxy is needed because the CHS GeoServer doesn't allow direct browser
 * access (CORS restrictions). By proxying through our server, we can serve
 * the high-resolution Canadian bathymetry data to the frontend.
 *
 * Source: Canadian Hydrographic Service Non-Navigational (NONNA) Bathymetric Data
 * Resolution: 10 meters
 * Coverage: All Canadian waters (Pacific, Atlantic, Arctic)
 */

// Cache tiles for 24 hours (they don't change often)
const CACHE_MAX_AGE = 60 * 60 * 24

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ z: string; y: string; x: string }> }
) {
  const { z, y, x } = await params

  console.log(`[CHS Bathymetry] Tile request: z=${z}, y=${y}, x=${x}`)

  // Validate parameters are numbers
  const zoom = parseInt(z, 10)
  const row = parseInt(y, 10)
  const col = parseInt(x, 10)

  if (isNaN(zoom) || isNaN(row) || isNaN(col)) {
    console.error(`[CHS Bathymetry] Invalid coordinates: z=${z}, y=${y}, x=${x}`)
    return NextResponse.json(
      { error: 'Invalid tile coordinates' },
      { status: 400 }
    )
  }

  // Limit zoom level to reasonable range
  if (zoom < 0 || zoom > 18) {
    console.error(`[CHS Bathymetry] Zoom out of range: ${zoom}`)
    return NextResponse.json(
      { error: 'Zoom level out of range (0-18)' },
      { status: 400 }
    )
  }

  // Construct CHS TMS URL
  // Mapbox GL sends {z}/{y}/{x} where:
  //   - y = row (0 at top/north, increases southward) - XYZ convention
  //   - x = col (0 at left/west, increases eastward)
  //
  // TMS uses Y=0 at bottom (south), so we need to flip the Y coordinate
  // TMS Y = (2^zoom) - 1 - XYZ Y
  const tmsY = Math.pow(2, zoom) - 1 - row

  // GeoServer TMS endpoint: /tms/1.0.0/{layer}@{gridset}@{format}/{z}/{x}/{y}.{ext}
  const chsUrl = `https://nonna-geoserver.data.chs-shc.ca/geoserver/gwc/service/tms/1.0.0/nonna:NONNA%2010@EPSG%3A900913@png/${zoom}/${col}/${tmsY}.png`

  console.log(`[CHS Bathymetry] XYZ: z=${zoom}, y=${row}, x=${col} -> TMS: z=${zoom}, x=${col}, y=${tmsY}`)
  console.log(`[CHS Bathymetry] URL: ${chsUrl}`)

  try {
    const response = await fetch(chsUrl, {
      headers: {
        'User-Agent': 'ReelCaster/1.0 (Fishing Forecast Application)',
        'Accept': 'image/png,image/*',
      },
      // Cache on the server side
      next: {
        revalidate: CACHE_MAX_AGE,
      },
    })

    console.log(`[CHS Bathymetry] Response status: ${response.status}`)

    if (!response.ok) {
      // If tile not found (could be outside coverage area), return transparent tile
      if (response.status === 404) {
        console.log(`[CHS Bathymetry] Tile not found (404), returning empty`)
        return new NextResponse(null, {
          status: 204,
          headers: {
            'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
          },
        })
      }

      console.error(`[CHS Bathymetry] Fetch failed: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: response.status }
      )
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer()
    console.log(`[CHS Bathymetry] Tile size: ${imageBuffer.byteLength} bytes`)

    // Return the tile with appropriate headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('[CHS Bathymetry] Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tile' },
      { status: 500 }
    )
  }
}
