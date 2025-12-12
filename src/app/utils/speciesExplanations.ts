// Species-specific explanations for fishing score algorithm factors
// Each species has tailored explanations based on their biology and behavior

export interface ScoringRange {
  range: string
  label: string
  color: string
}

export interface FactorExplanation {
  whyItMatters: string
  howCalculated: string
  recommendations: {
    excellent: string
    good: string
    fair: string
    poor: string
  }
  scoringRanges: ScoringRange[]
  scientificBasis?: string
}

export interface SpeciesExplanationData {
  displayName: string
  overview: string
  algorithmVersion: string
  factors: {
    [factorKey: string]: FactorExplanation
  }
  bestConditions: string
  worstConditions: string
  weightDistribution: {
    factor: string
    weight: number
    rationale: string
  }[]
}

export type SpeciesExplanations = {
  [speciesId: string]: SpeciesExplanationData
}

// Factor keys that map to our algorithm
export type FactorKey =
  | 'seasonality'
  | 'lightTime'
  | 'pressureTrend'
  | 'solunar'
  | 'catchReports'
  | 'tidalCurrent'
  | 'seaState'
  | 'waterTemp'
  | 'precipitation'
  // V2 algorithm factor keys
  | 'tidalPhase'        // Pink, Sockeye - flood vs ebb preference
  | 'lightConditions'   // Pink - enhanced light with cloud cover
  | 'currentFlow'       // Pink, Coho, Chum - current speed scoring
  | 'waterClarity'      // Pink, Chum - precipitation proxy
  | 'lightCloudCover'   // Coho - combined light + cloud factor
  | 'tidalMovement'     // Chum - combined current + range + direction
  | 'optimalLight'      // Chum - dynamic sunrise/sunset
  | 'tidalSlope'        // Halibut - proximity to slack tide
  | 'lightTideInteraction' // Halibut - low light + slack bonus
  | 'wind'              // All species - wind conditions
  | 'waveHeight'        // All species - wave conditions
  | 'tidalDynamics'     // Lingcod - combined slack + range interaction
  | 'timeOfDay'         // Lingcod, Rockfish, Crab, Spot Prawn
  | 'ambientLight'      // Lingcod - cloud cover + precipitation
  | 'slackTide'         // Rockfish, Spot Prawn - critical for bottom fish
  | 'moltCycle'         // Crab - water temperature driven
  | 'tidalActivity'     // Crab - current for scent dispersal
  | 'moonPhase'         // Crab - dark nights = trap reliance
  | 'safetyConditions'  // Crab - wind + wave combined
  | 'intraSeasonPosition' // Spot Prawn - first week >> last week
  | 'runTiming'         // Sockeye - river-specific run timing
  | 'riverConditions'   // Sockeye - discharge + temperature barriers
  // Legacy factor keys for backwards compatibility
  | 'pressure'
  | 'tideDirection'
  | 'tidalRange'
  | 'windSpeed'
  | 'cloudCover'
  | 'temperature'
  | 'visibility'

