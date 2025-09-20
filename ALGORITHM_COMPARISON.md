# Fishing Score Algorithm Comparison Analysis

## Current Implementation vs Species-Specific Requirements

### Overview
The current implementation uses a **generic weighted scoring system** with species-specific multipliers, while the requirements document specifies **completely different weighting schemes** for each species.

---

## 🔴 MAJOR DIFFERENCES

### 1. **Fundamental Approach Difference**
- **Current**: Single algorithm with 16 factors + species multipliers
- **Required**: Unique algorithm per species with different factors and weights

### 2. **Weight Distribution Mismatch**

#### Current Implementation (All Species):
```
Barometric Pressure:     13-14%
Wind:                     12-13%
Air Temperature:          9-11%
Water Temperature:        5%
Precipitation:            10-11%
Tide Movement:            8-11%
Current Speed:            4%
Current Direction:        2%
Cloud Cover:              6%
Visibility:               6%
Sunshine Duration:        5%
Lightning Safety:         5%
Atmospheric Stability:    4%
Comfort Index:            4%
Time of Day:              4%
Species Factor:           3-6%
```

#### Required Weights by Species:

**Chinook Salmon:**
- Optimal Light/Time: **20%** (current: 4%)
- Tidal Range: **15%** (current: 8-11%)
- Current Flow: **15%** (current: 4%)
- Dates/Seasonality: **15%** (not directly implemented)
- Barometric Pressure: **10%** (current: 13-14%)
- Moonphase: **5%** (not implemented)

**Pink Salmon:**
- Dates/Seasonality: **30%** (not implemented as primary factor)
- Odd-year cycle: **Critical** (not implemented)
- Current Flow: **15%** (current: 4%)
- Light/Time: **15%** (current: 4%)

**Halibut:**
- Tidal Range: **25%** - INVERTED logic (current: normal)
- Current Flow: **25%** (current: 4%)
- Dates/Seasonality: **15%** (not implemented)
- Moonphase: **10%** (not implemented)
- Light/Time: **5%** (current: 4%)

**Lingcod:**
- Current Flow: **30%** - Slack tide focus (current: 4%)
- Tidal Range: **20%** (current: 8-11%)
- Wave Height: **10%** (not separately weighted)
- Light/Time: **5%** (current: 4%)

**Coho Salmon:**
- Dates/Seasonality: **25%** (not implemented)
- Light/Time: **20%** (current: 4%)
- Current Flow: **20%** (current: 4%)

**Rockfish:**
- Current Flow: **35%** - Slack tide critical (current: 4%)
- Wind: **20%** (current: 12-13%)
- Wave Height: **20%** (not separately weighted)

---

## 🟡 MISSING FACTORS

### Not Implemented in Current System:
1. **Moonphase** - Required for Chinook (5%), Halibut (10%), Crab (15%)
2. **Dates/Seasonality as Primary Factor** - Critical for Pink Salmon (30%), Coho (25%)
3. **Odd/Even Year Logic** - Essential for Pink Salmon
4. **Slack Tide Specific Scoring** - Required for Lingcod, Rockfish
5. **Inverted Tidal Logic** - Required for Halibut (prefers neap tides)
6. **Wave Height as Separate Factor** - Required for multiple species
7. **Safety Cutoffs** - Specific thresholds per species

---

## 🟢 PARTIAL MATCHES

### Factors Present but Incorrectly Weighted:
1. **Time of Day** - 4% current vs 5-20% required
2. **Current/Tide** - 4-11% current vs 15-35% required
3. **Wind** - Consistent percentage but missing species-specific cutoffs
4. **Temperature** - Present but not seasonally adjusted

### Correctly Implemented Concepts:
1. Species profiles with multipliers (but wrong approach)
2. Dawn/dusk activity bonuses
3. Seasonal peaks
4. Temperature preferences
5. Current speed preferences

---

## 📊 SPECIES-SPECIFIC GAPS

### Chinook Salmon
- ❌ Light/Time severely underweighted (4% vs 20%)
- ❌ Missing moonphase factor
- ❌ Current flow underweighted (4% vs 15%)
- ✅ Pressure sensitivity correctly high

### Pink Salmon
- ❌ No odd/even year logic
- ❌ Dates not primary factor (should be 30%)
- ❌ Missing aggressive feeding behavior modeling
- ✅ Temperature ranges correct

### Halibut
- ❌ No inverted tidal logic (needs neap > spring)
- ❌ Current massively underweighted (4% vs 25%)
- ❌ Missing moonphase correlation
- ✅ Bottom feeder behavior recognized

### Lingcod
- ❌ Slack tide not specifically targeted (30% weight needed)
- ❌ Current underweighted (4% vs 30%)
- ✅ Structure orientation recognized

### Coho Salmon
- ❌ Visual hunting not reflected (20% light needed)
- ❌ Current underweighted (4% vs 20%)
- ❌ Missing dates as primary factor (25%)
- ✅ Activity patterns correct

### Rockfish
- ❌ Slack tide not primary (35% needed)
- ❌ Wave height not separate factor (20% needed)
- ✅ Wind tolerance recognized

---

## 🔧 RECOMMENDATIONS

### Immediate Changes Needed:

1. **Restructure Algorithm Architecture**
   - Move from single algorithm to species-specific algorithms
   - Implement unique weight distributions per species

2. **Add Missing Factors**
   - Moonphase calculations
   - Date/seasonality as primary scoring factor
   - Wave height as independent factor
   - Odd/even year logic for Pink Salmon

3. **Fix Critical Logic Issues**
   - Implement inverted tidal preference for Halibut
   - Add slack tide specific scoring for bottom fish
   - Increase current/tide weights dramatically

4. **Implement Safety Cutoffs**
   - Species-specific wind limits
   - Wave height thresholds
   - Current speed maximums

### Implementation Priority:
1. **High**: Restructure to species-specific algorithms
2. **High**: Fix weight distributions
3. **Medium**: Add moonphase and seasonality
4. **Medium**: Implement safety cutoffs
5. **Low**: Fine-tune multipliers

---

## 💡 CONCLUSION

The current implementation provides a good foundation but uses the **wrong architectural approach**. Instead of one algorithm with multipliers, each species needs its **own unique algorithm** with dramatically different factor weights. The most critical gaps are:

1. **Current/Tide severely underweighted** (4% vs 15-35% required)
2. **Light/Time severely underweighted** (4% vs 5-20% required)
3. **Missing critical factors** (moonphase, dates, odd/even years)
4. **Wrong tidal logic for some species** (Halibut needs inversion)

The system needs a fundamental restructuring to match the species-specific requirements rather than tweaking the existing generic approach.