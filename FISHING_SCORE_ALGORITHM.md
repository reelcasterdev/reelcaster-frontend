# ReelCaster Fishing Score Algorithm Documentation

## Overview
The ReelCaster fishing score algorithm predicts optimal fishing conditions by analyzing multiple environmental factors and species-specific behaviors. The system produces scores from 0-10, where 10 represents ideal fishing conditions.

## Data Sources

### 1. Open Meteo API
- **Purpose**: Weather and atmospheric data
- **Frequency**: 15-minute intervals
- **Parameters Used**:
  - Temperature (2m)
  - Humidity
  - Dew Point
  - Apparent Temperature
  - Precipitation
  - Weather Code
  - Surface Pressure
  - Cloud Cover
  - Wind Speed (10m)
  - Wind Direction
  - Wind Gusts
  - Visibility
  - Sunshine Duration
  - Lightning Potential
  - CAPE (Convective Available Potential Energy)
  - Daily sunrise/sunset times

### 2. Tide API (XTide Network)
- **Purpose**: Tidal movement data
- **Stations**: Victoria Harbour, Sooke, Tsawwassen, Vancouver
- **Parameters Used**:
  - Current tide height
  - Time to next tide change
  - Tide rising/falling status
  - Tide range (high-low difference)
  - Rate of change (m/hour)

## Scoring Algorithm

### Core Formula
The total score is calculated as a weighted sum of 13 factors:

```
Total Score = 
  Pressure × 0.14 +
  Wind × 0.13 +
  Temperature × 0.11 +
  Precipitation × 0.11 +
  Tide × 0.11 +
  Cloud Cover × 0.06 +
  Visibility × 0.06 +
  Species Factor × 0.06 +
  Sunshine × 0.05 +
  Lightning × 0.05 +
  Atmospheric × 0.04 +
  Comfort × 0.04 +
  Time of Day × 0.04
```

### Factor Breakdown

#### 1. **Pressure Score (14% weight)**
- **Optimal**: 1015-1020 hPa (score 10)
- **Scoring Logic**:
  - Within 2.5 hPa of optimal: 10
  - 2.5-5 hPa deviation: 8.0-10.0
  - 5-10 hPa deviation: 2.0-8.0
  - 10-20 hPa deviation: 1.0-2.0
  - >20 hPa deviation: 1.0
- **Species Adjustment**: Multiplied by species `pressureSensitivity` (0.5-2.0)

#### 2. **Wind Score (13% weight)**
- **Optimal**: ≤1 m/s (score 10)
- **Scoring Logic**:
  - 0-1 m/s: 10
  - 1-3 m/s: 9.0-10.0
  - 3-6 m/s: 7.0-9.0
  - 6-10 m/s: 5.0-7.0
  - 10-15 m/s: 3.0-5.0
  - >15 m/s: 0.5-3.0
- **Modifiers**:
  - Gust penalty: ×0.7-0.9 based on gust ratio
  - Easterly bonus: ×1.05 (45-135°)
  - Westerly penalty: ×0.95 (270-45°)
- **Species Adjustment**: Multiplied by species `windTolerance` (0.5-2.0)

#### 3. **Temperature Score (11% weight)**
- **Optimal**: 10-14°C (score 10)
- **Scoring Logic**:
  - 10-14°C: 10
  - 6-10°C: 6.0-10.0
  - 14-18°C: 6.0-10.0
  - 2-6°C: 2.0-6.0
  - 18-22°C: 1.0-6.0
  - <2°C or >22°C: 0.2-2.0
- **Species Adjustment**: 
  - ×1.2 if within species optimal range
  - ×1.0 if within tolerable range
  - ×0.6 if outside tolerable range

#### 4. **Precipitation Score (11% weight)**
- **Optimal**: ≤0.1 mm (score 10)
- **Scoring Logic**:
  - 0-0.1 mm: 10
  - 0.1-0.5 mm: 8.0-10.0
  - 0.5-1.0 mm: 7.0-8.0
  - 1.0-2.5 mm: 5.0-7.0
  - 2.5-5.0 mm: 2.0-5.0
  - >5.0 mm: 0.2-2.0
- **Species Adjustment**: Multiplied by species `precipitationTolerance` (0.5-1.5)

#### 5. **Tide Score (11% weight)**
- **Optimal**: 0-2 hours from tide change (score 5-10)
- **Scoring Logic**:
  - 0-2 hours from change: 5-10
  - 2-4 hours from change: 2-5
  - >4 hours (slack tide): 0.5-2