// Chinook Salmon - V2 Algorithm
const chinookExplanations: SpeciesExplanationData = {
  displayName: 'Chinook Salmon',
  overview:
    'Chinook (King) salmon are highly migratory fish that follow predictable seasonal patterns. Our algorithm prioritizes presence factors (seasonality, catch reports) because you cannot catch fish that are not there. Weather factors adjust the score based on fish activity levels.',
  algorithmVersion: 'V2',
  bestConditions:
    'Peak run timing (July-September in BC), rising barometric pressure after a storm, dawn/dusk light periods, moderate tidal flow, and recent catch reports indicating fish presence.',
  worstConditions:
    'Outside migration windows, rapidly falling pressure, slack tides, extreme weather (high winds, heavy rain), and no recent catch activity in the area.',
  weightDistribution: [
    {
      factor: 'Seasonality',
      weight: 20,
      rationale: 'Migration timing is the #1 predictor - fish must be present to catch them',
    },
    {
      factor: 'Catch Reports',
      weight: 15,
      rationale: 'Recent catches confirm fish presence in the area',
    },
    {
      factor: 'Light/Time',
      weight: 15,
      rationale: 'Chinook are most active during low-light periods (dawn/dusk)',
    },
    {
      factor: 'Tidal Current',
      weight: 12,
      rationale: 'Chinook feed actively during moderate current flow',
    },
    {
      factor: 'Pressure Trend',
      weight: 10,
      rationale: 'Rising pressure triggers feeding activity',
    },
    { factor: 'Solunar', weight: 8, rationale: 'Moon phases influence feeding windows' },
    { factor: 'Water Temp', weight: 8, rationale: 'Chinook prefer 10-14°C water' },
    { factor: 'Sea State', weight: 7, rationale: 'Calm to moderate seas improve fishing conditions' },
    { factor: 'Precipitation', weight: 5, rationale: 'Light rain can be good; heavy rain reduces visibility' },
  ],
  factors: {
    seasonality: {
      whyItMatters:
        'Chinook salmon follow predictable migration patterns tied to spawning runs. In BC, different stocks arrive at different times, but July through September is typically peak season. Outside these windows, fish density drops dramatically, making timing the most critical factor.',
      howCalculated:
        'We analyze the current date against known run timing for your location. Peak months score highest (8-10), shoulder months score moderately (5-7), and off-season months score low (0-4). Location-specific adjustments account for local stock timing.',
      recommendations: {
        excellent: 'Peak run timing! Fish are actively migrating through. Focus on proven holding areas and migration routes.',
        good: 'Good timing within the run window. Fish are present but may be more scattered. Cover more water.',
        fair: 'Shoulder season - fish numbers are building or waning. Be patient and focus on structure.',
        poor: 'Off-season for Chinook in this area. Consider targeting other species or different locations.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Peak Run', color: 'emerald' },
        { range: '5-7', label: 'Active Run', color: 'blue' },
        { range: '3-4', label: 'Shoulder', color: 'yellow' },
        { range: '0-2', label: 'Off-Season', color: 'red' },
      ],
      scientificBasis:
        'Based on DFO stock assessment data and historical catch records for BC Chinook populations.',
    },
    lightTime: {
      whyItMatters:
        'Chinook salmon are crepuscular feeders, meaning they are most active during low-light periods at dawn and dusk. During these times, they feel safer hunting in shallower water and are more likely to strike. Midday sun pushes them deeper and makes them less aggressive.',
      howCalculated:
        'We use actual sunrise/sunset times for your location to calculate optimal fishing windows. The hour before and after sunrise/dusk scores highest. Nighttime and bright midday periods score lower.',
      recommendations: {
        excellent:
          'Prime time! This is when Chinook feed most aggressively. Use active presentations and work the upper water column.',
        good: 'Good feeding window. Fish are moderately active. Standard presentations should produce.',
        fair: 'Fish are present but less active. Slow down your presentation and fish deeper.',
        poor: 'Low activity period. Fish deeper structure, use slower techniques, or take a break.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Dawn/Dusk', color: 'emerald' },
        { range: '6-7', label: 'Golden Hour', color: 'blue' },
        { range: '4-5', label: 'Morning/Evening', color: 'yellow' },
        { range: '0-3', label: 'Midday/Night', color: 'red' },
      ],
      scientificBasis:
        'Research on salmonid feeding behavior shows 60-70% of feeding occurs during crepuscular periods.',
    },
    pressureTrend: {
      whyItMatters:
        'Fish have swim bladders that are sensitive to barometric pressure changes. Rising pressure after a low typically triggers aggressive feeding as fish sense improving conditions. Rapidly falling pressure often shuts down the bite as fish become uncomfortable and seek deeper water.',
      howCalculated:
        'We analyze pressure change over 3-hour and 6-hour windows. Rising pressure (+2-5 hPa) scores highest. Stable pressure is good. Falling pressure scores lower, with rapid drops scoring worst.',
      recommendations: {
        excellent:
          'Rising pressure - fish are hungry! Use aggressive presentations. This is often the best bite window of the week.',
        good: 'Stable conditions. Fish are comfortable and feeding normally. Standard approaches work well.',
        fair: 'Slowly falling pressure. Fish may be transitioning deeper. Adjust depth and slow down.',
        poor: 'Rapid pressure change. Fish are stressed. Consider waiting for conditions to stabilize.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Rising', color: 'emerald' },
        { range: '6-7', label: 'Stable', color: 'blue' },
        { range: '4-5', label: 'Slow Fall', color: 'yellow' },
        { range: '0-3', label: 'Rapid Change', color: 'red' },
      ],
      scientificBasis:
        'Studies show fish feeding activity correlates positively with rising barometric pressure and negatively with falling pressure.',
    },
    // V2 Chinook Factors
    tide: {
      whyItMatters:
        'Chinook V2 uses a hybrid tidal model combining current speed (optimal ~1.2 kts) and timing (peak 20 min post-slack). This captures both the feeding window when bait is being flushed, and the trolling speed for proper gear presentation.',
      howCalculated:
        'Score = (Speed Score × 60%) + (Timing Score × 40%). Speed uses gaussian curve centered at 1.2 kts. Timing uses power decay from 20 minutes post-slack. Winter mode increases tide weight to 45%, summer uses 35%.',
      recommendations: {
        excellent: 'Perfect tidal conditions! Current speed and timing aligned for peak feeding. Fish the flush zone.',
        good: 'Good tidal flow. Either speed or timing is optimal. Adjust depth and presentation accordingly.',
        fair: 'Marginal tidal conditions. Either too fast, too slow, or poor timing. Fish structure and edges.',
        poor: 'Poor tide. Wrong phase or speed. Consider waiting for better tidal window or try different location.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Optimal Flush', color: 'emerald' },
        { range: '6-7', label: 'Good Flow', color: 'blue' },
        { range: '4-5', label: 'Marginal', color: 'yellow' },
        { range: '0-3', label: 'Poor', color: 'red' },
      ],
    },
    lightDepth: {
      whyItMatters:
        'Light penetration determines where Chinook feed in the water column. Bright sun pushes fish deep (120ft+), overcast brings them mid-depth (50-80ft), twilight brings them shallow (30ft). Winter mode uses static bottom strategy, summer uses dynamic cloud-based depth.',
      howCalculated:
        'Winter (Oct 16 - Apr 14): Always scores 10/10, recommends fishing bottom (10ft from substrate). Summer (Apr 15 - Oct 15): Cloud cover >70% = 10/10 at 50ft, Cloud 30-70% = 9/10 at 80ft, Clear = 8.5/10 at 120ft+. Twilight always 10/10 at 30ft.',
      recommendations: {
        excellent: 'Perfect light conditions! Fish are at optimal feeding depth. Follow the depth advice provided.',
        good: 'Good light levels. Fish are accessible. Target the recommended depth zone.',
        fair: 'Marginal light. Fish may be deeper or more selective. Adjust tackle weight for depth.',
        poor: 'Difficult light. Bright midday or very dark. Fish deep or wait for better light window.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Optimal (Twilight/Overcast)', color: 'emerald' },
        { range: '7-9', label: 'Good (Partial Cloud)', color: 'blue' },
        { range: '6-8', label: 'Fair (Clear)', color: 'yellow' },
        { range: '0-5', label: 'Poor', color: 'red' },
      ],
    },
    solunar: {
      whyItMatters:
        'Solunar theory suggests that fish feeding activity peaks during major and minor lunar periods - times when the moon is directly overhead or underfoot (major) or at right angles (minor). Many experienced anglers swear by these windows.',
      howCalculated:
        'We calculate moon transit times for your location. Major periods (moon overhead/underfoot) last ~2 hours and score highest. Minor periods (moon at 90°) last ~1 hour. Times outside these windows score lower.',
      recommendations: {
        excellent:
          'Major solunar period! Peak feeding activity expected. Be on the water and fishing actively.',
        good: 'Minor solunar period. Elevated feeding activity. Good time to be fishing.',
        fair: 'Between solunar periods. Normal activity levels. Focus on other favorable factors.',
        poor: 'Far from solunar windows. Rely on other factors like tide and pressure.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Major Period', color: 'emerald' },
        { range: '6-7', label: 'Minor Period', color: 'blue' },
        { range: '4-5', label: 'Near Period', color: 'yellow' },
        { range: '0-3', label: 'Between', color: 'red' },
      ],
      scientificBasis:
        'Based on John Alden Knight\'s solunar theory (1926), supported by anecdotal evidence from generations of anglers.',
    },
    catchReports: {
      whyItMatters:
        'Recent fishing reports from your area provide real-world confirmation that fish are present and biting. No algorithm can substitute for boots-on-the-ground intelligence. Reports within the last week are most relevant.',
      howCalculated:
        'We aggregate recent fishing reports from your area, weighting more recent reports higher. Reports with catch success score better than skunked reports. Report density also factors in - more reports = more confidence.',
      recommendations: {
        excellent:
          'Hot bite reported! Fish are actively feeding in your area. Match the successful patterns from recent reports.',
        good: 'Positive reports indicate fish presence. Conditions are fishable with decent catch rates.',
        fair: 'Mixed reports. Fish are present but selective. Be prepared to adjust tactics.',
        poor: 'Few reports or poor catches reported. Fish may have moved. Consider alternate locations.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Hot Bite', color: 'emerald' },
        { range: '6-7', label: 'Good Reports', color: 'blue' },
        { range: '4-5', label: 'Mixed', color: 'yellow' },
        { range: '0-3', label: 'Slow/None', color: 'red' },
      ],
    },
    tidalCurrent: {
      whyItMatters:
        'Chinook salmon use tidal currents strategically. They feed during moderate current when baitfish are concentrated and disoriented. Slack tides reduce feeding activity, while very strong currents make it energy-inefficient for fish to feed.',
      howCalculated:
        'We analyze tide predictions to determine current flow. Moderate flow (1-2 knots) scores highest. Slack tides and extreme currents score lower. The transition periods (tide changes) are often best.',
      recommendations: {
        excellent:
          'Optimal current flow! Baitfish are concentrated and Chinook are feeding. Work the current seams and edges.',
        good: 'Good tidal movement. Fish are active. Position yourself where current creates structure.',
        fair: 'Weak current. Fish are less concentrated. Focus on structure and depth changes.',
        poor: 'Slack tide or extreme current. Wait for tide change or seek protected water.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Prime Flow', color: 'emerald' },
        { range: '6-7', label: 'Good Flow', color: 'blue' },
        { range: '4-5', label: 'Light Flow', color: 'yellow' },
        { range: '0-3', label: 'Slack/Extreme', color: 'red' },
      ],
      scientificBasis:
        'Research shows salmon feeding efficiency peaks at moderate current speeds where prey is concentrated but swimming is not energy-prohibitive.',
    },
    seaState: {
      whyItMatters:
        'Sea conditions affect both fish behavior and your ability to fish effectively. Light chop can actually improve fishing by breaking up light penetration. Heavy seas push fish deeper, make boat control difficult, and can create unsafe conditions.',
      howCalculated:
        'We combine wind speed and wave height into a single sea state score. Calm to moderate conditions (winds <15 kt, waves <1m) score well. Heavy conditions reduce the score, with safety caps applied for dangerous conditions.',
      recommendations: {
        excellent: 'Ideal conditions! Fish are comfortable and accessible. All techniques are viable.',
        good: 'Fishable conditions with some chop. This can actually improve the bite. Standard approaches work.',
        fair: 'Moderate conditions. Fish may be deeper. Focus on protected areas and downsize presentations.',
        poor: 'Rough conditions. Safety concerns. Consider fishing protected water or waiting for improvement.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Calm', color: 'emerald' },
        { range: '6-7', label: 'Light Chop', color: 'blue' },
        { range: '4-5', label: 'Moderate', color: 'yellow' },
        { range: '0-3', label: 'Rough', color: 'red' },
      ],
    },
    waterTemp: {
      whyItMatters:
        'Chinook salmon are cold-water fish that thrive in temperatures between 10-14°C (50-57°F). Outside this range, their metabolism either slows (cold) or they become stressed (warm). Water temperature determines where fish hold in the water column.',
      howCalculated:
        'We use sea surface temperature data, adjusted for local conditions. Optimal range (10-14°C) scores highest. Temperatures outside this range score progressively lower based on deviation.',
      recommendations: {
        excellent:
          'Perfect temperature range! Fish are comfortable throughout the water column. Work all depths.',
        good: 'Acceptable temperatures. Fish are active but may prefer certain depths. Adjust as needed.',
        fair: 'Temperature is outside optimal range. Fish will seek thermal refugia. Target thermoclines.',
        poor: 'Temperature stress likely. Fish will be deep and lethargic. Consider different locations.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Optimal 10-14°C', color: 'emerald' },
        { range: '6-7', label: 'Good 8-16°C', color: 'blue' },
        { range: '4-5', label: 'Marginal', color: 'yellow' },
        { range: '0-3', label: 'Stress Zone', color: 'red' },
      ],
      scientificBasis: 'Salmon physiology research indicates optimal metabolic activity occurs at 10-14°C.',
    },
    precipitation: {
      whyItMatters:
        'Light rain can improve fishing by reducing surface light penetration and masking your presence. However, heavy rain reduces visibility, can bring runoff that muddies the water, and often correlates with low pressure systems that slow the bite.',
      howCalculated:
        'We analyze precipitation intensity and probability. No rain to light rain scores well. Moderate rain is neutral. Heavy rain or thunderstorms significantly reduce the score.',
      recommendations: {
        excellent: 'Clear or light drizzle - ideal conditions. Fish have good visibility and are comfortable.',
        good: 'Light rain. This can mask your presence and trigger feeding. Stay comfortable and fish on.',
        fair: 'Moderate rain. Visibility may be reduced. Use brighter or larger presentations.',
        poor: 'Heavy rain or storms. Visibility poor, safety concerns. Seek shelter or postpone.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Clear/Drizzle', color: 'emerald' },
        { range: '6-7', label: 'Light Rain', color: 'blue' },
        { range: '4-5', label: 'Moderate Rain', color: 'yellow' },
        { range: '0-3', label: 'Heavy/Storm', color: 'red' },
      ],
    },
    // Legacy factor mappings (for V1 algorithm display)
    pressure: {
      whyItMatters:
        'Fish swim bladders are sensitive to barometric pressure. Stable or rising pressure creates comfortable feeding conditions, while falling pressure often indicates approaching storms and can slow the bite.',
      howCalculated:
        'We evaluate the current barometric pressure value. Normal range (1010-1020 hPa) scores well. Very high or low pressure scores lower. Note: The V2 algorithm uses pressure TREND instead for better accuracy.',
      recommendations: {
        excellent: 'Stable high pressure - good feeding conditions.',
        good: 'Normal pressure range - fish should be active.',
        fair: 'Pressure is changing - monitor the trend.',
        poor: 'Extreme pressure - fish may be uncomfortable.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Optimal', color: 'emerald' },
        { range: '6-7', label: 'Normal', color: 'blue' },
        { range: '4-5', label: 'Marginal', color: 'yellow' },
        { range: '0-3', label: 'Extreme', color: 'red' },
      ],
    },
    tideDirection: {
      whyItMatters: 'Tide direction indicates whether water is flowing in (flood) or out (ebb). Both can be productive, but the transition periods often trigger feeding as baitfish are displaced.',
      howCalculated: 'We determine if the tide is incoming (flood) or outgoing (ebb) and how long until the change.',
      recommendations: {
        excellent: 'Tide is changing - prime time for active fish.',
        good: 'Mid-tide with good flow.',
        fair: 'Approaching slack tide.',
        poor: 'Slack tide - wait for movement.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Change', color: 'emerald' },
        { range: '6-7', label: 'Active', color: 'blue' },
        { range: '4-5', label: 'Slowing', color: 'yellow' },
        { range: '0-3', label: 'Slack', color: 'red' },
      ],
    },
    tidalRange: {
      whyItMatters: 'Larger tidal ranges create stronger currents and more water movement, which can concentrate baitfish and trigger feeding. Very small tides produce less current.',
      howCalculated: 'We calculate the difference between high and low tide heights for the day.',
      recommendations: {
        excellent: 'Large tidal exchange - strong currents expected.',
        good: 'Moderate tidal range - fishable conditions.',
        fair: 'Smaller tides - less current activity.',
        poor: 'Neap tides - minimal water movement.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Spring', color: 'emerald' },
        { range: '6-7', label: 'Moderate', color: 'blue' },
        { range: '4-5', label: 'Small', color: 'yellow' },
        { range: '0-3', label: 'Neap', color: 'red' },
      ],
    },
    windSpeed: {
      whyItMatters: 'Wind affects sea surface conditions and fish behavior. Light wind is ideal, while strong wind makes fishing difficult and can create unsafe conditions.',
      howCalculated: 'We measure sustained wind speed. Calm to light (0-15 km/h) is best. Strong winds (>30 km/h) are problematic.',
      recommendations: {
        excellent: 'Light winds - ideal fishing conditions.',
        good: 'Moderate wind - manageable with proper techniques.',
        fair: 'Fresh winds - consider sheltered spots.',
        poor: 'Strong winds - safety concern, fishing difficult.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Calm', color: 'emerald' },
        { range: '6-7', label: 'Light', color: 'blue' },
        { range: '4-5', label: 'Moderate', color: 'yellow' },
        { range: '0-3', label: 'Strong', color: 'red' },
      ],
    },
    waveHeight: {
      whyItMatters: 'Wave height determines sea conditions and affects both safety and fish behavior. Flat calm to light chop is ideal for fishing.',
      howCalculated: 'We measure significant wave height. Under 0.5m is calm, 0.5-1m is light chop, over 1.5m becomes challenging.',
      recommendations: {
        excellent: 'Flat to light chop - perfect conditions.',
        good: 'Moderate waves - still very fishable.',
        fair: 'Choppy conditions - fish may be deeper.',
        poor: 'Rough seas - safety concern.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Calm', color: 'emerald' },
        { range: '6-7', label: 'Light', color: 'blue' },
        { range: '4-5', label: 'Moderate', color: 'yellow' },
        { range: '0-3', label: 'Rough', color: 'red' },
      ],
    },
    cloudCover: {
      whyItMatters: 'Cloud cover affects light penetration and fish behavior. Overcast skies often improve fishing by reducing surface glare and making fish less wary.',
      howCalculated: 'We measure cloud coverage percentage. Overcast (70-100%) often scores better than clear skies for salmon.',
      recommendations: {
        excellent: 'Overcast skies - fish are comfortable shallower.',
        good: 'Partly cloudy - good conditions.',
        fair: 'Mostly clear - fish may go deeper.',
        poor: 'Bright sun - target shaded areas.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Overcast', color: 'emerald' },
        { range: '6-7', label: 'Cloudy', color: 'blue' },
        { range: '4-5', label: 'Partly', color: 'yellow' },
        { range: '0-3', label: 'Clear', color: 'red' },
      ],
    },
    temperature: {
      whyItMatters: 'Air temperature affects water temperature and angler comfort. Extreme temperatures can stress fish.',
      howCalculated: 'We measure air temperature and compare to seasonal norms.',
      recommendations: {
        excellent: 'Comfortable temperatures for fishing.',
        good: 'Seasonal temperatures - normal conditions.',
        fair: 'Temperature outside ideal range.',
        poor: 'Extreme temperatures - be prepared.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Ideal', color: 'emerald' },
        { range: '6-7', label: 'Good', color: 'blue' },
        { range: '4-5', label: 'Marginal', color: 'yellow' },
        { range: '0-3', label: 'Extreme', color: 'red' },
      ],
    },
    visibility: {
      whyItMatters: 'Visibility affects how fish locate prey and how visible your presentation is. Too clear or too murky can both be challenging.',
      howCalculated: 'We measure atmospheric visibility and estimate underwater visibility based on conditions.',
      recommendations: {
        excellent: 'Good visibility - ideal presentation conditions.',
        good: 'Standard visibility - normal fishing.',
        fair: 'Reduced visibility - use brighter colors.',
        poor: 'Very limited visibility - challenging conditions.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Clear', color: 'emerald' },
        { range: '6-7', label: 'Good', color: 'blue' },
        { range: '4-5', label: 'Moderate', color: 'yellow' },
        { range: '0-3', label: 'Poor', color: 'red' },
      ],
    },
  },
}

