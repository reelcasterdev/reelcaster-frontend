# Species Algorithms V2 Implementation Plan

This document outlines the comprehensive V2 upgrade plan for all species-specific fishing score algorithms. Each species has been analyzed by AI (Gemini Pro) for biological accuracy and practical fishing relevance in BC waters.

## Executive Summary

The V2 algorithms represent a significant upgrade from V1, incorporating:
- **Dynamic time-based calculations** (sunrise/sunset instead of hardcoded hours)
- **Pressure trend analysis** (falling/stable/rising barometer)
- **Tidal phase/direction** (ebb vs flood, slack windows)
- **Extended context** (fishing reports, solunar data, catch intel)
- **Regulatory awareness** (DFO closures, conservation areas)
- **Improved biological accuracy** based on species-specific behavior

---

## Common V2 Architecture

### Extended Context Interface
All V2 algorithms should accept this extended context:

```typescript
interface ExtendedAlgorithmContextV2 {
  // Time context
  sunrise: number;           // Unix timestamp
  sunset: number;            // Unix timestamp

  // Location context
  latitude: number;
  longitude: number;
  locationName?: string;

  // Pressure history (for trend analysis)
  pressureHistory: number[]; // Last 6-12 hours

  // Fishing reports (catch intel)
  fishingReports?: FishingReportData;

  // Solunar data
  solunarMajor?: boolean;
  solunarMinor?: boolean;

  // Cloud cover (for light conditions)
  cloudCover?: number;       // 0-100%

  // Recent precipitation (for water clarity)
  precipitation24h?: number; // mm in last 24 hours

  // Tide phase/direction
  tidePhase?: 'flood' | 'ebb' | 'slack';
  tideDirection?: 'rising' | 'falling' | 'slack';
  timeToNextSlack?: number;  // minutes
}
```

### V2 Result Interface
```typescript
interface SpeciesScoreResultV2 {
  total: number;
  factors: {
    [key: string]: {
      value: number | string;
      weight: number;
      score: number;
      description?: string;
    }
  };
  speciesFactors?: {
    [key: string]: {
      score: number;
      weight: number;
      value: number | string;
      description?: string;
    }
  };
  isSafe: boolean;
  safetyWarnings: string[];
  isInSeason?: boolean;
  algorithmVersion: string;
}
```

---

## Species-Specific V2 Plans

### 1. Pink Salmon V2

**Current V1 Issues:**
- Rigid odd-year only seasonality with hard-coded dates
- Static time-of-day scoring
- Missing tidal phase (ebb is critical near river mouths)
- Missing water clarity factor (turbidity from rain)
- Missing barometric pressure trend

**V2 Weight Distribution:**
| Factor | V1 Weight | V2 Weight |
|--------|-----------|-----------|
| Seasonality (odd-year + date curve) | 30% | 25% |
| Tidal Phase (NEW - ebb preferred) | 0% | 20% |
| Light Conditions (sunrise/sunset + cloud) | 15% | 10% |
| Current Flow | 15% | 10% |
| Water Clarity (NEW - precip proxy) | 0% | 10% |
| Water Temperature | 10% | 10% |
| Barometric Pressure (NEW - trend) | 0% | 5% |
| Precipitation | 10% | 5% |
| Surface Conditions (wind/wave combined) | 10% | 5% |

**V2 Key Changes:**
1. Replace hard-coded dates with bell-curve centered on mid-August (day ~227)
2. Add tidal phase factor - ebb tide preferred near estuaries
3. Calculate light score from actual sunrise/sunset times with cloud cover modifier
4. Add water clarity factor - infer from 24h precipitation
5. Add barometric pressure trend (3-6 hour change)
6. Remove tidal range (redundant with current flow)

---

### 2. Coho Salmon V2

**Current V1 Issues:**
- Static time-of-day with hardcoded hours
- Missing cloud cover (critical for visual hunters)
- Missing barometric pressure trend
- Slack tide penalty misses "tide turn" feeding trigger
- Rigid monthly seasonality

**V2 Weight Distribution:**
| Factor | V1 Weight | V2 Weight |
|--------|-----------|-----------|
| Seasonality (smoothed curve) | 25% | 30% |
| Light & Cloud Cover (combined) | 20% | 25% |
| Current Flow (with tide turn logic) | 20% | 15% |
| Barometric Pressure Trend (NEW) | 0% | 10% |
| Tidal Range | 10% | 5% |
| Precipitation | 10% | 5% |
| Wind | 5% | 5% |
| Wave Height | 5% | 5% |
| Water Temperature | 5% | 0% (removed - rarely limiting) |

