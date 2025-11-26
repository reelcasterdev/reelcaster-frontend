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
  // Legacy factor keys for backwards compatibility
  | 'pressure'
  | 'tideDirection'
  | 'tidalRange'
  | 'windSpeed'
  | 'waveHeight'
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

// Coho Salmon
const cohoExplanations: SpeciesExplanationData = {
  displayName: 'Coho Salmon',
  overview:
    'Coho (Silver) salmon are aggressive feeders known for surface strikes and acrobatic fights. They respond well to changing conditions and can be caught throughout the day, though they prefer low-light periods.',
  algorithmVersion: 'V1',
  bestConditions:
    'Late summer through fall (August-October), overcast skies, moderate tidal flow, baitfish presence, and post-frontal conditions.',
  worstConditions:
    'Winter months, very clear and calm conditions, slack tides, and extreme weather.',
  weightDistribution: [
    { factor: 'Seasonality', weight: 18, rationale: 'Coho runs are highly seasonal' },
    { factor: 'Tidal Current', weight: 15, rationale: 'Coho actively hunt during tide changes' },
    { factor: 'Light/Time', weight: 12, rationale: 'Prefer low light but feed throughout day' },
    { factor: 'Sea State', weight: 12, rationale: 'Tolerate choppier conditions than Chinook' },
    { factor: 'Pressure Trend', weight: 10, rationale: 'Respond strongly to weather changes' },
    { factor: 'Water Temp', weight: 10, rationale: 'Prefer cooler water than Chinook' },
    { factor: 'Catch Reports', weight: 10, rationale: 'Indicates school presence' },
    { factor: 'Solunar', weight: 8, rationale: 'Moderate solunar influence' },
    { factor: 'Precipitation', weight: 5, rationale: 'Less affected by rain' },
  ],
  factors: {
    seasonality: {
      whyItMatters:
        'Coho salmon runs in BC typically peak from August through October, later than Chinook. Their timing varies by stock, but fall is prime time as they stage for spawning.',
      howCalculated:
        'Date-based scoring adjusted for regional Coho run timing. Peak fall months score highest.',
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
    },
    lightTime: {
      whyItMatters:
        'While Coho prefer low-light periods, they are more aggressive daytime feeders than Chinook. Overcast days can produce all-day action.',
      howCalculated: 'Similar to Chinook but with less penalty for midday periods, especially under cloud cover.',
      recommendations: {
        excellent: 'Prime feeding window! Coho are aggressive and willing to chase.',
        good: 'Active period. Standard techniques should produce.',
        fair: 'Fish are still feeding but may be selective.',
        poor: 'Slower period. Try flashier presentations.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Dawn/Dusk', color: 'emerald' },
        { range: '6-7', label: 'Overcast Day', color: 'blue' },
        { range: '4-5', label: 'Morning/Eve', color: 'yellow' },
        { range: '0-3', label: 'Bright Midday', color: 'red' },
      ],
    },
    pressureTrend: {
      whyItMatters:
        'Coho are known to feed aggressively before weather fronts arrive. Falling pressure can actually trigger feeding, unlike with some species.',
      howCalculated:
        'Both rising and slowly falling pressure score well for Coho. Only rapid, erratic changes score poorly.',
      recommendations: {
        excellent: 'Ideal pressure conditions for Coho activity.',
        good: 'Good feeding conditions. Fish should be active.',
        fair: 'Transitional conditions. Be ready to adapt.',
        poor: 'Unstable pressure. Fish may be unpredictable.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Stable/Rising', color: 'emerald' },
        { range: '6-7', label: 'Pre-Front', color: 'blue' },
        { range: '4-5', label: 'Changing', color: 'yellow' },
        { range: '0-3', label: 'Unstable', color: 'red' },
      ],
    },
    solunar: {
      whyItMatters:
        'Coho respond to solunar periods but are generally less affected than Chinook. They will feed throughout the day when conditions are right.',
      howCalculated: 'Standard solunar calculation with slightly reduced weighting.',
      recommendations: {
        excellent: 'Major solunar period - expect aggressive fish.',
        good: 'Minor period - elevated activity.',
        fair: 'Between periods - rely on other factors.',
        poor: 'Far from solunar windows.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Major', color: 'emerald' },
        { range: '6-7', label: 'Minor', color: 'blue' },
        { range: '4-5', label: 'Near', color: 'yellow' },
        { range: '0-3', label: 'Between', color: 'red' },
      ],
    },
    catchReports: {
      whyItMatters:
        'Coho often travel in schools, so recent catch reports indicate where fish are holding. They can move quickly, so fresh reports are essential.',
      howCalculated: 'Recent reports weighted heavily. Coho-specific catches valued more than general reports.',
      recommendations: {
        excellent: 'School located! Get there quickly - Coho can move.',
        good: 'Recent catches in area. Fish are present.',
        fair: 'Older reports. Fish may have moved.',
        poor: 'No recent Coho reports. Scout new areas.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Hot', color: 'emerald' },
        { range: '6-7', label: 'Active', color: 'blue' },
        { range: '4-5', label: 'Mixed', color: 'yellow' },
        { range: '0-3', label: 'Quiet', color: 'red' },
      ],
    },
    tidalCurrent: {
      whyItMatters:
        'Coho actively hunt baitfish during tide changes and moderate current. They are more aggressive feeders than Chinook and tolerate stronger current.',
      howCalculated: 'Moderate to strong current scores well. Slack tides are still slow for Coho.',
      recommendations: {
        excellent: 'Perfect current for Coho hunting. Work the tide rips.',
        good: 'Good flow - fish are actively feeding.',
        fair: 'Light current - fish may be scattered.',
        poor: 'Slack or extreme current - wait for change.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Ideal Flow', color: 'emerald' },
        { range: '6-7', label: 'Good', color: 'blue' },
        { range: '4-5', label: 'Light', color: 'yellow' },
        { range: '0-3', label: 'Slack', color: 'red' },
      ],
    },
    seaState: {
      whyItMatters:
        'Coho are less bothered by rough water than Chinook. Some chop can improve fishing by breaking up light and disorienting baitfish.',
      howCalculated: 'Higher tolerance for rough conditions. Only very rough seas score poorly.',
      recommendations: {
        excellent: 'Great conditions. Fish the surface and mid-water.',
        good: 'Some chop - often improves the bite.',
        fair: 'Getting rough but still fishable.',
        poor: 'Too rough for effective fishing.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Ideal', color: 'emerald' },
        { range: '6-7', label: 'Good Chop', color: 'blue' },
        { range: '4-5', label: 'Moderate', color: 'yellow' },
        { range: '0-3', label: 'Rough', color: 'red' },
      ],
    },
    waterTemp: {
      whyItMatters: 'Coho prefer slightly cooler water than Chinook, ideally 8-12°C. They often hold higher in the water column when temperatures are right.',
      howCalculated: 'Optimal range 8-12°C scores highest. Warmer temperatures score lower than for Chinook.',
      recommendations: {
        excellent: 'Perfect temperature for Coho. They may be near surface.',
        good: 'Good temperatures - fish at standard depths.',
        fair: 'Warmer than ideal - fish deeper.',
        poor: 'Temperature stress - fish very deep or absent.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Optimal 8-12°C', color: 'emerald' },
        { range: '6-7', label: 'Good 6-14°C', color: 'blue' },
        { range: '4-5', label: 'Marginal', color: 'yellow' },
        { range: '0-3', label: 'Stress', color: 'red' },
      ],
    },
    precipitation: {
      whyItMatters: 'Coho are less affected by rain than some species. Light rain can improve action. Only heavy storms are problematic.',
      howCalculated: 'Rain has less negative impact on Coho scoring. Only heavy precipitation scores poorly.',
      recommendations: {
        excellent: 'Clear or light rain - ideal.',
        good: 'Moderate rain - Coho dont mind.',
        fair: 'Heavier rain - still fishable.',
        poor: 'Heavy storms - seek shelter.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Clear/Light', color: 'emerald' },
        { range: '6-7', label: 'Moderate', color: 'blue' },
        { range: '4-5', label: 'Steady', color: 'yellow' },
        { range: '0-3', label: 'Heavy', color: 'red' },
      ],
    },
    // Include legacy factors from Chinook for V1 compatibility
    pressure: chinookExplanations.factors.pressure,
    tideDirection: chinookExplanations.factors.tideDirection,
    tidalRange: chinookExplanations.factors.tidalRange,
    windSpeed: chinookExplanations.factors.windSpeed,
    waveHeight: chinookExplanations.factors.waveHeight,
    cloudCover: chinookExplanations.factors.cloudCover,
    temperature: chinookExplanations.factors.temperature,
    visibility: chinookExplanations.factors.visibility,
  },
}