// Coho Salmon - V2 Algorithm
const cohoExplanations: SpeciesExplanationData = {
  displayName: 'Coho Salmon',
  overview:
    'Coho (Silver) salmon are aggressive feeders known for surface strikes and acrobatic fights. Our V2 algorithm emphasizes tidal current patterns, combined light+cloud conditions, and their unique response to rising vs ebb tides. Coho are schooling fish that feed throughout the day under overcast skies.',
  algorithmVersion: 'V2',
  bestConditions:
    'Late summer through fall (August-October), overcast skies with moderate tidal flow, rising tides pushing baitfish, and 8-12°C water temperature.',
  worstConditions:
    'Winter months, slack tides, bright sunny conditions, and rapidly changing barometric pressure.',
  weightDistribution: [
    { factor: 'Seasonality', weight: 20, rationale: 'Bell-curve peak in September for BC waters' },
    { factor: 'Current Flow', weight: 20, rationale: 'Coho need water movement to hunt baitfish' },
    { factor: 'Light + Cloud Cover', weight: 15, rationale: 'Combined low light and overcast improves feeding' },
    { factor: 'Tidal Phase', weight: 10, rationale: 'Rising tide pushes bait toward staging areas' },
    { factor: 'Pressure Trend', weight: 10, rationale: 'Post-frontal recovery triggers feeding' },
    { factor: 'Wind', weight: 10, rationale: 'Light chop breaks up surface glare' },
    { factor: 'Wave Height', weight: 10, rationale: 'Safety and fishing effectiveness' },
    { factor: 'Water Clarity', weight: 5, rationale: 'Clear water improves strike success' },
  ],
  factors: {
    seasonality: {
      whyItMatters:
        'Coho salmon runs in BC typically peak in September with a bell-curve distribution. Their timing varies by stock, but fall is prime time as they stage for spawning.',
      howCalculated:
        'V2 uses a bell-curve centered on day 255 (mid-September) with 35-day spread. Peak months score near 1.0, tapering smoothly to off-season.',
      recommendations: {
        excellent: 'Peak Coho season! Schools are aggressive and accessible. Surface techniques work well.',
        good: 'Active run window. Fish are present. Look for baitfish schools.',
        fair: 'Early or late season. Fish are present but less concentrated.',
        poor: 'Off-season. Focus on Chinook or resident species instead.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Peak Run', color: 'emerald' },
        { range: '5-7', label: 'Active', color: 'blue' },
        { range: '3-4', label: 'Shoulder', color: 'yellow' },
        { range: '0-2', label: 'Off-Season', color: 'red' },
      ],
      scientificBasis: 'Bell curve seasonality based on DFO Coho return timing data for BC coastal waters.',
    },
    currentFlow: {
      whyItMatters:
        'Coho actively hunt baitfish during moderate current. They need water movement to feed efficiently but struggle in extreme current.',
      howCalculated:
        'V2 scores current speed 0.5-1.5 knots as optimal. Very slack (<0.2 knots) or strong (>2.5 knots) reduces score via smooth decay.',
      recommendations: {
        excellent: 'Perfect current for Coho hunting. Work the tide rips and current seams.',
        good: 'Good flow - fish are actively feeding in current edges.',
        fair: 'Light current - fish may be scattered. Cover more water.',
        poor: 'Slack or extreme current - wait for tide change.',
      },
      scoringRanges: [
        { range: '8-10', label: '0.5-1.5kt Optimal', color: 'emerald' },
        { range: '6-7', label: 'Good Flow', color: 'blue' },
        { range: '4-5', label: 'Light/Heavy', color: 'yellow' },
        { range: '0-3', label: 'Slack/Extreme', color: 'red' },
      ],
      scientificBasis: 'Salmon feeding studies show peak efficiency at moderate current speeds where prey is concentrated.',
    },
    lightCloudCover: {
      whyItMatters:
        'Coho are aggressive feeders that prefer overcast skies. The V2 algorithm combines time of day with cloud cover for a single light factor.',
      howCalculated:
        'Dawn/dusk with overcast scores highest (1.0). Midday with clear skies scores lowest. Cloud cover boosts midday scores significantly.',
      recommendations: {
        excellent: 'Low light with overcast - perfect Coho conditions! Fish aggressively.',
        good: 'Good light conditions - fish should be willing to strike.',
        fair: 'Brighter conditions - fish may be deeper. Try flashier presentations.',
        poor: 'Bright midday sun - fish deep or shaded areas.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Dawn/Dusk Overcast', color: 'emerald' },
        { range: '6-7', label: 'Overcast Day', color: 'blue' },
        { range: '4-5', label: 'Partly Cloudy', color: 'yellow' },
        { range: '0-3', label: 'Bright Sun', color: 'red' },
      ],
    },
    tidalPhase: {
      whyItMatters:
        'Coho respond to tide direction. Rising (flood) tides push baitfish toward shorelines and staging areas where Coho wait.',
      howCalculated:
        'V2 gives a small bonus for rising tides (flood) vs ebb tides. Active flow in either direction beats slack.',
      recommendations: {
        excellent: 'Rising tide with good flow - prime time for Coho!',
        good: 'Active tide movement - fish are feeding.',
        fair: 'Approaching slack - action may slow.',
        poor: 'Slack tide - wait for movement to resume.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Flood Tide', color: 'emerald' },
        { range: '6-7', label: 'Active Ebb', color: 'blue' },
        { range: '4-5', label: 'Weak Flow', color: 'yellow' },
        { range: '0-3', label: 'Slack', color: 'red' },
      ],
    },
    pressureTrend: {
      whyItMatters:
        'Coho respond positively to rising pressure after storms. Stable conditions are also good, but rapid drops can slow the bite.',
      howCalculated:
        'V2 analyzes 3-hour and 6-hour pressure trends. Rising scores highest, stable is good, falling or rapid changes score lower.',
      recommendations: {
        excellent: 'Rising pressure - Coho are feeding aggressively!',
        good: 'Stable conditions - consistent fishing expected.',
        fair: 'Slowly falling - fish may be transitioning.',
        poor: 'Rapid pressure drop - fish may shut down.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Rising', color: 'emerald' },
        { range: '6-7', label: 'Stable', color: 'blue' },
        { range: '4-5', label: 'Slow Fall', color: 'yellow' },
        { range: '0-3', label: 'Rapid Drop', color: 'red' },
      ],
    },
    wind: {
      whyItMatters:
        'Coho tolerate choppier conditions than Chinook. Light wind creates helpful surface disturbance, but strong wind makes fishing difficult.',
      howCalculated:
        'V2 uses exponential decay curve. Wind under 8 knots is ideal, 12-15 is moderate, 20+ is unsafe.',
      recommendations: {
        excellent: 'Light winds - ideal trolling conditions.',
        good: 'Light chop - can actually improve the bite.',
        fair: 'Fresh winds - manageable but challenging.',
        poor: 'Strong winds - unsafe, seek shelter.',
      },
      scoringRanges: [
        { range: '8-10', label: '<8kt Calm', color: 'emerald' },
        { range: '6-7', label: '8-12kt Light', color: 'blue' },
        { range: '4-5', label: '12-15kt Fresh', color: 'yellow' },
        { range: '0-3', label: '>15kt Strong', color: 'red' },
      ],
    },
    waveHeight: {
      whyItMatters:
        'Wave height affects boat control and fishing effectiveness. Coho can handle some chop but rough seas make fishing dangerous.',
      howCalculated:
        'V2 estimates waves from wind speed. Under 1m is ideal, 1-1.5m is moderate, over 2m is dangerous.',
      recommendations: {
        excellent: 'Flat to light chop - perfect fishing conditions.',
        good: 'Moderate waves - still very productive.',
        fair: 'Choppy - fish may be deeper, adjust tactics.',
        poor: 'Rough seas - safety concern, postpone trip.',
      },
      scoringRanges: [
        { range: '8-10', label: '<0.5m Calm', color: 'emerald' },
        { range: '6-7', label: '0.5-1m Light', color: 'blue' },
        { range: '4-5', label: '1-1.5m Moderate', color: 'yellow' },
        { range: '0-3', label: '>1.5m Rough', color: 'red' },
      ],
    },
    waterClarity: {
      whyItMatters:
        'Coho are visual predators that need reasonable water clarity to hunt effectively. Heavy rain reduces visibility and bite rates.',
      howCalculated:
        'V2 uses precipitation as a proxy for water clarity. No rain = clear water = high score.',
      recommendations: {
        excellent: 'Clear water - Coho can hunt effectively.',
        good: 'Light turbidity - still productive.',
        fair: 'Reduced visibility - use larger, brighter lures.',
        poor: 'Muddy water - fishing will be slow.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Clear', color: 'emerald' },
        { range: '6-7', label: 'Slight Turbidity', color: 'blue' },
        { range: '4-5', label: 'Reduced', color: 'yellow' },
        { range: '0-3', label: 'Muddy', color: 'red' },
      ],
    },
    // Legacy factors for backwards compatibility
    lightTime: {
      whyItMatters: 'Replaced by lightCloudCover in V2 - combines time and cloud cover.',
      howCalculated: 'See lightCloudCover factor.',
      recommendations: {
        excellent: 'See lightCloudCover factor.',
        good: 'See lightCloudCover factor.',
        fair: 'See lightCloudCover factor.',
        poor: 'See lightCloudCover factor.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Dawn/Dusk', color: 'emerald' },
        { range: '6-7', label: 'Overcast Day', color: 'blue' },
        { range: '4-5', label: 'Morning/Eve', color: 'yellow' },
        { range: '0-3', label: 'Bright Midday', color: 'red' },
      ],
    },
    tidalCurrent: {
      whyItMatters: 'Replaced by currentFlow in V2 for more nuanced current scoring.',
      howCalculated: 'See currentFlow factor.',
      recommendations: {
        excellent: 'See currentFlow factor.',
        good: 'See currentFlow factor.',
        fair: 'See currentFlow factor.',
        poor: 'See currentFlow factor.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Ideal Flow', color: 'emerald' },
        { range: '6-7', label: 'Good', color: 'blue' },
        { range: '4-5', label: 'Light', color: 'yellow' },
        { range: '0-3', label: 'Slack', color: 'red' },
      ],
    },
    pressure: chinookExplanations.factors.pressure,
    tideDirection: chinookExplanations.factors.tideDirection,
    tidalRange: chinookExplanations.factors.tidalRange,
    windSpeed: chinookExplanations.factors.windSpeed,
    cloudCover: chinookExplanations.factors.cloudCover,
    temperature: chinookExplanations.factors.temperature,
    visibility: chinookExplanations.factors.visibility,
  },
}

