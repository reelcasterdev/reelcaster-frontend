# Species-Specific Fishing Algorithms

## Chinook Salmon

| Key Metric | Weight (%) | Description |
|------------|------------|-------------|
| **Optimal Light/Time of Day** | 20 | Contributes up to 20 points. Score is highest within the "magic hours" (1-2 hours of sunrise/sunset) and scales down towards midday. Integrates solunar bonuses for peak activity. Safety: Night fishing (outside civil twilight) could flag as unsafe without proper equipment. |
| **Tidal Range/Exchange** | 15 | Contributes up to 15 points. Scored based on the height difference between high and low tide. A large range (>2.5m) gets full points for creating strong, bait-concentrating currents; smaller ranges are scaled down. Safety: Extreme ranges can amplify current risks. |
| **Current (Tidal Flow)** | 15 | Contributes up to 15 points. Optimal during slack or ebb-to-flood transition (full points). Score is reduced for suboptimal flows (e.g., strong mid-tide flows >3 knots). Safety Cut-off: Currents >4 knots set to 0 points due to significant boat control risks. |
| **Dates (Seasonal Timing)** | 15 | Contributes up to 15 points. Full points for peak migratory season (June-July) and winter feeder season (Feb-April). Scaled down for shoulder seasons. Off-season scores near zero, implying lower fish presence. |
| **Barometric Pressure** | 10 | Contributes up to 10 points. A falling or stable low pressure (<1010 hPa) gets full points, signaling aggressive feeding. Stable high pressure gets half points. Rapidly rising pressure gets 0 points. |
| **Moonphase** | 5 | Contributes up to 5 points. New/full moons score highest due to their influence on tidal range (synergistic with the Tidal Range metric). Quarter phases receive fewer points. |
| **Temperature (Air/Water)** | 5 | Contributes up to 5 points. Optimal water temp (10-15°C) gets full points; deviations reduce the score. Safety Cut-off: Air temp <5°C or water <8°C sets to 0 points due to boater hypothermia risk. |
| **Wind** | 5 | Contributes up to 5 points. Moderate wind (5-15 knots) creating a "salmon chop" gets full points. Calm or high winds receive fewer points. Safety Cut-off: >20 knots sets to 0 and applies an overall "unsafe" flag. |
| **Wave Height** | 5 | Contributes up to 5 points. Low waves (<1m) get full points. Score scales down as height increases. Safety Cut-off: >2m (or >1.5m with short periods <8s) sets to 0 and applies an overall "unsafe" flag. |
| **Precipitation** | 5 | Contributes up to 5 points. Light rain/overcast gets full points for creating ideal low-light conditions. Heavy rain deducts for visibility. Safety Cut-off: Thunderstorms or heavy fog set to 0 and flag as unsafe. |
| **Total** | 100 | |

## Pink Salmon

| Key Metric | Weight (%) | Description |
|------------|------------|-------------|
| **Dates (Seasonal Timing)** | 30 | Contributes up to 30 points. Crucial factor. Score is 0 for all even-numbered years. For odd years (like 2025), score is highest from late July to early September. The current date of Sep 3, 2025, would receive maximum points. Score is 0 outside this window. |
| **Optimal Light/Time of Day** | 15 | Contributes up to 15 points. Pinks are aggressive but still prefer security. Overcast conditions and the low-light hours around sunrise/sunset get full points. Bright, sunny midday conditions will have a reduced score. |
| **Current (Tidal Flow)** | 15 | Contributes up to 15 points. Scored highest on moderate flows (1-2.5 knots) that concentrate krill and small baitfish. Pinks often feed in moving water, so dead slack tide is scored lower than for Chinook. Safety Cut-off: >4 knots sets to 0. |
| **Tidal Range/Exchange** | 10 | Contributes up to 10 points. A moderate tidal exchange is optimal for creating consistent currents. Very weak or extremely strong exchanges may disperse schools or bait and are scored lower. |
| **Precipitation** | 10 | Contributes up to 10 points. Light rain or overcast/drizzle conditions receive full points as they create ideal low-light conditions and surface disturbance, making Pinks more aggressive and less wary. Safety Cut-off: Thunderstorms set to 0. |
| **Temperature (Water)** | 10 | Contributes up to 10 points. Optimal water temperature for active, migrating Pinks (approx. 11-16°C) gets full points. Colder or warmer water reduces the score as fish may become lethargic. |
| **Wind** | 5 | Contributes up to 5 points. A light to moderate breeze (5-15 knots) is ideal for creating a "salmon chop," which provides cover for surface-oriented schools. Safety Cut-off: >20 knots sets to 0 and applies an overall "unsafe" flag. |
| **Wave Height** | 5 | Contributes up to 5 points. Low waves (<1m) get full points, as calmer seas make it easier to spot surface activity (jumpers) and control gear. Safety Cut-off: >2m sets to 0 and applies an overall "unsafe" flag. |
| **Total** | 100 | |