**V2 Key Changes:**
1. Dynamic light calculation using sunrise/sunset times
2. Cloud cover bonus: `dayScore = baseDayScore + (0.4 * (cloudCover / 100))`
3. Smooth seasonality curve (linear ramp Aug 1 → Sep 15 peak → Oct 31)
4. Add barometric pressure trend factor
5. Modify slack tide to reward "tide turn" windows (+/- 45 min of high/low)
6. Remove water temperature (rarely a day-to-day factor for coastal Coho)

---

### 3. Halibut V2

**Current V1 Issues:**
- Moon phase is redundant with tidal range (both measure same effect)
- Missing "tidal slope" - the bite window around slack
- Static point-in-time analysis (misses transition periods)
- Missing barometric pressure trend

**V2 Weight Distribution:**
| Factor | V1 Weight | V2 Weight |
|--------|-----------|-----------|
| Tidal Range | 25% | 20% |
| Tidal Slope / Proximity to Slack (NEW) | 0% | 30% |
| Seasonality | 15% | 15% |
| Barometric Pressure Trend (NEW) | 0% | 10% |
| Wind | 10% | 10% |
| Wave Height | 10% | 10% |
| Light & Tide Interaction (revised) | 5% | 5% |
| Moon Phase | 10% | 0% (removed - redundant) |
| Current Flow | 25% | 0% (replaced by Tidal Slope) |

**V2 Key Changes:**
1. Implement "Tidal Slope" factor using tide height changes (T-2h, T-1h, T, T+1h)
2. Remove moon phase (redundant with direct tidal range measurement)
3. Add barometric pressure trend
4. Light factor rewards intersection of low-light + slack tide
5. Use actual tide heights to calculate current slope rather than current speed

---

### 4. Lingcod V2

**Current V1 Issues:**
- Tidal contradiction: rewards both slack tide AND large tidal range
- Seasonality is regulatory-only, misses biological peaks
- Missing barometric pressure trend
- Missing tide direction (ebb preferred)

**V2 Weight Distribution:**
| Factor | V1 Weight | V2 Weight |
|--------|-----------|-----------|
| Tidal Dynamics (combined + interaction) | 50% | 40% |
| Biological Window (season + time) | 20% | 20% |
| Atmospheric Conditions (pressure + wind) | 15% | 20% |
| Safety & Fishability (wave) | 10% | 10% |
| Ambient Light (cloud/precip) | 5% | 10% |

**V2 Key Changes:**
1. Combine slack tide and tidal range with interaction model:
   - `tidalDynamicsScore = slackScore * (0.5 + 0.5 * tidalRangeScore)`
   - Add ebb tide bonus (+0.1)
2. Add biological seasonality within open season (April-May post-spawn = 1.0)
3. Add barometric pressure trend (falling = good)
4. Add "prime time" multiplier when multiple conditions align

---

### 5. Rockfish V2

**Current V1 Issues:**
- Seasonality is oversimplified - misses RCA closures
- "Other factors" is weak and tenuous
- Missing regulatory status check
- Missing barotrauma advisory

**V2 Weight Distribution:**
| Factor | V1 Weight | V2 Weight |
|--------|-----------|-----------|
| Regulatory Status (NEW - gatekeeper) | 0% | Multiplier |
| Slack Tide | 35% | 40% |
| Wind | 20% | 20% |
| Wave Height | 20% | 15% |
| Tidal Range | 10% | 10% |
| Time of Day (NEW) | 0% | 10% |
| Seasonality (weather feasibility) | 10% | 5% |
| Other Factors | 5% | 0% (removed) |

**V2 Key Changes:**
1. Add regulatory gatekeeper - check RCA closures, return 0 if prohibited
2. Add time of day factor (reward golden hours - 90 min around sunrise/sunset)
3. Add barotrauma advisory in results (not affecting score, but informational)
4. Remove weak "other factors" - reallocate weight
5. Use smoother scoring curves instead of rigid if/else blocks

---

### 6. Sockeye Salmon V2