// Halibut - V2 Algorithm
const halibutExplanations: SpeciesExplanationData = {
  displayName: 'Halibut',
  overview:
    'Pacific halibut are ambush predators that require very specific tidal conditions. The V2 algorithm emphasizes "tidal slope" (proximity to slack tide) and light+tide interaction. Unlike salmon, halibut shut down during strong current and feed during slack windows.',
  algorithmVersion: 'V2',
  bestConditions:
    'Near slack tide with minimal current, spring tides (larger tidal range provides longer slack windows), early morning in low light, stable/rising pressure, and calm seas for boat positioning.',
  worstConditions: 'Strong tidal current, neap tides, rough seas preventing anchoring, and rapidly falling pressure.',
  weightDistribution: [
    { factor: 'Tidal Slope', weight: 30, rationale: 'Proximity to slack is critical for halibut feeding' },
    { factor: 'Tidal Range', weight: 20, rationale: 'Spring tides = longer slack windows' },
    { factor: 'Seasonality', weight: 15, rationale: 'May-August when halibut are in accessible depths' },
    { factor: 'Light+Tide Interaction', weight: 10, rationale: 'Dawn/dusk + slack = peak feeding' },
    { factor: 'Pressure Trend', weight: 10, rationale: 'Rising/stable pressure improves bite' },
    { factor: 'Wind', weight: 10, rationale: 'Calm conditions for anchoring over structure' },
    { factor: 'Wave Height', weight: 5, rationale: 'Must maintain position over bottom structure' },
  ],
  factors: {
    tidalSlope: {
      whyItMatters:
        'Halibut are ambush predators that feed during slack tide windows. "Tidal slope" measures how close you are to slack - the flatter the tide curve, the better the fishing.',
      howCalculated:
        'V2 calculates rate of water level change per hour. Near-slack (<0.1m/hr) scores highest. Active tide movement (>0.3m/hr) scores progressively lower.',
      recommendations: {
        excellent: 'Perfect slack window! Halibut are actively feeding. Get your bait down NOW.',
        good: 'Near slack - good feeding window. Fish should be responsive.',
        fair: 'Tide building/ebbing - feeding slowing. Be patient.',
        poor: 'Strong current - halibut have shut down. Wait for slack.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Slack Window', color: 'emerald' },
        { range: '6-7', label: 'Near Slack', color: 'blue' },
        { range: '4-5', label: 'Building Flow', color: 'yellow' },
        { range: '0-3', label: 'Strong Current', color: 'red' },
      ],
      scientificBasis: 'Halibut feeding studies show 70% of bites occur within 30 minutes of slack tide.',
    },
    tidalRange: {
      whyItMatters:
        'Larger tidal ranges (spring tides) provide longer slack windows for halibut to feed. Neap tides have shorter, less productive slack periods.',
      howCalculated:
        'V2 scores spring tides (>3m range) higher than neap tides (<1.5m range). Larger exchange = more bait movement and longer feeding windows.',
      recommendations: {
        excellent: 'Spring tide - extended slack windows for feeding!',
        good: 'Good tidal range - reasonable slack windows.',
        fair: 'Moderate range - shorter feeding windows.',
        poor: 'Neap tide - brief slack, challenging fishing.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Spring >3m', color: 'emerald' },
        { range: '6-7', label: 'Good 2-3m', color: 'blue' },
        { range: '4-5', label: 'Moderate 1.5-2m', color: 'yellow' },
        { range: '0-3', label: 'Neap <1.5m', color: 'red' },
      ],
    },
    seasonality: {
      whyItMatters:
        'Halibut migrate into shallower coastal waters from May through August for feeding. Winter months see fish in inaccessible depths offshore.',
      howCalculated:
        'V2 uses a bell curve centered on July (day 195) with peak from May-August. Off-season months score near zero.',
      recommendations: {
        excellent: 'Prime halibut season! Fish are in accessible depths 50-150m.',
        good: 'Good timing. Fish present but may require searching deeper.',
        fair: 'Shoulder season. Fish transitioning - check multiple depths.',
        poor: 'Off-season. Halibut are 200m+ and scattered.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Peak May-Aug', color: 'emerald' },
        { range: '5-7', label: 'Shoulder Apr/Sep', color: 'blue' },
        { range: '3-4', label: 'Marginal', color: 'yellow' },
        { range: '0-2', label: 'Off-Season', color: 'red' },
      ],
      scientificBasis: 'DFO stock assessments show halibut availability peaks June-July in BC coastal waters.',
    },
    lightTideInteraction: {
      whyItMatters:
        'The V2 algorithm recognizes that halibut fishing peaks when low light AND slack tide coincide. This interaction bonus rewards optimal timing.',
      howCalculated:
        'Bonus applied when dawn/dusk hours overlap with slack tide windows. This combination scores significantly higher than either factor alone.',
      recommendations: {
        excellent: 'Dawn/dusk + slack tide = PRIME TIME! This is the golden window.',
        good: 'Good light or good tide - one factor working in your favor.',
        fair: 'Moderate conditions - adjust expectations.',
        poor: 'Bright sun with strong current - tough fishing.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Low Light + Slack', color: 'emerald' },
        { range: '6-7', label: 'One Factor Good', color: 'blue' },
        { range: '4-5', label: 'Moderate', color: 'yellow' },
        { range: '0-3', label: 'Neither', color: 'red' },
      ],
    },
    pressureTrend: {
      whyItMatters:
        'Stable or rising pressure creates consistent bottom conditions. Halibut sense pressure changes and may become inactive during rapid drops.',
      howCalculated:
        'V2 analyzes 6-hour pressure trends. Rising scores highest, stable is good, falling reduces score.',
      recommendations: {
        excellent: 'Rising pressure - halibut are hungry!',
        good: 'Stable conditions - consistent fishing.',
        fair: 'Slowly falling - activity may decrease.',
        poor: 'Rapid drop - halibut likely inactive.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Rising', color: 'emerald' },
        { range: '6-7', label: 'Stable', color: 'blue' },
        { range: '4-5', label: 'Slow Fall', color: 'yellow' },
        { range: '0-3', label: 'Rapid Drop', color: 'red' },
      ],
    },
    wind: {
      whyItMatters:
        'Halibut fishing requires precise boat positioning over bottom structure. Wind makes anchoring difficult and reduces fishing effectiveness.',
      howCalculated:
        'V2 uses smooth decay curve. Under 10 knots is ideal, 15-20 is challenging, 20+ is dangerous.',
      recommendations: {
        excellent: 'Calm conditions - you can hold position over structure perfectly.',
        good: 'Light wind - manageable with drift control.',
        fair: 'Fresh wind - consider shallower, protected spots.',
        poor: 'Strong wind - cannot maintain position. Postpone or relocate.',
      },
      scoringRanges: [
        { range: '8-10', label: '<10kt Calm', color: 'emerald' },
        { range: '6-7', label: '10-15kt Light', color: 'blue' },
        { range: '4-5', label: '15-20kt Fresh', color: 'yellow' },
        { range: '0-3', label: '>20kt Strong', color: 'red' },
      ],
    },
    waveHeight: {
      whyItMatters:
        'Rough seas prevent effective halibut fishing. You need stable boat positioning to work bottom structure and feel bites.',
      howCalculated:
        'V2 has strict wave thresholds. Under 0.5m is ideal, 1m is moderate, 1.5m+ is too rough.',
      recommendations: {
        excellent: 'Flat calm - ideal for sensitive bottom fishing.',
        good: 'Light chop - still fishable.',
        fair: 'Moderate waves - challenging conditions.',
        poor: 'Rough - cannot fish effectively. Seek shelter.',
      },
      scoringRanges: [
        { range: '8-10', label: '<0.5m Calm', color: 'emerald' },
        { range: '6-7', label: '0.5-1m Light', color: 'blue' },
        { range: '4-5', label: '1-1.5m Moderate', color: 'yellow' },
        { range: '0-3', label: '>1.5m Rough', color: 'red' },
      ],
    },
    // Legacy factors for backwards compatibility
    tidalCurrent: {
      whyItMatters: 'Replaced by tidalSlope in V2 - measures proximity to slack tide.',
      howCalculated: 'See tidalSlope factor for V2 calculation.',
      recommendations: {
        excellent: 'See tidalSlope factor.',
        good: 'See tidalSlope factor.',
        fair: 'See tidalSlope factor.',
        poor: 'See tidalSlope factor.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Prime', color: 'emerald' },
        { range: '6-7', label: 'Good', color: 'blue' },
        { range: '4-5', label: 'Light/Heavy', color: 'yellow' },
        { range: '0-3', label: 'Slack/Extreme', color: 'red' },
      ],
    },
    lightTime: {
      whyItMatters: 'V2 combines light with tide via lightTideInteraction factor.',
      howCalculated: 'See lightTideInteraction factor.',
      recommendations: {
        excellent: 'See lightTideInteraction factor.',
        good: 'See lightTideInteraction factor.',
        fair: 'See lightTideInteraction factor.',
        poor: 'See lightTideInteraction factor.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Dawn/Dusk', color: 'emerald' },
        { range: '6-7', label: 'Morning/Eve', color: 'blue' },
        { range: '4-5', label: 'Midday', color: 'yellow' },
        { range: '2-3', label: 'Bright', color: 'red' },
      ],
    },
    pressure: chinookExplanations.factors.pressure,
    tideDirection: chinookExplanations.factors.tideDirection,
    windSpeed: chinookExplanations.factors.windSpeed,
    cloudCover: chinookExplanations.factors.cloudCover,
    temperature: chinookExplanations.factors.temperature,
    visibility: chinookExplanations.factors.visibility,
  },
}

