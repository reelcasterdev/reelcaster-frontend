import {
  fetchPublishedCities,
  fetchPublishedSpots,
  fetchSpeciesList,
} from "@/lib/bluecaster";

const SITE = "https://reelcaster.com";

export default async function sitemap() {
  const [cities, spots, species] = await Promise.all([
    fetchPublishedCities(),
    fetchPublishedSpots(),
    fetchSpeciesList({ limit: 200 }),
  ]);

  // Static + index entries
  const staticEntries = [
    { url: `${SITE}/`, changeFrequency: "weekly" as const, priority: 1.0 },
    { url: `${SITE}/fishing`, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${SITE}/species`, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${SITE}/regulations`, changeFrequency: "daily" as const, priority: 0.6 },
    { url: `${SITE}/pricing`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${SITE}/about`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${SITE}/faq`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${SITE}/contact`, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${SITE}/privacy`, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${SITE}/terms`, changeFrequency: "yearly" as const, priority: 0.3 },
  ];

  // Province index pages — derived from cities' province codes
  const provinceCodes = Array.from(
    new Set(cities.map((c) => (c.province ?? "bc")).filter(Boolean)),
  );
  const provinceEntries = provinceCodes.map((code) => ({
    url: `${SITE}/fishing/${code}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const cityEntries = cities.map((p) => ({
    url: `${SITE}/fishing/${p.province ?? "bc"}/${p.slug}`,
    lastModified: p.published_at ?? undefined,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const spotEntries = spots.map((s) => ({
    url: `${SITE}/fishing/${s.province_code}/${s.city_slug}/${s.slug}`,
    lastModified: s.published_at ?? undefined,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  const speciesEntries = species.map((s) => ({
    url: `${SITE}/species/${s.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    ...staticEntries,
    ...provinceEntries,
    ...cityEntries,
    ...spotEntries,
    ...speciesEntries,
  ];
}
