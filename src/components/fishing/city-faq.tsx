import type { BlueCasterCityPage } from "@/lib/bluecaster";

type FaqEntry = BlueCasterCityPage["page"]["faq"][number];

export default function CityFaq({ faq }: { faq: FaqEntry[] }) {
  if (!faq || faq.length === 0) return null;

  return (
    <section
      data-testid="section-city-faq"
      className="max-w-6xl mx-auto px-6 py-12"
    >
      <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-rc-text mb-6">
        Frequently Asked Questions
      </h2>

      <dl className="space-y-2">
        {faq.map((entry, i) => (
          <details
            key={entry.q.slice(0, 40).replace(/\s+/g, "-").toLowerCase()}
            className="group border border-rc-bg-light rounded-lg overflow-hidden"
            {...(i === 0 ? { open: true } : {})}
          >
            <summary className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-rc-bg-light transition-colors list-none [&::-webkit-details-marker]:hidden">
              <dt className="text-sm font-semibold text-rc-text pr-4">
                {entry.q}
              </dt>
              <svg
                className="w-4 h-4 text-rc-text-muted shrink-0 transition-transform group-open:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <dd className="px-5 pb-4 pt-0 border-t border-rc-bg-light">
              <p className="text-sm leading-relaxed text-rc-text-light mt-3">
                {entry.a}
              </p>
            </dd>
          </details>
        ))}
      </dl>
    </section>
  );
}