// Generic/Default explanations for other species
const genericExplanations: SpeciesExplanationData = {
  displayName: 'General',
  overview:
    'This forecast uses general fishing factors that apply across most marine species. Weather, tides, and time of day all influence fish behavior and your chances of success.',
  algorithmVersion: 'V1',
  bestConditions: 'Stable weather, moderate tidal flow, dawn/dusk periods, and recent fish activity in the area.',
  worstConditions: 'Extreme weather, slack tides, rapid pressure changes, and no recent fish reports.',
  weightDistribution: [
    { factor: 'Tidal Current', weight: 15, rationale: 'Current affects baitfish and predator activity' },
    { factor: 'Sea State', weight: 15, rationale: 'Calm conditions improve fishing effectiveness' },
    { factor: 'Light/Time', weight: 12, rationale: 'Most fish are active during low-light periods' },
    { factor: 'Pressure Trend', weight: 12, rationale: 'Weather changes affect fish behavior' },
    { factor: 'Seasonality', weight: 12, rationale: 'Fish availability varies by season' },
    { factor: 'Catch Reports', weight: 10, rationale: 'Recent catches indicate fish presence' },
    { factor: 'Water Temp', weight: 10, rationale: 'Temperature affects metabolism and location' },
    { factor: 'Solunar', weight: 7, rationale: 'Lunar cycles influence feeding activity' },
    { factor: 'Precipitation', weight: 7, rationale: 'Rain affects visibility and comfort' },
  ],
  factors: {
    ...chinookExplanations.factors,
  },
}

// Lingcod - V2 Algorithm
const lingcodExplanations: SpeciesExplanationData = {
  displayName: 'Lingcod',
  overview:
    'Lingcod are aggressive ambush predators that hold on rocky structure. The V2 algorithm uses an interaction model where slack tide AND large tidal range combine for optimal feeding. Ebb tides receive a bonus as lingcod prefer dropping water levels.',
  algorithmVersion: 'V2',
  bestConditions:
    'Near slack tide during spring tides (large range), ebb tide with dropping water, overcast conditions, and stable/rising pressure. Peak season is April-October.',
  worstConditions: 'Strong current, neap tides with brief slack windows, rough seas, and December-February when fish are spawning.',
  weightDistribution: [
    { factor: 'Tidal Dynamics', weight: 40, rationale: 'Combined slack + range + ebb interaction model' },
    { factor: 'Seasonality', weight: 15, rationale: 'Bell curve April-October, spawning closure winter' },
    { factor: 'Time of Day', weight: 5, rationale: 'Dawn/dusk prime time multiplier' },
    { factor: 'Pressure Trend', weight: 10, rationale: 'Rising/stable pressure improves feeding' },
    { factor: 'Wind', weight: 10, rationale: 'Calm conditions for boat positioning' },
    { factor: 'Wave Height', weight: 10, rationale: 'Must stay over structure' },
    { factor: 'Ambient Light', weight: 10, rationale: 'Overcast + rain = better feeding' },
  ],
  factors: {
    tidalDynamics: {
      whyItMatters:
        'V2 uses an interaction model: slack tide x tidal range x ebb bonus. Lingcod feed during slack but larger tides provide longer windows. Ebb tide receives a 15% bonus.',
      howCalculated:
        'Formula: slackScore * (0.5 + 0.5 * rangeScore) + ebbBonus. This means good slack during spring tides with ebb direction maximizes score.',
      recommendations: {
        excellent: 'Slack + spring tide + ebb = perfect lingcod window!',
        good: 'Good slack conditions during reasonable tidal range.',
        fair: 'One factor missing - still fishable.',
        poor: 'Strong current or neap tides - challenging conditions.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Optimal Combo', color: 'emerald' },
        { range: '6-7', label: 'Good', color: 'blue' },
        { range: '4-5', label: 'Fair', color: 'yellow' },
        { range: '0-3', label: 'Poor', color: 'red' },
      ],
      scientificBasis: 'Interaction model based on BC lingcod feeding behavior studies around rocky structure.',
    },
    seasonality: {
      whyItMatters:
        'Lingcod are most accessible April-October when actively feeding. Winter months (Dec-Feb) see spawning closures and reduced activity.',
      howCalculated:
        'V2 uses bell curve centered on July. Peak scores May-September. Winter spawning months score near zero.',
      recommendations: {
        excellent: 'Peak lingcod season! Fish are aggressive and accessible.',
        good: 'Good timing - fish are feeding actively.',
        fair: 'Shoulder season - fish present but less aggressive.',
        poor: 'Spawning season - closures may apply, fish not feeding.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Peak May-Sep', color: 'emerald' },
        { range: '5-7', label: 'Active Apr/Oct', color: 'blue' },
        { range: '3-4', label: 'Marginal', color: 'yellow' },
        { range: '0-2', label: 'Spawning Dec-Feb', color: 'red' },
      ],
    },
    timeOfDay: {
      whyItMatters:
        'Lingcod are most aggressive during dawn and dusk. V2 applies a prime time multiplier during these windows.',
      howCalculated:
        'Dawn (1hr before to 2hr after sunrise) and dusk (2hr before to 1hr after sunset) receive highest scores.',
      recommendations: {
        excellent: 'Prime time! Lingcod are most aggressive now.',
        good: 'Good feeding window - active fishing.',
        fair: 'Midday - fish are still catchable.',
        poor: 'Night - reduced activity.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Dawn/Dusk', color: 'emerald' },
        { range: '6-7', label: 'Morning/Evening', color: 'blue' },
        { range: '4-5', label: 'Midday', color: 'yellow' },
        { range: '0-3', label: 'Night', color: 'red' },
      ],
    },
    pressureTrend: {
      whyItMatters:
        'Rising pressure triggers feeding activity in lingcod. They are less affected by pressure than salmon but still respond.',
      howCalculated:
        'V2 analyzes 6-hour trends. Rising scores best, stable is good, falling reduces score.',
      recommendations: {
        excellent: 'Rising pressure - lingcod are hungry!',
        good: 'Stable conditions - consistent action.',
        fair: 'Falling pressure - be patient.',
        poor: 'Rapid changes - activity may slow.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Rising', color: 'emerald' },
        { range: '6-7', label: 'Stable', color: 'blue' },
        { range: '4-5', label: 'Falling', color: 'yellow' },
        { range: '0-3', label: 'Rapid Change', color: 'red' },
      ],
    },
    wind: {
      whyItMatters:
        'Lingcod fishing requires positioning over rocky structure. Wind makes this difficult and dangerous.',
      howCalculated:
        'V2 uses smooth decay. Under 10kt is ideal, 15-20kt is challenging, 20kt+ is unsafe.',
      recommendations: {
        excellent: 'Calm - you can work structure precisely.',
        good: 'Light wind - manageable drift.',
        fair: 'Fresh wind - challenging positioning.',
        poor: 'Strong wind - too rough for structure fishing.',
      },
      scoringRanges: [
        { range: '8-10', label: '<10kt', color: 'emerald' },
        { range: '6-7', label: '10-15kt', color: 'blue' },
        { range: '4-5', label: '15-20kt', color: 'yellow' },
        { range: '0-3', label: '>20kt', color: 'red' },
      ],
    },
    waveHeight: {
      whyItMatters:
        'Rough seas make it impossible to fish rocky structure where lingcod hold.',
      howCalculated:
        'V2 has strict thresholds. Under 0.5m ideal, 1m moderate, 1.5m+ is too rough.',
      recommendations: {
        excellent: 'Flat calm - work structure effectively.',
        good: 'Light chop - still fishable.',
        fair: 'Moderate waves - challenging.',
        poor: 'Rough - cannot fish structure safely.',
      },
      scoringRanges: [
        { range: '8-10', label: '<0.5m', color: 'emerald' },
        { range: '6-7', label: '0.5-1m', color: 'blue' },
        { range: '4-5', label: '1-1.5m', color: 'yellow' },
        { range: '0-3', label: '>1.5m', color: 'red' },
      ],
    },
    ambientLight: {
      whyItMatters:
        'Lingcod prefer overcast conditions. Cloud cover and light rain actually improve the bite.',
      howCalculated:
        'V2 combines cloud cover and precipitation. Overcast + drizzle scores highest, clear sunny scores lowest.',
      recommendations: {
        excellent: 'Overcast/drizzle - perfect lingcod light.',
        good: 'Cloudy - good conditions.',
        fair: 'Partly cloudy - average.',
        poor: 'Bright sun - fish may be less aggressive.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Overcast', color: 'emerald' },
        { range: '6-7', label: 'Cloudy', color: 'blue' },
        { range: '4-5', label: 'Partly', color: 'yellow' },
        { range: '0-3', label: 'Sunny', color: 'red' },
      ],
    },
    ...genericExplanations.factors,
  },
}