// Halibut
const halibutExplanations: SpeciesExplanationData = {
  displayName: 'Halibut',
  overview:
    'Pacific halibut are bottom-dwelling flatfish that respond to different factors than salmon. Tidal current and bottom structure are critical, while surface conditions matter less. Halibut are ambush predators that feed during current flow.',
  algorithmVersion: 'V1',
  bestConditions:
    'Moderate tidal current over productive structure, spring through summer (May-August), stable weather, and recent catches in the area.',
  worstConditions: 'Slack tides, winter months, extreme currents, and rough seas that prevent anchoring.',
  weightDistribution: [
    { factor: 'Tidal Current', weight: 25, rationale: 'Halibut feed actively during current flow' },
    { factor: 'Seasonality', weight: 15, rationale: 'Migration patterns affect availability' },
    { factor: 'Sea State', weight: 15, rationale: 'Need calm enough to anchor and fish bottom' },
    { factor: 'Catch Reports', weight: 12, rationale: 'Indicates productive structure' },
    { factor: 'Pressure Trend', weight: 10, rationale: 'Stable pressure improves bite' },
    { factor: 'Water Temp', weight: 8, rationale: 'Bottom temps affect activity' },
    { factor: 'Light/Time', weight: 8, rationale: 'Less dependent on light as bottom fish' },
    { factor: 'Solunar', weight: 5, rationale: 'Some response to lunar cycles' },
    { factor: 'Precipitation', weight: 2, rationale: 'Minimal impact on bottom fish' },
  ],
  factors: {
    seasonality: {
      whyItMatters:
        'Halibut migrate seasonally, moving into shallower coastal waters from May through August for feeding. Winter months see fish in deeper offshore waters.',
      howCalculated: 'Peak season (May-August) scores highest. Shoulder months and winter score lower.',
      recommendations: {
        excellent: 'Prime halibut season! Fish are in accessible depths and feeding actively.',
        good: 'Good timing. Fish are present but may require searching.',
        fair: 'Shoulder season. Fish are transitioning - check depths.',
        poor: 'Off-season. Halibut are deep and scattered.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Peak May-Aug', color: 'emerald' },
        { range: '5-7', label: 'Active', color: 'blue' },
        { range: '3-4', label: 'Shoulder', color: 'yellow' },
        { range: '0-2', label: 'Winter', color: 'red' },
      ],
    },
    tidalCurrent: {
      whyItMatters:
        'Halibut are ambush predators that rely on current to bring food to them. They feed actively during moderate current and often shut down during slack tides.',
      howCalculated: 'Moderate current (1-2 knots) scores highest. Both slack and very strong current reduce scores.',
      recommendations: {
        excellent: 'Perfect current for halibut! They are actively feeding. Present baits near bottom structure.',
        good: 'Good flow. Halibut should be responsive.',
        fair: 'Light or heavy current. Fishing may be challenging.',
        poor: 'Slack tide or extreme current. Wait for better flow.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Prime 1-2kt', color: 'emerald' },
        { range: '6-7', label: 'Good', color: 'blue' },
        { range: '4-5', label: 'Light/Heavy', color: 'yellow' },
        { range: '0-3', label: 'Slack/Extreme', color: 'red' },
      ],
    },
    seaState: {
      whyItMatters:
        'Calm seas are critical for halibut fishing since you need to maintain position over structure. Rough conditions make anchoring dangerous and bottom fishing ineffective.',
      howCalculated:
        'Very calm conditions score highest. Any significant sea state reduces the score more than for salmon.',
      recommendations: {
        excellent: 'Perfect conditions for halibut. You can hold position precisely.',
        good: 'Light chop - still very fishable.',
        fair: 'Getting rough - consider moving to protected spots.',
        poor: 'Too rough for effective halibut fishing.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Flat Calm', color: 'emerald' },
        { range: '6-7', label: 'Light', color: 'blue' },
        { range: '4-5', label: 'Choppy', color: 'yellow' },
        { range: '0-3', label: 'Rough', color: 'red' },
      ],
    },
    catchReports: {
      whyItMatters:
        'Halibut reports indicate productive bottom structure. Unlike salmon, halibut tend to stay in areas with good structure, so recent reports remain relevant longer.',
      howCalculated: 'Reports weighted by recency and location specificity. Structure-related info valued highly.',
      recommendations: {
        excellent: 'Hot spot identified! Head there with confidence.',
        good: 'Recent catches in area. Fish the known structure.',
        fair: 'Older reports. Structure may still hold fish.',
        poor: 'No reports. Scout new areas or try proven spots.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Hot', color: 'emerald' },
        { range: '6-7', label: 'Active', color: 'blue' },
        { range: '4-5', label: 'Older', color: 'yellow' },
        { range: '0-3', label: 'None', color: 'red' },
      ],
    },
    lightTime: {
      whyItMatters:
        'As bottom fish, halibut are less affected by light conditions than salmon. However, they do show increased activity during low-light periods.',
      howCalculated: 'Dawn and dusk get a bonus, but midday is not heavily penalized.',
      recommendations: {
        excellent: 'Low light period - halibut may be more active.',
        good: 'Good fishing time. Standard approaches work.',
        fair: 'Midday - fish are still catchable.',
        poor: 'Bright conditions may slow the bite slightly.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Dawn/Dusk', color: 'emerald' },
        { range: '6-7', label: 'Morning/Eve', color: 'blue' },
        { range: '4-5', label: 'Midday', color: 'yellow' },
        { range: '2-3', label: 'Bright', color: 'red' },
      ],
    },
    pressureTrend: {
      whyItMatters:
        'Stable pressure creates consistent conditions for bottom fishing. Rising pressure can improve the bite, while rapid changes may slow things down.',
      howCalculated: 'Stable or rising pressure scores well. Rapid changes score lower.',
      recommendations: {
        excellent: 'Stable conditions - halibut should be feeding.',
        good: 'Good pressure trend.',
        fair: 'Changing pressure - be patient.',
        poor: 'Unstable - halibut may be inactive.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Stable', color: 'emerald' },
        { range: '6-7', label: 'Rising', color: 'blue' },
        { range: '4-5', label: 'Falling', color: 'yellow' },
        { range: '0-3', label: 'Unstable', color: 'red' },
      ],
    },
    waterTemp: {
      whyItMatters: 'Halibut are cold-water fish comfortable in temperatures from 3-10°C. Bottom temperatures are more relevant than surface temps.',
      howCalculated: 'Optimal range 4-8°C scores highest. Warmer temperatures reduce score.',
      recommendations: {
        excellent: 'Ideal bottom temperatures for halibut.',
        good: 'Acceptable range - fish should be active.',
        fair: 'Temperature outside ideal - fish deeper.',
        poor: 'Temperature stress likely.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Optimal 4-8°C', color: 'emerald' },
        { range: '6-7', label: 'Good 3-10°C', color: 'blue' },
        { range: '4-5', label: 'Marginal', color: 'yellow' },
        { range: '0-3', label: 'Stress', color: 'red' },
      ],
    },
    solunar: {
      whyItMatters: 'Halibut show some response to solunar periods, but less pronounced than salmon. Major periods may increase activity.',
      howCalculated: 'Standard solunar with reduced weighting for bottom fish.',
      recommendations: {
        excellent: 'Major period - worth noting for halibut.',
        good: 'Minor period - some effect possible.',
        fair: 'Between periods.',
        poor: 'Far from windows.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Major', color: 'emerald' },
        { range: '6-7', label: 'Minor', color: 'blue' },
        { range: '4-5', label: 'Near', color: 'yellow' },
        { range: '0-3', label: 'Between', color: 'red' },
      ],
    },
    precipitation: {
      whyItMatters:
        'As bottom fish, halibut are minimally affected by surface precipitation. Only consider it for safety and comfort.',
      howCalculated: 'Minimal impact on scoring. Only extreme weather reduces score.',
      recommendations: {
        excellent: 'Clear weather - comfortable fishing.',
        good: 'Light rain - no impact on halibut.',
        fair: 'Moderate rain - dress appropriately.',
        poor: 'Heavy storm - safety concern.',
      },
      scoringRanges: [
        { range: '8-10', label: 'Clear', color: 'emerald' },
        { range: '6-7', label: 'Rain', color: 'blue' },
        { range: '4-5', label: 'Heavy', color: 'yellow' },
        { range: '0-3', label: 'Storm', color: 'red' },
      ],
    },
    // Legacy factors
    pressure: chinookExplanations.factors.pressure,
    tideDirection: chinookExplanations.factors.tideDirection,
    tidalRange: chinookExplanations.factors.tidalRange,
    windSpeed: chinookExplanations.factors.windSpeed,
    waveHeight: chinookExplanations.factors.waveHeight,
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

