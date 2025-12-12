// Test script for Marine API integration
// Run with: npx tsx scripts/test-marine-api.ts

import {
  fetchOpenMeteoMarine,
  mergeMarineData,
  fetchOpenMeteoWeather
} from '../src/app/utils/openMeteoApi'

async function testMarineAPI() {
  console.log('🌊 Testing Marine API Integration\n')

  // Test coordinates (Victoria, BC)
  const coords = { lat: 48.4284, lon: -123.3656 }

  console.log('1. Testing Marine API fetch...')
  const marineResult = await fetchOpenMeteoMarine(coords, 2)

  if (!marineResult.success) {
    console.error('❌ Marine API failed:', marineResult.error)
    return
  }

  console.log('✅ Marine API success!')
  console.log(`   Data points: ${marineResult.data!.hourly.length}`)
  console.log(`   First entry:`, {
    time: marineResult.data!.hourly[0].time,
    seaSurfaceTemp: marineResult.data!.hourly[0].seaSurfaceTemp,
    waveHeight: marineResult.data!.hourly[0].waveHeight,
    swellHeight: marineResult.data!.hourly[0].swellHeight,
    oceanCurrentSpeed: marineResult.data!.hourly[0].oceanCurrentSpeed
  })

  console.log('\n2. Testing Weather API fetch...')
  const weatherResult = await fetchOpenMeteoWeather(coords, 2)

  if (!weatherResult.success) {
    console.error('❌ Weather API failed:', weatherResult.error)
    return
  }

  console.log('✅ Weather API success!')
  console.log(`   Data points: ${weatherResult.data!.minutely15.length}`)
  console.log(`   First entry:`, {
    time: weatherResult.data!.minutely15[0].time,
    temp: weatherResult.data!.minutely15[0].temp,
    windSpeed: weatherResult.data!.minutely15[0].windSpeed,
    pressure: weatherResult.data!.minutely15[0].pressure,
    seaSurfaceTemp: weatherResult.data!.minutely15[0].seaSurfaceTemp // Should be undefined
  })

  console.log('\n3. Testing data merge...')
  const mergedData = mergeMarineData(
    weatherResult.data!.minutely15.slice(0, 10),
    marineResult.data!.hourly.slice(0, 3)
  )

  console.log('✅ Data merge success!')
  console.log(`   Merged data points: ${mergedData.length}`)
  console.log(`   First merged entry:`, {
    time: mergedData[0].time,
    airTemp: mergedData[0].temp,
    seaSurfaceTemp: mergedData[0].seaSurfaceTemp, // Should now be populated!
    waveHeight: mergedData[0].waveHeight,
    swellHeight: mergedData[0].swellHeight
  })

  // Verify temperature variation
  console.log('\n4. Checking temperature data quality...')
  const sst = mergedData
    .filter(d => d.seaSurfaceTemp !== undefined)
    .map(d => d.seaSurfaceTemp!)

  if (sst.length > 0) {
    const min = Math.min(...sst)
    const max = Math.max(...sst)
    const avg = sst.reduce((a, b) => a + b, 0) / sst.length

    console.log('✅ Sea Surface Temperature stats:')
    console.log(`   Min: ${min.toFixed(1)}°C`)
    console.log(`   Max: ${max.toFixed(1)}°C`)
    console.log(`   Avg: ${avg.toFixed(1)}°C`)
    console.log(`   Coverage: ${sst.length}/${mergedData.length} data points`)

    if (min === max && max === 10.0) {
      console.warn('⚠️ WARNING: All temps are 10°C - might be using fallback!')
    } else {
      console.log('✅ Temperature data looks realistic!')
    }
  } else {
    console.error('❌ No sea surface temperature data found in merged result!')
  }

  // Check wave data
  console.log('\n5. Checking wave data...')
  const waves = mergedData.filter(d => d.waveHeight !== undefined)
  if (waves.length > 0) {
    console.log('✅ Wave data present:')
    console.log(`   Sample wave height: ${waves[0].waveHeight}m`)
    console.log(`   Sample swell height: ${waves[0].swellHeight}m`)
    console.log(`   Sample swell period: ${waves[0].swellPeriod}s`)
  } else {
    console.error('❌ No wave data found!')
  }

  console.log('\n✅ Marine API Integration Test Complete!')
}

testMarineAPI().catch(console.error)
