// DFO (Fisheries and Oceans Canada) Open Data API integration

export interface DFOCatchRecord {
  year: number
  month: number
  species_code: string
  species_name: string
  area_code: string
  area_name: string
  gear_type: string
  landed_weight_kg: number
  landed_value_cad: number
  vessel_count: number
  trip_count: number
}

export interface DFOSpeciesStock {
  species_code: string
  species_name: string
  stock_area: string
  assessment_year: number
  biomass_tonnes: number
  fishing_mortality: number
  status: 'healthy' | 'cautious' | 'critical' | 'unknown'
}

// BC Fisheries Management Areas relevant to your locations
const BC_FISHING_AREAS = {
  Victoria: ['20', '21'], // Southern Gulf Islands, Juan de Fuca
  'Oak Bay': ['20'],
  Sooke: ['20', '21'],
  Sidney: ['18', '19'], // Saanich Inlet, Satellite Channel
  'Becher Bay': ['20'],
  'Pedder Bay': ['20'],
}

// Common BC coastal species codes from DFO
export const BC_SPECIES_CODES = {
  chinook_salmon: '413',
  coho_salmon: '414',
  sockeye_salmon: '415',
  pink_salmon: '416',
  chum_salmon: '417',
  steelhead: '418',
  halibut: '470',
  lingcod: '471',
  rockfish_various: '472-485',
  dungeness_crab: '622',
  spot_prawn: '626',
}

export const fetchDFOCommercialCatch = async (
  location: string,
  startYear: number,
  endYear: number,
): Promise<DFOCatchRecord[]> => {
  const areas = BC_FISHING_AREAS[location as keyof typeof BC_FISHING_AREAS] || ['20']
  const allRecords: DFOCatchRecord[] = []

  for (const area of areas) {
    try {
      // DFO Open Data CKAN API endpoint
      const baseUrl = 'https://open.canada.ca/data/api/3/action/datastore_search'
      const resourceId = 'commercial-fisheries-landings' // This would be the actual resource ID

      const params = new URLSearchParams({
        resource_id: resourceId,
        filters: JSON.stringify({
          Area: area,
          Year: { '>=': startYear, '<=': endYear },
        }),
        limit: '1000',
      })

      // Note: This is a conceptual implementation
      // The actual DFO data structure may vary
      const response = await fetch(`${baseUrl}?${params}`)

      if (!response.ok) {
        console.warn(`DFO API request failed for area ${area}:`, response.status)
        continue
      }

      const data = await response.json()

      if (data.success && data.result.records) {
        const records = data.result.records.map((record: any) => ({
          year: parseInt(record.Year),
          month: parseInt(record.Month) || 6, // Default to mid-year if month not specified
          species_code: record.Species_Code,
          species_name: record.Species_Name,
          area_code: area,
          area_name: record.Area_Name,
          gear_type: record.Gear_Type,
          landed_weight_kg: parseFloat(record.Landed_Weight_KG) || 0,
          landed_value_cad: parseFloat(record.Landed_Value_CAD) || 0,
          vessel_count: parseInt(record.Vessel_Count) || 0,
          trip_count: parseInt(record.Trip_Count) || 0,
        }))

        allRecords.push(...records)
      }
    } catch (error) {
      console.error(`Error fetching DFO data for area ${area}:`, error)
    }
  }

  return allRecords
}