## Halibut

| Key Metric | Weight (%) | Description |
|------------|------------|-------------|
| **Tidal Range/Exchange** | 25 | Most Important - Contributes up to 25 points. The logic is inverted from other species. A small tidal range (neap tide) gets maximum points, as it produces weaker currents and a longer fishable window. Large ranges get a low score due to short, difficult fishing windows. |
| **Current (Tidal Flow)** | 25 | Contributes up to 25 points. The ideal score is for a slow, steady current (0.5-2 knots), which is perfect for dispersing bait scent. Dead slack tide and very strong currents (>2.5 knots) get low scores, as one provides no scent trail and the other makes holding bottom impossible. |
| **Dates (Seasonality/Regulations)** | 15 | Contributes up to 15 points. Score is 0 outside the legal season. Within the open season, the score peaks from May to July when halibut are most concentrated on shallower feeding banks, and scales down slightly in late summer/fall. |
| **Moonphase** | 10 | Contributes up to 10 points. This is a direct proxy for Tidal Range. Quarter moons get maximum points as they produce neap tides. New and full moons get a very low score as they produce large, often unfishable tides for halibut. |
| **Wind** | 10 | Contributes up to 10 points. Primarily a safety and boat control metric. Calm conditions (<10 knots) get full points, as this is critical for a slow, controlled drift. Safety Cut-off: >20 knots sets to 0 and flags as unsafe. |
| **Wave Height** | 10 | Contributes up to 10 points. Low waves (<1m) are heavily favored for safety and comfort during long drifts. Score degrades quickly as wave height increases. Safety Cut-off: >1.5m sets to 0 and flags as unsafe. |
| **Optimal Light/Time of Day** | 5 | Contributes up to 5 points. Very low importance. Halibut feed at all depths and times. The score is consistent throughout the day, driven entirely by the tide and current conditions. |
| **Total** | 100 | |

## Lingcod

| Key Metric | Weight (%) | Description |
|------------|------------|-------------|
| **Current (Tidal Flow)** | 30 | Most Important - Contributes up to 30 points. Score is maximized during slack tide (the 90-minute window around the tide change). Lingcod feed most actively and it's easiest to present lures vertically in their strike zone. Strong currents (>3 knots) score near 0. |
| **Tidal Range/Exchange** | 20 | Contributes up to 20 points. A large tidal range is favored, as it creates stronger currents that concentrate baitfish, leading to more defined and aggressive feeding periods during the corresponding slack tide. Small ranges score lower. |
| **Dates (Seasonality/Regulations)** | 15 | Contributes up to 15 points. This is a regulatory check. Score is 0 if outside the legal season (typically closed mid-fall to early spring). The current date (Sep 4) is within the season. The score is consistent throughout the open season. |
| **Wave Height** | 10 | Contributes up to 10 points. Primarily a boat control metric. Low waves (<1m) are critical for staying precisely over structure and get full points. Score degrades quickly as wave height increases. Safety Cut-off: >2m sets to 0 and flags as unsafe. |
| **Wind** | 10 | Contributes up to 10 points. Similar to waves, this is for boat control. Low wind (<10 knots) gets full points. Higher winds make it difficult to control drift speed and stay on productive spots. Safety Cut-off: >20 knots sets to 0 and flags as unsafe. |
| **Precipitation** | 5 | Contributes up to 5 points. Overcast/drizzle gets full points. While less critical for deep bottom-dwellers, it can improve the bite for fish in shallower (<100ft) structures. |
| **Optimal Light/Time of Day** | 5 | Contributes up to 5 points. Low importance, as lingcod feed based on opportunity. The score is highest when a tide change coincides with dawn/dusk, but high scores can occur at any time of day. |
| **Temperature (Water)** | 5 | Contributes up to 5 points. Low importance for day-to-day planning. Score is highest when bottom temperatures are in the optimal range for lingcod metabolism (approx. 8-12°C). |
| **Total** | 100 | |