**Current V1 Issues:**
- Fundamental context mismatch - algorithm designed for feeding fish, but Sockeye are migratory/non-feeding
- Missing fishery openings/closures (DFO management critical)
- Generic June-August window ignores river-specific timing
- Tidal logic misapplied for migratory fish

**V2 Weight Distribution:**
| Factor | V1 Weight | V2 Weight |
|--------|-----------|-----------|
| Fishery Status (DFO) (NEW) | 0% | Gatekeeper |
| River-Specific Run Timing (NEW) | 30% | 40% |
| Tidal Phase (flood preferred) | 35% | 20% |
| River Conditions (NEW - discharge, temp) | 0% | 15% |
| Light/Time | 15% | 15% |
| Barometric Pressure | 10% | 10% |
| Current Flow | 20% | 0% (merged into Tidal Phase) |
| Tidal Range | 15% | 0% (merged into Tidal Phase) |
| Water Temperature | 10% | 0% (replaced by River Conditions) |

**V2 Key Changes:**
1. Add DFO fishery status gatekeeper (closed = 0 score)
2. Implement river-specific run timing with proximity bonus
3. Replace current/tide factors with tidal phase (flood tide = fish pushing into river)
4. Add river conditions factor (discharge + temperature barriers)
5. Remove generic temperature factor - replace with river barrier logic

**Note:** Sockeye requires the most significant redesign due to fundamental behavioral differences.

---

### 7. Chum Salmon V2

**Current V1 Issues:**
- Static time-of-day with hardcoded hours
- Water temperature uses air temp as fallback (inaccurate)
- Static barometric pressure (trend matters more)
- Missing tidal direction
- Precipitation oversimplified

**V2 Weight Distribution:**
| Factor | V1 Weight | V2 Weight |
|--------|-----------|-----------|
| Tidal Movement (NEW - combined with direction) | 40% | 30% |
| Optimal Light (dynamic sunrise/sunset) | 10% | 20% |
| Seasonality | 25% | 20% |
| Water Temperature | 10% | 10% |
| Pressure Trend (NEW) | 10% | 10% |
| Water Clarity (NEW - precip proxy) | 0% | 5% |
| Solunar (NEW) | 0% | 5% |

**V2 Key Changes:**
1. Combine current + tidal range + direction into unified "Tidal Movement" factor
2. Add ebb tide multiplier (better for bait concentration)
3. Dynamic light scoring using actual sunrise/sunset
4. Replace static pressure with trend analysis
5. Add water clarity factor (24h precipitation proxy)
6. Add solunar phase for consistency with other V2 algorithms

---

### 8. Crab (Dungeness) V2

**Current V1 Issues:**
- Redundant tidal factors (current + range both measure tide effect)
- Seasonality uses month as proxy for molt (temperature is direct driver)
- Oversimplified wave model
- Missing barometric pressure
- Missing time of day (crabs are crepuscular)

**V2 Weight Distribution:**
| Factor | V1 Weight | V2 Weight |
|--------|-----------|-----------|
| Molt Cycle / Water Temperature (NEW) | 0% | 35% |
| Tidal Activity (simplified current) | 30% | 25% |
| Time of Day (NEW - crepuscular) | 0% | 15% |
| Moon Phase | 15% | 10% |
| Safety (wind/wave) | 20% | 10% |
| Barometric Pressure (NEW) | 0% | 5% |
| Seasonality (month) | 25% | 0% (replaced by Water Temp) |
| Tidal Range | 10% | 0% (redundant with Tidal Activity) |

**V2 Key Changes:**
1. Replace month-based seasonality with water temperature factor
   - Key insight: 10-13°C is peak molt - AVOID (score 0.1)
   - >13°C is post-molt aggressive feeding (score 1.0)
2. Remove redundant tidal range
3. Add time of day (crepuscular bonus - dawn/dusk = 1.0)
4. Add barometric pressure trend
5. Improve wave height estimation or use direct marine forecast data

---

### 9. Spot Prawn V2

**Current V1 Issues:**
- Static May-June season (DFO dates change annually)
- Missing time of day (spot prawns are crepuscular/nocturnal)
- Missing intra-season gradient (first week >> last week)
- Seasonality is gatekeeper but takes 50% weight

**V2 Weight Distribution:**
(Only calculated when DFO season is open and conditions are safe)

