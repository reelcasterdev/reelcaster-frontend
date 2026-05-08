# BlueCaster public endpoint smoke checklist

Copy-paste these against a running BC dev server. Set `BC_URL` and `KEY` first.

```bash
export BC_URL=http://localhost:3001
export KEY=<your-x-api-key>
```

---

## 1. Cities list

```bash
curl -s "$BC_URL/api/v1/cities?province=BC&status=published&limit=5" \
  -H "x-api-key: $KEY" | jq '.cities | length, .cities[0]'
```

Expected: integer count, first city with `slug`, `name`, `province`, `hero_image_url`.

```bash
# 401 path
curl -i "$BC_URL/api/v1/cities" | head -1
```

Expected: `HTTP/1.1 401 Unauthorized`.

```bash
# Bad status
curl -s -o /dev/null -w "%{http_code}\n" "$BC_URL/api/v1/cities?status=banana" \
  -H "x-api-key: $KEY"
```

Expected: `400`.

---

## 2. Province → cities

```bash
curl -s "$BC_URL/api/v1/provinces/bc/cities" -H "x-api-key: $KEY" \
  | jq '.province, (.cities | length)'
```

Expected: `{ "code": "BC", "name": "British Columbia", "type": ... }` and a positive count.

```bash
# 404 on unknown province
curl -s -o /dev/null -w "%{http_code}\n" "$BC_URL/api/v1/provinces/zz/cities" \
  -H "x-api-key: $KEY"
```

Expected: `404`.

---

## 3. City → spots

```bash
curl -s "$BC_URL/api/v1/cities/victoria/spots" -H "x-api-key: $KEY" \
  | jq '.city.slug, (.spots | length), .spots[0]'
```

Expected: `"victoria"`, integer count, first spot with `id`, `name`, `slug`, `lat`, `lng`.

```bash
# 404 on unknown city
curl -s -o /dev/null -w "%{http_code}\n" "$BC_URL/api/v1/cities/no-such-city/spots" \
  -H "x-api-key: $KEY"
```

Expected: `404`.

---

## 4. Species list

```bash
curl -s "$BC_URL/api/v1/species?limit=10" -H "x-api-key: $KEY" \
  | jq '(.species | length), .species[0]'
```

Expected: count, species with `id`, `slug`, `name`.

```bash
curl -s "$BC_URL/api/v1/species?q=salmon&limit=20" -H "x-api-key: $KEY" \
  | jq '.species | length'
```

Expected: positive count (assumes salmon species seeded).

---

## 5. Species detail

```bash
# Probe a real slug from list first, then:
curl -s "$BC_URL/api/v1/species/chinook-salmon" -H "x-api-key: $KEY" \
  | jq '.species.slug, (.featured_cities | length), (.top_spots | length)'
```

Expected: `"chinook-salmon"`, integers (may be 0 in early seed states).

```bash
# 404
curl -s -o /dev/null -w "%{http_code}\n" "$BC_URL/api/v1/species/banana-fish" \
  -H "x-api-key: $KEY"
```

Expected: `404`.

---

## 6. Score — multi-day, multi-species

The score endpoint requires real `spot_id` and `species_id` UUIDs. Discover them first:

```bash
SPOT_ID=$(curl -s "$BC_URL/api/v1/cities/victoria/spots" -H "x-api-key: $KEY" | jq -r '.spots[0].id')
SPECIES_ID=$(curl -s "$BC_URL/api/v1/species?limit=1" -H "x-api-key: $KEY" | jq -r '.species[0].id')
echo "$SPOT_ID / $SPECIES_ID"
```

```bash
# Single-hour back-compat
curl -s "$BC_URL/api/v1/fishing-spots/$SPOT_ID/score?species=$SPECIES_ID" -H "x-api-key: $KEY" \
  | jq '.spot_id, .hour_utc, (.stocks | length)'
```

Expected: spot_id echoed, an ISO hour, count (may be 0 if not yet scored).

```bash
# 14-day, single species
curl -s "$BC_URL/api/v1/fishing-spots/$SPOT_ID/score?species=$SPECIES_ID&days=14" \
  -H "x-api-key: $KEY" | jq '(.days | length), .meta'
```

Expected: `14`, meta with `days_returned: 14`.

```bash
# Multi-species, 1 day
SPECIES_IDS=$(curl -s "$BC_URL/api/v1/species?limit=3" -H "x-api-key: $KEY" \
  | jq -r '[.species[].id] | join(",")')
curl -s "$BC_URL/api/v1/fishing-spots/$SPOT_ID/score?species=$SPECIES_IDS&days=1" \
  -H "x-api-key: $KEY" | jq '.species_ids, (.days[0].species | keys)'
```

Expected: array of N ids; the species map keyed by those ids.

```bash
# Bad: missing species param
curl -s -o /dev/null -w "%{http_code}\n" "$BC_URL/api/v1/fishing-spots/$SPOT_ID/score" \
  -H "x-api-key: $KEY"
```

Expected: `400`.

---

## 7. Cache headers

```bash
curl -sI "$BC_URL/api/v1/cities?status=published&limit=1" -H "x-api-key: $KEY" \
  | grep -i cache-control
```

Expected: `Cache-Control: public, max-age=300, s-maxage=900` (or similar).

---

## When to run

- Before any deploy that touches `/api/v1/cities`, `/provinces`, `/species`, or `/fishing-spots/.../score`.
- After running `npm run build` to confirm route table includes all new endpoints.
- Pair with `pnpm test:e2e e2e/api/bluecaster.spec.ts` for the automated equivalent.