- **Modifiers**:
  - Rising tide bonus: ×1.2
  - Large tide range (>3m): ×1.1
  - Fast change rate (>0.5 m/hr): ×1.1
- **Species Adjustment**: Multiplied by species `tideImportance` (0.5-2.0)

#### 6. **Cloud Cover Score (6% weight)**
- **Optimal**: 30-60% (score 10)
- **Scoring Logic**:
  - 30-60%: 10
  - 15-30%: 6.0-10.0
  - 60-75%: 7.0-10.0
  - <15% or >75%: 1.0-7.0
- **Species Adjustment**: Multiplied by `lowLightPreference` for overcast (>50% clouds)

#### 7. **Visibility Score (6% weight)**
- **Scoring Logic**:
  - ≥10 km: 10
  - 5-10 km: 9
  - 2-5 km: 7
  - 1-2 km: 5
  - <1 km: 1-3

#### 8. **Species Factor (6% weight)**
- **Base Score**: 5.0
- **Seasonal Adjustment**: Multiplied by seasonal peaks (0.5-1.5)
  - Spring/Summer/Fall/Winter specific multipliers per species

#### 9. **Sunshine Score (5% weight)**
- **Scoring Logic** (% of 15-min period):
  - ≥75% sunshine: 10
  - 50-75%: 9
  - 25-50%: 7
  - 10-25%: 6
  - <10%: 5
- **Species Adjustment**: Multiplied by `lowLightPreference` if overcast

#### 10. **Lightning Score (5% weight - Safety)**
- **Scoring Logic** (J/kg):
  - ≤100: 10 (very low risk)
  - 100-500: 8
  - 500-1000: 6
  - 1000-2000: 3
  - >2000: 1 (dangerous)

#### 11. **Atmospheric Stability Score (4% weight)**
- **Based on CAPE** (J/kg):
  - ≤500: 10 (very stable)
  - 500-1000: 8
  - 1000-2000: 6
  - 2000-3000: 4
  - >3000: 2 (very unstable)

#### 12. **Comfort Score (4% weight)**
- **Factors**:
  - Apparent temperature deviation from 12°C
  - Humidity (ideal: 40-80%)
  - Dew point (ideal: <15°C)
- **Combined multiplicative scoring**

#### 13. **Time of Day Score (4% weight)**
- **Peak Times**:
  - Dawn (30 min before to 1 hr after sunrise): 8-10
  - Dusk (1 hr before to 30 min after sunset): 8-10
- **Secondary Peaks**:
  - Early morning (6-9 AM): 5.8-6.6
  - Evening (5-8 PM): 5.6-6.6
- **Other Times**:
  - Mid-day (10 AM-4 PM): 3.0-4.0
  - Night (10 PM-5 AM): 0.5-1.5
- **Species Adjustment**: 
  - Dawn: Multiplied by `dawnActivityBonus`
  - Dusk: Multiplied by `duskActivityBonus`
  - Mid-day: Multiplied by `midDayActivity`
  - Night: Multiplied by `nightActivity`

## Species-Specific Profiles

The algorithm includes profiles for 9 Pacific Northwest species:

### Salmon Species
- **Chinook Salmon**: Highly sensitive to pressure (1.4x), prefers cooler temps (8-14°C), very tide-dependent (1.6x)
- **Coho Salmon**: Moderate pressure sensitivity (1.2x), wider temp range (10-16°C), more wind tolerant
- **Sockeye Salmon**: Pressure sensitive (1.3x), less tide-dependent (1.1x), strong low-light preference
- **Chum Salmon**: Fall peak activity (1.5x), high precipitation tolerance
- **Pink Salmon**: Summer peak (1.4x), most wind tolerant of salmon

### Bottom Fish
- **Halibut**: Very tide-dependent (1.8x), handles rough conditions well, active throughout day
- **Lingcod**: Structure-oriented, spring peak (1.3x), moderate wind tolerance
- **Rockfish**: Least weather sensitive (0.7x pressure), high wind tolerance
- **Greenling**: Widest temp tolerance (6-22°C), summer peak activity

## Implementation Notes

### Data Processing
- 15-minute weather data aggregated into 2-hour forecasts
- Scores calculated for each 15-minute interval
- Daily forecasts limited to 14 days
- All scores clamped between 0-10

### Performance Optimizations
- Individual factor scores capped at 12 to prevent extreme values
- Species adjustments applied before final weighting
- Seasonal adjustments based on current month

### Future Considerations
- Historical catch data integration
- Moon phase influence
- Barometric pressure trends (rising/falling)
- Water temperature sensors
- Real-time fishing reports feedback loop