| Factor | V1 Weight | V2 Weight |
|--------|-----------|-----------|
| DFO Season Status (NEW) | 50% | Gatekeeper |
| Slack Tide (current) | 20% | 50% |
| Time of Day (NEW - crepuscular) | 0% | 20% |
| Intra-Season Position (NEW) | 0% | 15% |
| Tidal Range | 10% | 10% |
| Solunar (NEW) | 0% | 5% |
| Wind | 10% | Gatekeeper |
| Wave Height | 10% | Gatekeeper |

**V2 Key Changes:**
1. Move seasonality, wind, and waves to gatekeeper logic
2. Add time of day factor (dawn/dusk = 1.0, night = 0.7, day = 0.4)
3. Add intra-season position (first week = 1.0, linear decay to 0.6 by end)
4. Add solunar as minor factor
5. Require dynamic DFO season dates as input

---

## Implementation Priority

### Phase 1: High-Impact Species (Complete existing V2 pattern)
1. **Pink Salmon V2** - Major species during odd years
2. **Coho Salmon V2** - Very popular species with clear improvements
3. **Chum Salmon V2** - Late season completion

### Phase 2: Bottom Fish Species
4. **Halibut V2** - Popular species, significant improvements identified
5. **Lingcod V2** - Structure-dependent improvements
6. **Rockfish V2** - Conservation-critical, regulatory integration needed

### Phase 3: Specialized Species
7. **Crab V2** - Unique behavioral patterns, temperature-based molt
8. **Spot Prawn V2** - Short season, regulatory integration
9. **Sockeye V2** - Major redesign needed for migratory behavior

---

## Data Requirements

### Already Available in Chinook V2
- Sunrise/sunset times
- Pressure history
- Fishing reports
- Latitude/longitude
- Location name

### New Data Needed for Full V2 Implementation
1. **Cloud cover** - Available from Open-Meteo
2. **Tide phase/direction** - May need calculation from tide heights
3. **24-hour precipitation** - Available from weather history
4. **DFO regulatory data** - Need integration with DFO announcements
5. **River discharge data** - Environment Canada water gauges (for Sockeye)
6. **Sea surface temperature** - For Crab molt cycle

### Data Integration Plan
```typescript
// Extend OpenMeteoData with additional fields
interface ExtendedWeatherData extends OpenMeteo15MinData {
  cloudCover: number;          // 0-100%
  seaSurfaceTemperature?: number;  // °C
  precipitation24h?: number;   // mm
}

// Extend tide data with phase information
interface ExtendedTideData extends CHSWaterData {
  tidePhase: 'flood' | 'ebb' | 'slack';
  timeToNextSlack: number;     // minutes
  tideHeightHistory: number[]; // For slope calculation
}
```

---

## File Structure

```
src/app/utils/
├── speciesAlgorithms.ts          # V1 algorithms (keep intact)
├── chinookAlgorithmV2.ts         # Existing V2 (template)
├── pinkAlgorithmV2.ts            # NEW
├── cohoAlgorithmV2.ts            # NEW
├── halibutAlgorithmV2.ts         # NEW
├── lingcodAlgorithmV2.ts         # NEW
├── rockfishAlgorithmV2.ts        # NEW
├── sockeyeAlgorithmV2.ts         # NEW
├── chumAlgorithmV2.ts            # NEW
├── crabAlgorithmV2.ts            # NEW
├── spotPrawnAlgorithmV2.ts       # NEW
└── speciesExplanations.ts        # Update with V2 explanations
```

---

## Testing Strategy

1. **Unit Tests**: Each V2 algorithm with mocked data
2. **Integration Tests**: Full flow with real API data
3. **A/B Testing**: Compare V1 vs V2 scores for same conditions
4. **User Feedback**: Track reported accuracy after V2 rollout

---

## Migration Path

1. Create V2 algorithms alongside V1 (no breaking changes)
2. Add `USE_SPECIES_V2` flags similar to `USE_CHINOOK_V2`
3. Gradually enable V2 per species after testing
4. Update UI explanations in `speciesExplanations.ts`
5. Deprecate V1 algorithms after full V2 rollout

---

## Next Steps

1. [ ] Start with Pink Salmon V2 implementation
2. [ ] Add cloud cover and precipitation history to weather data
3. [ ] Implement tide phase calculation helper
4. [ ] Create V2 base class/interface for shared logic
5. [ ] Update speciesExplanations.ts for each V2 algorithm