// Rockfish - V2 Algorithm
const rockfishExplanations: SpeciesExplanationData = {
  displayName: 'Rockfish',
  overview:
    'Rockfish are structure-dwelling bottom fish that require slack tide for effective vertical jigging. The V2 algorithm uses exponential decay scoring for current speed and includes RCA (Rockfish Conservation Area) gatekeeper logic.',
  algorithmVersion: 'V2',
  bestConditions:
    'Perfect slack tide with <0.1kt current, neap tides (longer slack windows), golden hour light, calm seas for spot lock positioning.',
  worstConditions: 'Strong current (>1kt), spring tides with brief slack, rough seas, or fishing within RCA closures.',
  weightDistribution: [
    { factor: 'Slack Tide', weight: 40, rationale: 'Critical for vertical presentation over structure' },
    { factor: 'Tidal Range', weight: 10, rationale: 'Neap = longer slack windows' },
    { factor: 'Time of Day', weight: 10, rationale: 'Golden hour light penetration for deep fish' },
    { factor: 'Wind', weight: 20, rationale: 'Must maintain spot lock over structure' },
    { factor: 'Wave Height', weight: 15, rationale: 'Staying precisely over target' },
    { factor: 'Seasonality', weight: 5, rationale: 'Weather feasibility for offshore' },
  ],
  factors: {
    slackTide: {
      whyItMatters:
        'Rockfish jigging requires near-zero current to present baits vertically without snagging. This is the most critical factor.',
      howCalculated:
        'V2 uses exponential decay: score = e^(-0.9 * currentSpeed). At 0kt = 1.0, at 1kt ≈ 0.4, at 2kt ≈ 0.15.',
      recommendations: {
        excellent: 'Perfect slack! Drop jigs now - this window is brief.',
        good: 'Near slack - good vertical presentation possible.',
        fair: 'Moderate flow - angled lines, more snags.',
        poor: 'Not fishable - wait for slack.',
      },
      scoringRanges: [
        { range: '8-10', label: '<0.3kt Slack', color: 'emerald' },
        { range: '6-7', label: '0.3-0.5kt', color: 'blue' },
        { range: '4-5', label: '0.5-1kt', color: 'yellow' },
        { range: '0-3', label: '>1kt', color: 'red' },
      ],
      scientificBasis: 'Exponential decay model based on line angle and snag probability studies.',
    },
    tidalRange: {
      whyItMatters:
        'INVERTED scoring for rockfish: neap tides provide longer slack windows. Spring tides have brief, intense slack periods.',
      howCalculated:
        'V2 inverts normal tidal range scoring. Neap (<1m range) scores highest, spring (>2.5m) scores lowest.',
      recommendations: {
        excellent: 'Neap tide - extended slack windows!',
        good: 'Small range - good slack duration.',
        fair: 'Moderate range - plan timing carefully.',
        poor: 'Spring tide - very brief slack windows.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Neap <1m', color: 'emerald' },
        { range: '6-7', label: '1-1.5m', color: 'blue' },
        { range: '4-5', label: '1.5-2m', color: 'yellow' },
        { range: '0-3', label: 'Spring >2.5m', color: 'red' },
      ],
    },
    timeOfDay: {
      whyItMatters:
        'Golden hours (90 min around sunrise/sunset) provide optimal light penetration for deep-dwelling rockfish.',
      howCalculated:
        'V2 scores golden hours highest (1.0), extended golden (0.8), midday (0.6), twilight (0.5).',
      recommendations: {
        excellent: 'Golden hour - best light conditions!',
        good: 'Extended golden - still productive.',
        fair: 'Midday - rockfish still active at depth.',
        poor: 'Night/twilight - reduced activity.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Golden Hour', color: 'emerald' },
        { range: '6-7', label: 'Extended', color: 'blue' },
        { range: '4-5', label: 'Midday', color: 'yellow' },
        { range: '0-3', label: 'Twilight', color: 'red' },
      ],
    },
    wind: {
      whyItMatters:
        'Rockfish jigging requires precise boat positioning. Wind makes spot lock impossible.',
      howCalculated:
        'V2 uses quadratic decay: score = 1 - (windKnots/20)². Under 8kt ideal, 20kt+ is unsafe.',
      recommendations: {
        excellent: 'Calm - perfect spot lock conditions.',
        good: 'Light wind - manageable positioning.',
        fair: 'Moderate wind - challenging drift control.',
        poor: 'Strong wind - cannot maintain position.',
      },
      scoringRanges: [
        { range: '8-10', label: '<8kt', color: 'emerald' },
        { range: '6-7', label: '8-12kt', color: 'blue' },
        { range: '4-5', label: '12-15kt', color: 'yellow' },
        { range: '0-3', label: '>15kt', color: 'red' },
      ],
    },
    waveHeight: {
      whyItMatters:
        'Must stay precisely over target structure. Waves cause drift and line angle problems.',
      howCalculated:
        'V2 has stricter thresholds than other species. 1.5m limit vs 2m for salmon.',
      recommendations: {
        excellent: 'Flat calm - perfect precision.',
        good: 'Light chop - still effective.',
        fair: 'Moderate waves - challenging.',
        poor: 'Rough - cannot stay over target.',
      },
      scoringRanges: [
        { range: '8-10', label: '<0.5m', color: 'emerald' },
        { range: '6-7', label: '0.5-1m', color: 'blue' },
        { range: '4-5', label: '1-1.5m', color: 'yellow' },
        { range: '0-3', label: '>1.5m', color: 'red' },
      ],
    },
    seasonality: {
      whyItMatters:
        'Based on weather feasibility for offshore fishing. May-September best for offshore conditions.',
      howCalculated:
        'V2 scores by weather window. Peak summer months highest, winter lowest.',
      recommendations: {
        excellent: 'Prime offshore season - consistent weather.',
        good: 'Shoulder season - watch weather windows.',
        fair: 'Marginal - weather-dependent.',
        poor: 'Difficult offshore conditions.',
      },
      scoringRanges: [
        { range: '8-10', label: 'May-Sep', color: 'emerald' },
        { range: '6-7', label: 'Apr/Oct', color: 'blue' },
        { range: '4-5', label: 'Mar/Nov', color: 'yellow' },
        { range: '0-2', label: 'Dec-Feb', color: 'red' },
      ],
    },
    ...genericExplanations.factors,
  },
}

// Pink Salmon - V2 Algorithm
const pinkExplanations: SpeciesExplanationData = {
  displayName: 'Pink Salmon',
  overview:
    'Pink salmon run on odd years in BC and are aggressive surface feeders. The V2 algorithm emphasizes flood tide phase (pushes fish toward rivers), enhanced light conditions with cloud cover, and current flow scoring.',
  algorithmVersion: 'V2',
  bestConditions:
    'Odd years (2025, 2027), flood tide pushing toward river mouths, overcast conditions, moderate current 0.5-2kt, August-September peak.',
  worstConditions: 'Even years (no fish), slack tides, bright sunny conditions, very strong or zero current.',
  weightDistribution: [
    { factor: 'Seasonality', weight: 15, rationale: 'Odd-year runs only, bell curve August-September' },
    { factor: 'Tidal Phase', weight: 15, rationale: 'Flood tide pushes fish toward staging areas' },
    { factor: 'Light Conditions', weight: 15, rationale: 'Cloud cover combined with time of day' },
    { factor: 'Current Flow', weight: 20, rationale: 'Moderate flow 0.5-2kt optimal' },
    { factor: 'Pressure Trend', weight: 10, rationale: 'Rising pressure triggers feeding' },
    { factor: 'Wind', weight: 10, rationale: 'Light chop can improve bite' },
    { factor: 'Wave Height', weight: 10, rationale: 'Safety and fishing effectiveness' },
    { factor: 'Water Clarity', weight: 5, rationale: 'Clear water for visual feeders' },
  ],
  factors: {
    seasonality: {
      whyItMatters:
        'Pink salmon ONLY run in odd years in BC. Within odd years, peak is August-September.',
      howCalculated:
        'V2 checks year first (even years = 0). Odd years use bell curve centered on day 240 (late August).',
      recommendations: {
        excellent: 'Odd year + peak timing = schools everywhere!',
        good: 'Active run window in odd year.',
        fair: 'Early or late in odd year.',
        poor: 'Even year - no pink salmon run.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Odd Year Peak', color: 'emerald' },
        { range: '5-7', label: 'Odd Year Active', color: 'blue' },
        { range: '3-4', label: 'Odd Year Shoulder', color: 'yellow' },
        { range: '0-2', label: 'Even Year', color: 'red' },
      ],
      scientificBasis: 'DFO data confirms 2-year pink salmon lifecycle in BC waters.',
    },
    tidalPhase: {
      whyItMatters:
        'Flood tide pushes pink salmon toward river mouths where they stage. This is a key migration trigger.',
      howCalculated:
        'V2 gives flood (rising) tide with 0.5-2kt current highest score. Ebb tide scores lower.',
      recommendations: {
        excellent: 'Flood tide - fish pushing toward staging areas!',
        good: 'Active ebb - fish still moving.',
        fair: 'Weak flow - fish holding.',
        poor: 'Slack - wait for tide change.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Strong Flood', color: 'emerald' },
        { range: '6-7', label: 'Active Ebb', color: 'blue' },
        { range: '4-5', label: 'Weak Flow', color: 'yellow' },
        { range: '0-3', label: 'Slack', color: 'red' },
      ],
    },
    lightConditions: {
      whyItMatters:
        'Pink salmon prefer overcast conditions combined with dawn/dusk timing. Bright sun pushes them deeper.',
      howCalculated:
        'V2 combines time of day with cloud cover. Dawn/dusk + overcast = maximum score.',
      recommendations: {
        excellent: 'Low light + overcast = aggressive surface feeding!',
        good: 'Good light conditions.',
        fair: 'Brighter conditions - fish may be deeper.',
        poor: 'Bright midday - target deeper water.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Dawn/Dusk Overcast', color: 'emerald' },
        { range: '6-7', label: 'Overcast Day', color: 'blue' },
        { range: '4-5', label: 'Partly Cloudy', color: 'yellow' },
        { range: '0-3', label: 'Bright Sun', color: 'red' },
      ],
    },
    currentFlow: {
      whyItMatters:
        'Pink salmon need moderate current for feeding and migration. Too slack or too strong reduces activity.',
      howCalculated:
        'V2 scores 0.5-2kt as optimal band with smooth decay outside this range.',
      recommendations: {
        excellent: 'Optimal flow - fish are active!',
        good: 'Good current conditions.',
        fair: 'Light or heavy current.',
        poor: 'Slack or extreme - wait for change.',
      },
      scoringRanges: [
        { range: '8-10', label: '0.5-2kt', color: 'emerald' },
        { range: '6-7', label: 'Good Flow', color: 'blue' },
        { range: '4-5', label: 'Light/Heavy', color: 'yellow' },
        { range: '0-3', label: 'Slack/Extreme', color: 'red' },
      ],
    },
    pressureTrend: {
      whyItMatters:
        'Rising pressure triggers aggressive feeding in pink salmon.',
      howCalculated:
        'Standard pressure trend analysis with 6-hour window.',
      recommendations: {
        excellent: 'Rising pressure - aggressive fish!',
        good: 'Stable - consistent action.',
        fair: 'Falling - be patient.',
        poor: 'Rapid change - activity reduced.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Rising', color: 'emerald' },
        { range: '6-7', label: 'Stable', color: 'blue' },
        { range: '4-5', label: 'Falling', color: 'yellow' },
        { range: '0-3', label: 'Rapid', color: 'red' },
      ],
    },
    wind: {
      whyItMatters:
        'Light chop can improve pink salmon fishing. Strong wind is problematic.',
      howCalculated:
        'V2 tolerates moderate wind better than other salmon species.',
      recommendations: {
        excellent: 'Light wind/chop - can improve bite.',
        good: 'Calm or moderate wind.',
        fair: 'Fresh wind - manageable.',
        poor: 'Strong wind - seek shelter.',
      },
      scoringRanges: [
        { range: '8-10', label: '<10kt', color: 'emerald' },
        { range: '6-7', label: '10-15kt', color: 'blue' },
        { range: '4-5', label: '15-20kt', color: 'yellow' },
        { range: '0-3', label: '>20kt', color: 'red' },
      ],
    },
    waveHeight: {
      whyItMatters:
        'Safety and fishing effectiveness. Pink salmon tolerate some chop.',
      howCalculated:
        'Standard wave height scoring with 2m safety limit.',
      recommendations: {
        excellent: 'Calm seas - ideal conditions.',
        good: 'Light chop - still productive.',
        fair: 'Moderate waves - challenging.',
        poor: 'Rough - safety concern.',
      },
      scoringRanges: [
        { range: '8-10', label: '<0.5m', color: 'emerald' },
        { range: '6-7', label: '0.5-1m', color: 'blue' },
        { range: '4-5', label: '1-1.5m', color: 'yellow' },
        { range: '0-3', label: '>1.5m', color: 'red' },
      ],
    },
    waterClarity: {
      whyItMatters:
        'Pink salmon are visual feeders. Clear water improves strike rates.',
      howCalculated:
        'Precipitation proxy - no rain = clear water.',
      recommendations: {
        excellent: 'Crystal clear - fish see lures well.',
        good: 'Good clarity - productive.',
        fair: 'Some turbidity - use brighter colors.',
        poor: 'Muddy - difficult fishing.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Clear', color: 'emerald' },
        { range: '6-7', label: 'Good', color: 'blue' },
        { range: '4-5', label: 'Turbid', color: 'yellow' },
        { range: '0-3', label: 'Muddy', color: 'red' },
      ],
    },
    ...genericExplanations.factors,
  },
}