export const fetchDFOSpeciesStock = async (
  location: string,
  year: number = new Date().getFullYear(),
): Promise<DFOSpeciesStock[]> => {
  const areas = BC_FISHING_AREAS[location as keyof typeof BC_FISHING_AREAS] || ['20']

  try {
    // DFO Stock Assessment data
    const baseUrl = 'https://open.canada.ca/data/api/3/action/datastore_search'
    const resourceId = 'species-stock-assessments' // Conceptual resource ID

    const params = new URLSearchParams({
      resource_id: resourceId,
      filters: JSON.stringify({
        Stock_Area: areas,
        Assessment_Year: year,
      }),
      limit: '500',
    })

    const response = await fetch(`${baseUrl}?${params}`)

    if (!response.ok) {
      throw new Error(`DFO Stock API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.success && data.result.records) {
      return data.result.records.map((record: any) => ({
        species_code: record.Species_Code,
        species_name: record.Species_Name,
        stock_area: record.Stock_Area,
        assessment_year: parseInt(record.Assessment_Year),
        biomass_tonnes: parseFloat(record.Biomass_Tonnes) || 0,
        fishing_mortality: parseFloat(record.Fishing_Mortality) || 0,
        status: record.Stock_Status?.toLowerCase() || 'unknown',
      }))
    }
  } catch (error) {
    console.error('Error fetching DFO species stock data:', error)
  }

  return []
}

// Convert DFO data to fishing activity score for comparison
export const processDFODataForComparison = (
  dfoRecords: DFOCatchRecord[],
  dateRange: { startDate: string; endDate: string },
): { date: string; commercialActivity: number; speciesCount: number }[] => {
  const dataByDate: { [date: string]: { weight: number; species: Set<string>; trips: number } } = {}

  // Group records by date
  dfoRecords.forEach(record => {
    const date = `${record.year}-${record.month.toString().padStart(2, '0')}-15` // Mid-month approximation

    if (!dataByDate[date]) {
      dataByDate[date] = { weight: 0, species: new Set(), trips: 0 }
    }

    dataByDate[date].weight += record.landed_weight_kg
    dataByDate[date].species.add(record.species_name)
    dataByDate[date].trips += record.trip_count
  })

  // Convert to comparison format
  return Object.entries(dataByDate)
    .map(([date, data]) => {
      // Normalize commercial activity to 0-10 scale
      const maxWeight = Math.max(...Object.values(dataByDate).map(d => d.weight))
      const normalizedActivity = maxWeight > 0 ? (data.weight / maxWeight) * 10 : 0

      return {
        date,
        commercialActivity: Math.round(normalizedActivity * 10) / 10,
        speciesCount: data.species.size,
      }
    })
    .filter(item => {
      return item.date >= dateRange.startDate && item.date <= dateRange.endDate
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Get fishing pressure indicator for a location
export const getFishingPressureIndicator = async (
  location: string,
  year: number = new Date().getFullYear(),
): Promise<{
  pressure_level: 'low' | 'medium' | 'high'
  total_vessels: number
  total_trips: number
  primary_species: string[]
  sustainability_concerns: string[]
}> => {
  try {
    const dfoData = await fetchDFOCommercialCatch(location, year - 1, year)
    const stockData = await fetchDFOSpeciesStock(location, year)

    const totalVessels = dfoData.reduce((sum, record) => sum + record.vessel_count, 0)
    const totalTrips = dfoData.reduce((sum, record) => sum + record.trip_count, 0)

    // Calculate pressure level based on trip density
    let pressureLevel: 'low' | 'medium' | 'high' = 'low'
    if (totalTrips > 1000) pressureLevel = 'high'
    else if (totalTrips > 500) pressureLevel = 'medium'

    // Get primary species (top 3 by weight)
    const speciesWeight: { [species: string]: number } = {}
    dfoData.forEach(record => {
      speciesWeight[record.species_name] = (speciesWeight[record.species_name] || 0) + record.landed_weight_kg
    })

    const primarySpecies = Object.entries(speciesWeight)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([species]) => species)

    // Sustainability concerns from stock assessments
    const sustainabilityConcerns = stockData
      .filter(stock => stock.status === 'cautious' || stock.status === 'critical')
      .map(stock => stock.species_name)

    return {
      pressure_level: pressureLevel,
      total_vessels: totalVessels,
      total_trips: totalTrips,
      primary_species: primarySpecies,
      sustainability_concerns: sustainabilityConcerns,
    }
  } catch (error) {
    console.error('Error calculating fishing pressure:', error)
    return {
      pressure_level: 'low',
      total_vessels: 0,
      total_trips: 0,
      primary_species: [],
      sustainability_concerns: [],
    }
  }
}

// Mock data for development (since actual DFO API structure may vary)
export const generateMockDFOData = (location: string, startYear: number, endYear: number): DFOCatchRecord[] => {
  const mockRecords: DFOCatchRecord[] = []
  const area = BC_FISHING_AREAS[location as keyof typeof BC_FISHING_AREAS]?.[0] || '20'

  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      // Generate realistic fishing data based on BC patterns
      const springPeak = month >= 4 && month <= 6 ? 1.5 : 1.0
      const fallPeak = month >= 9 && month <= 11 ? 1.3 : 1.0
      const seasonalMultiplier = springPeak * fallPeak

      mockRecords.push({
        year,
        month,
        species_code: '413',
        species_name: 'Chinook Salmon',
        area_code: area,
        area_name: `Area ${area}`,
        gear_type: 'Troll',
        landed_weight_kg: Math.round(Math.random() * 500 * seasonalMultiplier),
        landed_value_cad: Math.round(Math.random() * 2000 * seasonalMultiplier),
        vessel_count: Math.round(Math.random() * 20 + 5),
        trip_count: Math.round(Math.random() * 50 + 10),
      })
    }
  }

  return mockRecords
}