## Coho Salmon

| Key Metric | Weight (%) | Description |
|------------|------------|-------------|
| **Dates (Seasonal Timing)** | 25 | Most Important - Contributes up to 25 points. Score is highest during the peak migratory window. For Victoria, this ramps up in August, is maximized in September, and declines in October. The current date (Sep 4, 2025) receives full points. |
| **Optimal Light/Time of Day** | 20 | Contributes up to 20 points. Crucial for these visual hunters. Overcast conditions get a high base score. Low-light "magic hours" (dawn/dusk) receive full points. Bright, sunny midday conditions are heavily penalized. |
| **Current (Tidal Flow)** | 20 | Contributes up to 20 points. Active currents are key. A moderate to strong flow (1.5-3 knots) that creates visible tide lines and concentrates bait gets full points. Dead slack tide may be less productive and receives a lower score. Safety Cut-off: >4 knots is penalized. |
| **Tidal Range/Exchange** | 10 | Contributes up to 10 points. A large tidal range is favored as it produces the strong currents and distinct, bait-rich rips that Coho actively hunt in. Small tidal exchanges are scored lower. |
| **Precipitation** | 10 | Contributes up to 10 points. Light rain/drizzle is a strong positive, receiving full points because it enhances low-light conditions and disturbs the water's surface, making Coho less wary and more aggressive. |
| **Wind** | 5 | Contributes up to 5 points. A moderate "salmon chop" (5-15 knots) is ideal and gets full points. Glassy calm conditions can make Coho spooky and receive fewer points. Safety Cut-off: >20 knots sets to 0. |
| **Wave Height** | 5 | Contributes up to 5 points. Primarily a safety metric. Low to moderate waves (<1.5m) are manageable. Safety Cut-off: >2m sets to 0 and flags the algorithm as unsafe. |
| **Temperature (Water)** | 5 | Contributes up to 5 points. A secondary factor during the migration. Score is highest when surface water is in the optimal range (approx. 11-15°C). |
| **Total** | 100 | |

## Rockfish

| Key Metric | Weight (%) | Description |
|------------|------------|-------------|
| **Current (Tidal Flow)** | 35 | Most Important - Contributes up to 35 points. Score is maximized during slack tide. This is the most critical window, as it's the only time you can effectively fish vertically over rock piles without excessive snagging or scope. Any significant current (>1.5 knots) rapidly degrades the score. |
| **Wind** | 20 | Contributes up to 20 points. Essential for boat control. Calm conditions (<10 knots) get full points. Wind makes it extremely difficult to "spot lock" or maintain a controlled drift over a specific piece of structure. Safety Cut-off: >20 knots sets to 0. |
| **Wave Height** | 20 | Contributes up to 20 points. Like wind, this is a fishability and safety metric. Calm seas (<1m) get full points. Choppy conditions make it unsafe and difficult to stay over your target. Safety Cut-off: >1.5m sets to 0 and flags as unsafe. |
| **Tidal Range/Exchange** | 10 | Contributes up to 10 points. A small tidal range (neap tide) is strongly favored because it results in a longer period of slack or near-slack water, extending the prime fishing window. Large ranges are penalized. |
| **Dates (Seasonality/Regulations)** | 10 | Contributes up to 10 points. Checks for major area or species closures (e.g., for Quillbacks in spring). Favors the good-weather months (May-September) when reaching offshore rock piles is more feasible. |
| **Other Factors (Light, Precip, Temp)** | 5 | Contributes up to 5 points. These factors have minimal influence on deep-dwelling rockfish. The score is a small bonus for overcast conditions but is otherwise a low-impact variable. |
| **Total** | 100 | |

## Crab