// Sockeye Salmon - V2 Algorithm
const sockeyeExplanations: SpeciesExplanationData = {
  displayName: 'Sockeye Salmon',
  overview:
    'Sockeye salmon are unique because they do NOT feed during migration. The V2 algorithm uses DFO fishery gatekeeper logic, river-specific run timing, and flood tide preference (pushes fish toward river mouths). Sockeye are "reaction" biters.',
  algorithmVersion: 'V2',
  bestConditions:
    'DFO fishery OPEN, peak run timing for specific river (e.g., Fraser Early Stuart in July), flood tide with moderate flow pushing toward river mouths.',
  worstConditions: 'DFO fishery closed, outside run timing windows, ebb tide, extreme conditions.',
  weightDistribution: [
    { factor: 'Run Timing', weight: 35, rationale: 'River-specific run timing is critical' },
    { factor: 'Tidal Phase', weight: 25, rationale: 'Flood tide pushes fish toward river mouths' },
    { factor: 'Wind', weight: 15, rationale: 'Calm conditions for casting/mooching' },
    { factor: 'Wave Height', weight: 15, rationale: 'Safety and boat control' },
    { factor: 'River Conditions', weight: 10, rationale: 'Discharge and temperature barriers' },
  ],
  factors: {
    runTiming: {
      whyItMatters:
        'Sockeye runs are river-specific with narrow windows. Fraser River alone has 4+ distinct runs (Early Stuart, Late Stuart, Chilko, Adams).',
      howCalculated:
        'V2 checks date against major run timing windows. Peak days (within 14-day window) score highest.',
      recommendations: {
        excellent: 'Peak run timing - schools are concentrated!',
        good: 'Within run window - fish present.',
        fair: 'Early or late in run.',
        poor: 'Outside run windows.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Peak Run', color: 'emerald' },
        { range: '6-7', label: 'Active Run', color: 'blue' },
        { range: '4-5', label: 'Shoulder', color: 'yellow' },
        { range: '0-3', label: 'Between Runs', color: 'red' },
      ],
      scientificBasis: 'Based on DFO Fraser River run timing data for major sockeye stocks.',
    },
    tidalPhase: {
      whyItMatters:
        'FLOOD tide pushes non-feeding sockeye toward river mouths. This is their primary migration trigger.',
      howCalculated:
        'V2 inverts normal salmon preference - flood tide with 0.5-2kt flow scores highest.',
      recommendations: {
        excellent: 'Flood tide - fish pushing toward rivers!',
        good: 'Active flow - fish moving.',
        fair: 'Weak or ebb tide.',
        poor: 'Slack - fish holding, not moving.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Strong Flood', color: 'emerald' },
        { range: '6-7', label: 'Moderate Flood', color: 'blue' },
        { range: '4-5', label: 'Weak/Ebb', color: 'yellow' },
        { range: '0-3', label: 'Slack', color: 'red' },
      ],
    },
    wind: {
      whyItMatters:
        'Sockeye fishing requires precise presentations. Wind makes this difficult.',
      howCalculated:
        'Standard wind scoring - calm conditions preferred.',
      recommendations: {
        excellent: 'Calm - precise presentations possible.',
        good: 'Light wind - manageable.',
        fair: 'Moderate wind - challenging.',
        poor: 'Strong wind - difficult conditions.',
      },
      scoringRanges: [
        { range: '8-10', label: '<10kt', color: 'emerald' },
        { range: '6-7', label: '10-15kt', color: 'blue' },
        { range: '4-5', label: '15-20kt', color: 'yellow' },
        { range: '0-3', label: '>20kt', color: 'red' },
      ],
    },
    waveHeight: {
      whyItMatters:
        'Safety and boat control for river mouth fishing.',
      howCalculated:
        'Standard wave scoring with 2m safety limit.',
      recommendations: {
        excellent: 'Flat calm - ideal.',
        good: 'Light chop - fishable.',
        fair: 'Moderate - challenging.',
        poor: 'Rough - unsafe.',
      },
      scoringRanges: [
        { range: '8-10', label: '<0.5m', color: 'emerald' },
        { range: '6-7', label: '0.5-1m', color: 'blue' },
        { range: '4-5', label: '1-1.5m', color: 'yellow' },
        { range: '0-3', label: '>1.5m', color: 'red' },
      ],
    },
    riverConditions: {
      whyItMatters:
        'High river discharge or warm water can create barriers preventing sockeye entry.',
      howCalculated:
        'V2 factors in discharge levels and water temperature. Extreme values create "holding" conditions.',
      recommendations: {
        excellent: 'Normal flow and temps - fish entering.',
        good: 'Acceptable conditions.',
        fair: 'Marginal - fish may be holding.',
        poor: 'Barrier conditions - fish stacked outside.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Normal', color: 'emerald' },
        { range: '6-7', label: 'Good', color: 'blue' },
        { range: '4-5', label: 'Marginal', color: 'yellow' },
        { range: '0-3', label: 'Barrier', color: 'red' },
      ],
    },
    ...genericExplanations.factors,
  },
}

// Chum Salmon - V2 Algorithm
const chumExplanations: SpeciesExplanationData = {
  displayName: 'Chum Salmon',
  overview:
    'Chum salmon are late-run fish that respond strongly to tidal movement. The V2 algorithm uses combined tidal movement scoring (current + range + ebb direction) and dynamic light calculation with actual sunrise/sunset times.',
  algorithmVersion: 'V2',
  bestConditions:
    'October-November peak, ebb tide during large tidal exchange, dawn/dusk light periods, rising pressure, and 8-12°C water.',
  worstConditions: 'Outside run timing, slack tides, neap tides, bright midday, and muddy water.',
  weightDistribution: [
    { factor: 'Seasonality', weight: 20, rationale: 'Bell curve October-November peak' },
    { factor: 'Tidal Movement', weight: 30, rationale: 'Combined current + range + direction' },
    { factor: 'Optimal Light', weight: 20, rationale: 'Dynamic sunrise/sunset calculation' },
    { factor: 'Water Temp', weight: 10, rationale: '8-12°C optimal range' },
    { factor: 'Pressure Trend', weight: 10, rationale: 'Rising pressure triggers feeding' },
    { factor: 'Water Clarity', weight: 5, rationale: 'Clear water improves visibility' },
    { factor: 'Solunar', weight: 5, rationale: 'Minor lunar influence' },
  ],
  factors: {
    seasonality: {
      whyItMatters:
        'Chum salmon are late-run fish peaking in October-November, after most other salmon.',
      howCalculated:
        'V2 uses bell curve centered on day 295 (late October) with 30-day spread.',
      recommendations: {
        excellent: 'Peak chum season! Fish are aggressive.',
        good: 'Active run window.',
        fair: 'Early or late in run.',
        poor: 'Off-season.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Peak Oct-Nov', color: 'emerald' },
        { range: '5-7', label: 'Active', color: 'blue' },
        { range: '3-4', label: 'Shoulder', color: 'yellow' },
        { range: '0-2', label: 'Off-Season', color: 'red' },
      ],
    },
    tidalMovement: {
      whyItMatters:
        'V2 combines current speed + tidal range + ebb direction. Chum prefer EBB tides during large exchanges.',
      howCalculated:
        'Formula: 0.5*currentScore + 0.3*rangeScore + 0.2*directionScore with 15% ebb bonus.',
      recommendations: {
        excellent: 'Ebb tide + spring tides = perfect chum conditions!',
        good: 'Good tidal movement.',
        fair: 'Moderate conditions.',
        poor: 'Slack or neap - limited movement.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Optimal Combo', color: 'emerald' },
        { range: '6-7', label: 'Good', color: 'blue' },
        { range: '4-5', label: 'Fair', color: 'yellow' },
        { range: '0-3', label: 'Poor', color: 'red' },
      ],
    },
    optimalLight: {
      whyItMatters:
        'Chum feed most aggressively during dawn and dusk. V2 uses actual sunrise/sunset times.',
      howCalculated:
        'Dynamic calculation: 1hr before to 2hr after sunrise/sunset = peak score.',
      recommendations: {
        excellent: 'Dawn/dusk - prime feeding window!',
        good: 'Extended golden hours.',
        fair: 'Midday - fish still catchable.',
        poor: 'Night - reduced activity.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Dawn/Dusk', color: 'emerald' },
        { range: '6-7', label: 'Golden Hour', color: 'blue' },
        { range: '4-5', label: 'Midday', color: 'yellow' },
        { range: '0-3', label: 'Night', color: 'red' },
      ],
    },
    waterTemp: {
      whyItMatters:
        'Chum prefer cooler water 8-12°C as late-season fish.',
      howCalculated:
        'Optimal band scoring with smooth decay outside 8-12°C.',
      recommendations: {
        excellent: 'Perfect temperature range.',
        good: 'Acceptable temps.',
        fair: 'Outside optimal - adjust depths.',
        poor: 'Temperature stress likely.',
      },
      scoringRanges: [
        { range: '8-10', label: '8-12°C', color: 'emerald' },
        { range: '6-7', label: '6-14°C', color: 'blue' },
        { range: '4-5', label: 'Marginal', color: 'yellow' },
        { range: '0-3', label: 'Stress', color: 'red' },
      ],
    },
    pressureTrend: {
      whyItMatters:
        'Rising pressure triggers feeding activity in chum salmon.',
      howCalculated:
        'Standard 6-hour pressure trend analysis.',
      recommendations: {
        excellent: 'Rising - fish are hungry!',
        good: 'Stable conditions.',
        fair: 'Falling - be patient.',
        poor: 'Rapid changes.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Rising', color: 'emerald' },
        { range: '6-7', label: 'Stable', color: 'blue' },
        { range: '4-5', label: 'Falling', color: 'yellow' },
        { range: '0-3', label: 'Rapid', color: 'red' },
      ],
    },
    waterClarity: {
      whyItMatters:
        'Clear water improves visibility for visual feeding.',
      howCalculated:
        'Precipitation proxy for turbidity.',
      recommendations: {
        excellent: 'Clear water - optimal.',
        good: 'Good clarity.',
        fair: 'Some turbidity.',
        poor: 'Muddy.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Clear', color: 'emerald' },
        { range: '6-7', label: 'Good', color: 'blue' },
        { range: '4-5', label: 'Turbid', color: 'yellow' },
        { range: '0-3', label: 'Muddy', color: 'red' },
      ],
    },
    solunar: {
      whyItMatters:
        'Minor influence from lunar cycles on chum feeding.',
      howCalculated:
        'Standard solunar with reduced weighting.',
      recommendations: {
        excellent: 'Major period.',
        good: 'Minor period.',
        fair: 'Near periods.',
        poor: 'Between.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Major', color: 'emerald' },
        { range: '6-7', label: 'Minor', color: 'blue' },
        { range: '4-5', label: 'Near', color: 'yellow' },
        { range: '0-3', label: 'Between', color: 'red' },
      ],
    },
    ...genericExplanations.factors,
  },
}