// Export all species explanations
export const speciesExplanations: SpeciesExplanations = {
  chinook: chinookExplanations,
  'chinook-salmon': chinookExplanations,
  coho: cohoExplanations,
  'coho-salmon': cohoExplanations,
  halibut: halibutExplanations,
  'pacific-halibut': halibutExplanations,
  // Map other species to generic for now
  lingcod: {
    ...genericExplanations,
    displayName: 'Lingcod',
    overview:
      'Lingcod are aggressive bottom predators found around rocky structure. They respond well to current flow and are less affected by light conditions than salmon.',
  },
  rockfish: {
    ...genericExplanations,
    displayName: 'Rockfish',
    overview:
      'Rockfish are structure-oriented bottom fish. They hold near rocky reefs and are most active during moderate current. Less migratory than salmon.',
  },
  pink: {
    ...genericExplanations,
    displayName: 'Pink Salmon',
    overview:
      'Pink salmon run on odd years (2023, 2025, etc.) and are aggressive surface feeders when present. They travel in large schools and respond well to flashy presentations.',
  },
  'pink-salmon': {
    ...genericExplanations,
    displayName: 'Pink Salmon',
    overview:
      'Pink salmon run on odd years and are aggressive surface feeders when present. They travel in large schools and respond well to flashy presentations.',
  },
  sockeye: {
    ...genericExplanations,
    displayName: 'Sockeye Salmon',
    overview:
      'Sockeye salmon are plankton feeders that can be challenging to catch on hook and line. They travel in dense schools and are highly seasonal.',
  },
  'sockeye-salmon': {
    ...genericExplanations,
    displayName: 'Sockeye Salmon',
    overview:
      'Sockeye salmon are plankton feeders that can be challenging to catch on hook and line. They travel in dense schools and are highly seasonal.',
  },
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