| Key Metric | Weight (%) | Description |
|------------|------------|-------------|
| **Tidal Flow/Soak Time** | 30 | Contributes up to 30 points. Score is maximized when traps are deployed to soak through a slack tide. This allows crabs to easily locate traps during low-flow periods. A moderate current is needed to disperse scent, so both dead calm and ripping tides are scored lower. |
| **Dates (Seasonality/Molt Cycle)** | 25 | Contributes up to 25 points. Crucial for quality. The score is highest from late August through October when most crabs are hard-shelled and full of meat. The current date (Sep 4, 2025) receives full points. The score is low during peak summer molting season (June-July). |
| **Moonphase** | 15 | Contributes up to 15 points. A significant factor for crab activity. New moons (darker nights) receive full points. Many crabbers report lower catches during a full moon, possibly as crabs can forage visually and are less reliant on bait scent. |
| **Wind** | 10 | Contributes up to 10 points. Primarily a safety and practicality metric. Calm conditions (<15 knots) get full points, making it easier and safer to set and pull traps. |
| **Wave Height** | 10 | Contributes up to 10 points. Similar to wind, low waves (<1m) get full points. Pulling heavy, water-logged traps over the gunwale is hazardous in rough seas. Safety Cut-off: >1.5m flags as unsafe. |
| **Tidal Range/Exchange** | 10 | Contributes up to 10 points. A moderate tidal range is best. Very large exchanges create excessively strong currents, while very small exchanges may not disperse bait scent effectively over a wide area. |
| **Total** | 100 | |

## Spot Prawn

| Key Metric | Weight (%) | Description |
|------------|------------|-------------|
| **Dates (Seasonality/Regulations)** | 50 | ABSOLUTE FACTOR - If the date is outside the short legal season (typically May-June), the score is 0. If within the season, this metric contributes the full 50 points. This factor overrides all others. |
| **Current (Tidal Flow)** | 20 | Contributes up to 20 points. Slack tide is the only effective window. Due to the extreme depths (200-400ft), traps can only be set and retrieved effectively with minimal current. The score is maximized for the 60-90 minute window around a tide change. |
| **Tidal Range/Exchange** | 10 | Contributes up to 10 points. A small tidal range (neap tide) is strongly favored. This creates longer periods of manageable current, maximizing the very short window for setting and pulling gear from the deep. |
| **Wind** | 10 | Contributes up to 10 points. Essential for safety and practicality. Calm conditions (<10 knots) get full points. Handling hundreds of feet of rope in the wind is difficult and dangerous. Safety Cut-off: >15 knots flags as unsafe. |
| **Wave Height** | 10 | Contributes up to 10 points. Calm seas (<1m) are essential. The combination of deep water, long ropes, and heavy traps makes this activity extremely hazardous in choppy seas. Safety Cut-off: >1.5m flags as unsafe. |
| **Total** | 100 | |

---

## Algorithm Analysis

### Consistency Check ✓
All algorithms total to 100%, making them directly comparable across species.

### Key Observations:

1. **Species-Specific Priorities Make Sense**:
   - **Salmon species** prioritize timing, light conditions, and tidal factors
   - **Bottom fish** (Halibut, Lingcod, Rockfish) heavily weight current/slack tide
   - **Shellfish** (Crab, Spot Prawn) emphasize regulations and safe handling conditions

2. **Safety Considerations Are Well-Integrated**:
   - Wind/wave cutoffs are consistent (typically 20 knots wind, 1.5-2m waves)
   - Species requiring precise boat control have stricter limits
   - Deep-water species (Spot Prawn) have the most conservative safety thresholds

3. **Biological Accuracy**:
   - Pink Salmon's odd-year only cycle is correctly emphasized (30% weight on dates)
   - Halibut's inverted tidal preference (neap > spring tides) aligns with fishing practice
   - Coho's visual hunting nature reflected in 20% weight on light conditions
   - Rockfish's structure-oriented behavior shown in 35% weight on slack tide

4. **Practical Fishing Knowledge**:
   - Dawn/dusk "magic hours" properly weighted for predatory species
   - Slack tide importance scales with fishing depth/technique requirements
   - Seasonal patterns match known migration and spawning cycles

5. **Unique Species Traits**:
   - Spot Prawn's 50% regulatory weight reflects extremely short season
   - Crab's moonphase consideration (15%) accounts for nocturnal behavior
   - Lingcod's 30% current weight matches vertical jigging requirements

### Recommendations for Implementation:
1. Consider adding solunar tables for more precise activity predictions
2. Include water clarity/turbidity for sight-feeding species
3. Add baitfish presence indicators when data available
4. Consider thermal stratification for deep-water species
5. Add recent catch success rates as a feedback mechanism