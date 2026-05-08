import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  fetchCityPage,
  fetchSpotPage,
  fetchSpecies,
  type BlueCasterCityPage,
  type BlueCasterSpotPage,
} from "@/lib/bluecaster";
import CityHero from "@/components/fishing/city-hero";
import CityConditionsStrip from "@/components/fishing/city-conditions-strip";
import CityAbout from "@/components/fishing/city-about";
import CityTechniques from "@/components/fishing/city-techniques";
import CityScoreCta from "@/components/fishing/city-score-cta";
import CitySpots from "@/components/fishing/city-spots";
import CitySpeciesTable from "@/components/fishing/city-species-table";
import CitySeasonalGuide from "@/components/fishing/city-seasonal-guide";
import CityLocalIntel from "@/components/fishing/city-local-intel";
import CityAccessPoints from "@/components/fishing/city-access-points";
import CityLocalExperts from "@/components/fishing/city-local-experts";
import CityFaq from "@/components/fishing/city-faq";
import CityJsonLd from "@/components/fishing/city-json-ld";
import CityRegulationAlerts from "@/components/fishing/city-regulation-alerts";
import CityCatchReports from "@/components/fishing/city-catch-reports";
import SpotHero from "@/components/fishing/spot-hero";
import SpotScoreCta from "@/components/fishing/spot-score-cta";
import SpotSeasonalAbundance from "@/components/fishing/spot-seasonal-abundance";
import SpotAccessPoints from "@/components/fishing/spot-access-points";
import SpotLocalExperts from "@/components/fishing/spot-local-experts";
import SpotJsonLd from "@/components/fishing/spot-json-ld";
import SpotBreakdownPanel from "@/components/fishing/spot-breakdown-panel";
import SpotPaywallTeaser from "@/components/fishing/spot-paywall-teaser";
import SpotRegulationAlerts from "@/components/fishing/spot-regulation-alerts";
import SpotNearbySpots from "@/components/fishing/spot-nearby-spots";
import AuthAwareReveal from "@/app/components/marketing/auth-aware-reveal";
import SignedOutSpotBanner from "@/app/components/marketing/signed-out-spot-banner";
import HorizonAwareForecast from "@/app/components/marketing/horizon-aware-forecast";

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

const SITE_URL = "https://reelcaster.com";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [, citySlug, spotSlug, speciesSlug] = slug;
  if (!citySlug) return {};

  try {
    // 4 segments: spot + species filter — species-tailored meta
    if (spotSlug && speciesSlug) {
      const [spotData, speciesData] = await Promise.all([
        fetchSpotPage(spotSlug),
        fetchSpecies(speciesSlug),
      ]);
      if (!spotData || spotData.page.status !== "published" || !speciesData) return {};
      const canonical = `${SITE_URL}/fishing/${slug.join("/")}`;
      const speciesName = speciesData.species.name;
      const spotTitle = `${speciesName} Fishing at ${spotData.spot.name} | ReelCaster`;
      const description = `When and where to catch ${speciesName} at ${spotData.spot.name}. Seasonal abundance, regulations, and local conditions from ReelCaster.`;
      return buildMetadata(
        spotTitle,
        description,
        canonical,
        spotData.page.seo.og_image_url ?? spotData.page.hero.image_url,
        spotData.page.hero.image_alt ?? spotData.page.hero.h1,
      );
    }

    if (spotSlug) {
      const data = await fetchSpotPage(spotSlug);
      if (!data || data.page.status !== "published") return {};
      const canonical = `${SITE_URL}/fishing/${slug.join("/")}`;
      return buildMetadata(
        data.page.seo.title,
        data.page.seo.meta_description,
        canonical,
        data.page.seo.og_image_url ?? data.page.hero.image_url,
        data.page.hero.image_alt ?? data.page.hero.h1,
      );
    }

    const data = await fetchCityPage(citySlug);
    if (!data || data.page.status !== "published") return {};
    const canonical = `${SITE_URL}/fishing/${slug.join("/")}`;
    return buildMetadata(
      data.page.seo.title,
      data.page.seo.meta_description,
      canonical,
      data.page.seo.og_image_url,
      data.page.hero.image_alt ?? data.page.hero.h1,
    );
  } catch {
    return {};
  }
}

