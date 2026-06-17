import type { Metadata } from "next";
import { fetchHierarchy, fetchMapSpots } from "@/lib/bluecaster";
import { buildExploreData } from "./lib/explore-data";
import ExploreShell from "./explore-shell";

const SITE_URL = "https://reelcaster.com";

// Covers BC + WA + OR — the same extent the old province pills spanned.
const COVERED_BBOX_ALL = "-139.06,41.99,-114.03,60";

export const metadata: Metadata = {
  title: "Explore | ReelCaster",
  description:
    "Interactive fishing map — browse covered spots in BC, WA, and OR with live scores, conditions, and the day's best windows.",
  alternates: { canonical: `${SITE_URL}/explore` },
  openGraph: {
    title: "Explore | ReelCaster",
    description:
      "Interactive fishing map — browse covered spots and see live RC scores.",
    url: `${SITE_URL}/explore`,
    siteName: "ReelCaster",
    type: "website",
    locale: "en_CA",
  },
  robots: { index: true, follow: true },
};

export default async function ExplorePage() {
  const [hierarchy, payload] = await Promise.all([
    fetchHierarchy(),
    fetchMapSpots({ bbox: COVERED_BBOX_ALL }),
  ]);

  const data = buildExploreData(hierarchy, payload);

  return <ExploreShell data={data} bbox={COVERED_BBOX_ALL} />;
}