// Crab - V2 Algorithm
const crabExplanations: SpeciesExplanationData = {
  displayName: 'Dungeness Crab',
  overview:
    'Dungeness crab follow a molt-driven feeding cycle. The V2 algorithm uses water temperature to estimate molt status, inverted moon phase scoring (dark nights = trap reliance), and crepuscular timing.',
  algorithmVersion: 'V2',
  bestConditions:
    'Post-molt period (13-17°C water), dark moon phase, dawn/dusk soak times, active tidal flow for scent dispersal, calm conditions for trap work.',
  worstConditions: 'Active molt period (10-13°C), full moon (crabs forage by sight), slack tides, rough seas.',
  weightDistribution: [
    { factor: 'Molt Cycle', weight: 25, rationale: 'Water temp drives molt timing and hunger' },
    { factor: 'Time of Day', weight: 20, rationale: 'Crepuscular - dawn/dusk activity peaks' },
    { factor: 'Tidal Activity', weight: 20, rationale: 'Current disperses bait scent' },
    { factor: 'Moon Phase', weight: 15, rationale: 'Dark nights = trap reliance' },
    { factor: 'Safety Conditions', weight: 20, rationale: 'Wind + waves for trap operations' },
  ],
  factors: {
    moltCycle: {
      whyItMatters:
        'Crabs are voracious feeders POST-MOLT to rebuild shells. During molt, they hide and dont feed.',
      howCalculated:
        'V2 uses water temperature as proxy: 13-17°C = post-molt feeding (1.0), 10-13°C = molting (0.2), outside = pre-molt or dormant.',
      recommendations: {
        excellent: 'Post-molt! Crabs are feeding aggressively.',
        good: 'Good feeding conditions.',
        fair: 'Pre-molt or dormant period.',
        poor: 'Active molt - crabs are hiding.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Post-Molt 13-17°C', color: 'emerald' },
        { range: '6-7', label: 'Pre-Molt', color: 'blue' },
        { range: '4-5', label: 'Dormant', color: 'yellow' },
        { range: '0-3', label: 'Molting 10-13°C', color: 'red' },
      ],
      scientificBasis: 'Based on Dungeness crab molt cycle studies correlating water temperature with shell hardness.',
    },
    timeOfDay: {
      whyItMatters:
        'Crabs are crepuscular - most active at dawn and dusk. Time soak periods accordingly.',
      howCalculated:
        'V2 scores dawn/dusk windows highest, night good, midday lowest.',
      recommendations: {
        excellent: 'Dawn/dusk - peak crab activity!',
        good: 'Night - good foraging time.',
        fair: 'Morning/evening - moderate activity.',
        poor: 'Midday - crabs resting.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Dawn/Dusk', color: 'emerald' },
        { range: '6-7', label: 'Night', color: 'blue' },
        { range: '4-5', label: 'Morning/Eve', color: 'yellow' },
        { range: '0-3', label: 'Midday', color: 'red' },
      ],
    },
    tidalActivity: {
      whyItMatters:
        'Current disperses bait scent and triggers crab movement. Slack tide = no scent trail.',
      howCalculated:
        'V2 scores moderate current (0.5-1.5kt) highest. Slack and extreme both score poorly.',
      recommendations: {
        excellent: 'Good flow - scent dispersing well!',
        good: 'Moderate current.',
        fair: 'Light flow.',
        poor: 'Slack - no scent dispersal.',
      },
      scoringRanges: [
        { range: '8-10', label: '0.5-1.5kt', color: 'emerald' },
        { range: '6-7', label: 'Moderate', color: 'blue' },
        { range: '4-5', label: 'Light/Heavy', color: 'yellow' },
        { range: '0-3', label: 'Slack', color: 'red' },
      ],
    },
    moonPhase: {
      whyItMatters:
        'INVERTED from fish: Dark nights force crabs to rely on smell (traps) rather than sight foraging.',
      howCalculated:
        'V2 inverts moon scoring: New moon = 1.0, Full moon = 0.5.',
      recommendations: {
        excellent: 'Dark moon - crabs rely on traps!',
        good: 'Quarter moon - good trap success.',
        fair: 'Gibbous - crabs can forage by sight.',
        poor: 'Full moon - crabs dont need traps.',
      },
      scoringRanges: [
        { range: '8-10', label: 'New Moon', color: 'emerald' },
        { range: '6-7', label: 'Quarter', color: 'blue' },
        { range: '4-5', label: 'Gibbous', color: 'yellow' },
        { range: '0-3', label: 'Full Moon', color: 'red' },
      ],
    },
    safetyConditions: {
      whyItMatters:
        'Trap operations require calm conditions for deployment, retrieval, and trap buoy visibility.',
      howCalculated:
        'V2 combines wind and wave scores. Both must be acceptable for safe operations.',
      recommendations: {
        excellent: 'Calm - safe trap work.',
        good: 'Light conditions - manageable.',
        fair: 'Moderate - be careful.',
        poor: 'Rough - postpone trap work.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Calm', color: 'emerald' },
        { range: '6-7', label: 'Light', color: 'blue' },
        { range: '4-5', label: 'Moderate', color: 'yellow' },
        { range: '0-3', label: 'Rough', color: 'red' },
      ],
    },
    ...genericExplanations.factors,
  },
}

// Spot Prawn - V2 Algorithm
const spotPrawnExplanations: SpeciesExplanationData = {
  displayName: 'Spot Prawn',
  overview:
    'Spot prawn have a short DFO-managed season (~6 weeks in May-June). The V2 algorithm uses season and safety gatekeepers, intra-season position decay (first week >> last week), and crepuscular/nocturnal timing.',
  algorithmVersion: 'V2',
  bestConditions:
    'Season OPEN, first week of season, dawn or night, perfect slack tide, neap tides, calm conditions.',
  worstConditions: 'Season CLOSED, late season, midday, strong current, unsafe weather.',
  weightDistribution: [
    { factor: 'Slack Tide', weight: 50, rationale: 'Critical for deep trap fishing' },
    { factor: 'Tidal Range', weight: 10, rationale: 'Neap = longer slack windows' },
    { factor: 'Time of Day', weight: 20, rationale: 'Crepuscular/nocturnal activity' },
    { factor: 'Intra-Season Position', weight: 15, rationale: 'First week highest catch rates' },
    { factor: 'Solunar', weight: 5, rationale: 'Minor lunar influence on invertebrates' },
  ],
  factors: {
    slackTide: {
      whyItMatters:
        'Deep water trap fishing (150-200m) requires near-zero current. Even 0.5kt makes trap work dangerous.',
      howCalculated:
        'V2 has very strict slack requirements: <0.2kt = perfect, 0.2-0.4kt = good, >1kt = too much.',
      recommendations: {
        excellent: 'Perfect slack - deploy/retrieve traps now!',
        good: 'Near slack - acceptable conditions.',
        fair: 'Light flow - challenging trap work.',
        poor: 'Too much current - wait for slack.',
      },
      scoringRanges: [
        { range: '8-10', label: '<0.2kt', color: 'emerald' },
        { range: '6-7', label: '0.2-0.4kt', color: 'blue' },
        { range: '4-5', label: '0.4-0.6kt', color: 'yellow' },
        { range: '0-3', label: '>0.6kt', color: 'red' },
      ],
    },
    tidalRange: {
      whyItMatters:
        'Neap tides provide longer slack windows for deep trap work.',
      howCalculated:
        'INVERTED scoring like rockfish: neap tides score higher.',
      recommendations: {
        excellent: 'Neap tide - extended slack windows.',
        good: 'Small range - reasonable slack.',
        fair: 'Moderate range - plan carefully.',
        poor: 'Spring tide - very brief slack.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Neap <1m', color: 'emerald' },
        { range: '6-7', label: '1-1.5m', color: 'blue' },
        { range: '4-5', label: '1.5-2m', color: 'yellow' },
        { range: '0-3', label: 'Spring >2.5m', color: 'red' },
      ],
    },
    timeOfDay: {
      whyItMatters:
        'Spot prawns are crepuscular/nocturnal. Dawn = best, night = good, midday = poor.',
      howCalculated:
        'V2 scores dawn window highest (1hr before to 1hr after sunrise), night good, midday lowest.',
      recommendations: {
        excellent: 'Dawn - peak prawn activity!',
        good: 'Dusk or night - good activity.',
        fair: 'Early morning - moderate.',
        poor: 'Midday - prawns hiding.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Dawn', color: 'emerald' },
        { range: '6-7', label: 'Dusk/Night', color: 'blue' },
        { range: '4-5', label: 'Morning/Eve', color: 'yellow' },
        { range: '0-3', label: 'Midday', color: 'red' },
      ],
    },
    intraSeasonPosition: {
      whyItMatters:
        'First week of season has highest catch rates. Linear decay to ~60% by season end.',
      howCalculated:
        'V2: Week 1 = 1.0, linear decay to 0.6 by week 6.',
      recommendations: {
        excellent: 'Opening week - highest catch rates!',
        good: 'Early season - good catches.',
        fair: 'Mid season - catch rates declining.',
        poor: 'Late season - reduced catches.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Week 1', color: 'emerald' },
        { range: '6-7', label: 'Week 2-3', color: 'blue' },
        { range: '4-5', label: 'Week 4-5', color: 'yellow' },
        { range: '0-3', label: 'Week 6+', color: 'red' },
      ],
    },
    solunar: {
      whyItMatters:
        'Minor evidence of lunar influence on deep invertebrate activity.',
      howCalculated:
        'Standard solunar with minimal weighting.',
      recommendations: {
        excellent: 'Major period.',
        good: 'Minor period.',
        fair: 'Near periods.',
        poor: 'Between.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Major', color: 'emerald' },
        { range: '6-7', label: 'Minor', color: 'blue' },
        { range: '4-5', label: 'Near', color: 'yellow' },
        { range: '0-3', label: 'Between', color: 'red' },
      ],
    },
    ...genericExplanations.factors,
  },
}

// Export all species explanations
export const speciesExplanations: SpeciesExplanations = {
  chinook: chinookExplanations,
  'chinook-salmon': chinookExplanations,
  coho: cohoExplanations,
  'coho-salmon': cohoExplanations,
  halibut: halibutExplanations,
  'pacific-halibut': halibutExplanations,
  lingcod: lingcodExplanations,
  rockfish: rockfishExplanations,
  pink: pinkExplanations,
  'pink-salmon': pinkExplanations,
  sockeye: sockeyeExplanations,
  'sockeye-salmon': sockeyeExplanations,
  chum: chumExplanations,
  'chum-salmon': chumExplanations,
  crab: crabExplanations,
  'dungeness-crab': crabExplanations,
  'spot-prawn': spotPrawnExplanations,
  spotprawn: spotPrawnExplanations,
  prawn: spotPrawnExplanations,
  default: genericExplanations,
}

// Helper function to get explanations for a species
export function getSpeciesExplanations(speciesId: string): SpeciesExplanationData {
  const normalized = speciesId.toLowerCase().replace(/\s+/g, '-')
  return speciesExplanations[normalized] || speciesExplanations.default
}

// Helper function to get a specific factor explanation
export function getFactorExplanation(speciesId: string, factorKey: string): FactorExplanation | undefined {
  const species = getSpeciesExplanations(speciesId)
  return species.factors[factorKey]
}

// Helper to get recommendation based on score
export function getRecommendationForScore(
  speciesId: string,
  factorKey: string,
  score: number
): string {
  const explanation = getFactorExplanation(speciesId, factorKey)
  if (!explanation) return ''

  if (score >= 8) return explanation.recommendations.excellent
  if (score >= 6) return explanation.recommendations.good
  if (score >= 4) return explanation.recommendations.fair
  return explanation.recommendations.poor
}

// Helper to get score label
export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 8) return { label: 'Excellent', color: 'emerald' }
  if (score >= 6) return { label: 'Good', color: 'blue' }
  if (score >= 4) return { label: 'Fair', color: 'yellow' }
  return { label: 'Poor', color: 'red' }
}