function buildMetadata(
  title: string,
  description: string,
  canonical: string,
  ogImage: string | null,
  ogAlt: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "ReelCaster",
      images: ogImage ? [{ url: ogImage, alt: ogAlt }] : [],
      type: "article",
      locale: "en_CA",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function FishingPage({ params }: PageProps) {
  const { slug } = await params;
  const [provinceCode, citySlug, spotSlug, speciesSlug, ...rest] = slug;

  if (!provinceCode || !citySlug || rest.length > 0) {
    notFound();
  }

  if (spotSlug) {
    return <SpotPage spotSlug={spotSlug} speciesSlug={speciesSlug ?? null} />;
  }

  return <CityPage citySlug={citySlug} />;
}

async function CityPage({ citySlug }: { citySlug: string }) {
  let data: BlueCasterCityPage | null;
  try {
    data = await fetchCityPage(citySlug);
  } catch {
    notFound();
  }

  if (!data || data.page.status !== "published") {
    notFound();
  }

  return (
    <>
      <CityJsonLd data={data} />
      <article>
        <CityHero data={data} />
        <CityConditionsStrip conditions={data.conditions_now} />
        <CityRegulationAlerts regulatoryAreas={data.regulatory_areas} />
        <CityAbout md={data.page.about_md} cityName={data.hierarchy.city.name} />
        <CityTechniques techniques={data.page.techniques} />
        <CityScoreCta score={data.rc_score_today} citySlug={data.page.slug} />
        <CitySpots
          citySlug={data.hierarchy.city.slug}
          cityName={data.hierarchy.city.name}
          provinceCode={data.hierarchy.province.code}
        />
        <CitySpeciesTable
          rows={data.species_table}
          regulatoryAreas={data.regulatory_areas}
        />
        <CitySeasonalGuide quarters={data.seasonal_guide} />
        <CityCatchReports
          citySlug={data.hierarchy.city.slug}
          cityName={data.hierarchy.city.name}
        />
        <CityLocalIntel md={data.page.local_intel_md} />
        <CityAccessPoints points={data.access_points} />
        <CityLocalExperts charters={data.charters} />
        <CityFaq faq={data.page.faq} />
      </article>

      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-rc-bg-light text-center">
        <p className="text-xs text-rc-text-muted">
          Data provided by ReelCaster. Regulations are reference only &mdash; always verify with DFO.
        </p>
      </footer>
    </>
  );
}

async function SpotPage({
  spotSlug,
  speciesSlug,
}: {
  spotSlug: string;
  speciesSlug: string | null;
}) {
  let data: BlueCasterSpotPage | null;
  try {
    data = await fetchSpotPage(spotSlug);
  } catch {
    notFound();
  }

  if (!data || data.page.status !== "published") {
    notFound();
  }

  // Species options for the forecast filter — derived from the seasonal_abundance
  // list so the dropdown matches the species table the user just looked at.
  let speciesOptions = data.seasonal_abundance.map((r) => ({
    id: r.species_id,
    name: r.species_name,
  }));

  // 4-segment URL → restrict species table + abundance to the requested species.
  // 404 if the species doesn't actually appear at this spot.
  let speciesTableRows = data.species_table;
  let seasonalAbundance = data.seasonal_abundance;
  if (speciesSlug) {
    const matched = data.seasonal_abundance.find(
      (r) => r.species_slug === speciesSlug,
    );
    if (!matched) notFound();
    speciesOptions = [{ id: matched.species_id, name: matched.species_name }];
    speciesTableRows = data.species_table.filter(
      (r) => r.species_slug === speciesSlug,
    );
    seasonalAbundance = data.seasonal_abundance.filter(
      (r) => r.species_slug === speciesSlug,
    );
  }

  // Signed-out preview: clip the forecast to the next 6 hours. Authed users
  // get the full payload via <AuthAwareReveal mode="signed-in">.
  const sixHourCutoff = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  const previewForecast: BlueCasterSpotPage["forecast"] = {
    ...data.forecast,
    rows: data.forecast.rows.filter((r) => r.hour_utc <= sixHourCutoff),
  };

  // Seasonal abundance for signed-out: current month only, so the page still
  // shows seasonality without giving away the full year.
  const currentMonth = new Date().getUTCMonth() + 1; // 1..12
  const previewSeasonal = seasonalAbundance.map((row) => ({
    ...row,
    monthly_weights: row.monthly_weights.map((w, i) =>
      i + 1 === currentMonth ? w : 0,
    ),
  }));

  const fullData = data;

  return (
    <>
      <SpotJsonLd data={fullData} />
      <article>
        <SpotHero data={fullData} />
        <SpotRegulationAlerts dfoAreaLabel={fullData.spot.dfo_area_label} />
        <CityAbout md={fullData.page.about_md} cityName={fullData.spot.name} />
        <CityTechniques techniques={fullData.page.techniques} />
        <SpotScoreCta score={fullData.rc_score_now} spotSlug={fullData.page.slug} />

        {/* Forecast strip is tier-aware: signed-out=6h, free=1d+teaser, pro=14d */}
        <HorizonAwareForecast
          fullForecast={fullData.forecast}
          previewForecast={previewForecast}
          speciesOptions={speciesOptions}
          spotSlug={fullData.page.slug}
        />

        {/* Breakdown panel: authed only */}
        <AuthAwareReveal mode="signed-in">
          <SpotBreakdownPanel scoreNow={fullData.rc_score_now} />
        </AuthAwareReveal>

        <SpotPaywallTeaser
          spotSlug={fullData.page.slug}
          speciesSlug={
            speciesOptions.length > 0
              ? fullData.seasonal_abundance.find(
                  (r) => r.species_id === speciesOptions[0].id,
                )?.species_slug ?? null
              : null
          }
        />
        <CitySpeciesTable rows={speciesTableRows} regulatoryAreas={[]} />

        {/* Seasonal abundance: full for authed, current month for signed-out */}
        <AuthAwareReveal
          mode="signed-in"
          fallback={<SpotSeasonalAbundance rows={previewSeasonal} />}
        >
          <SpotSeasonalAbundance rows={seasonalAbundance} />
        </AuthAwareReveal>

        <CityLocalIntel md={fullData.page.local_intel_md} />
        <SpotAccessPoints points={fullData.access_points} />
        <SpotLocalExperts experts={fullData.local_experts} />
        <CityFaq faq={fullData.page.faq} />
        <SpotNearbySpots
          lat={fullData.spot.lat}
          lng={fullData.spot.lng}
          currentSlug={fullData.spot.slug}
        />
      </article>

      {/* Sticky bottom CTA for signed-out only */}
      <SignedOutSpotBanner spotSlug={fullData.page.slug} />

      <footer className="max-w-5xl mx-auto px-6 py-12 pb-24 border-t border-rc-bg-light text-center">
        <p className="text-xs text-rc-text-muted">
          Data provided by ReelCaster. Regulations are reference only &mdash; always verify with DFO.
        </p>
      </footer>
    </>
  );
}
