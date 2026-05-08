import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MessageCircle, AlertCircle, Newspaper } from 'lucide-react';

const SITE_URL = 'https://reelcaster.com';
const SUPPORT_EMAIL = 'support@reelcaster.com';

export const metadata: Metadata = {
  title: 'Contact ReelCaster | Support, Billing, Press',
  description:
    'Get in touch with ReelCaster for support, billing questions, spot data corrections, or press inquiries. We respond within two business days.',
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: 'Contact ReelCaster',
    description: 'How to reach ReelCaster support.',
    url: `${SITE_URL}/contact`,
    siteName: 'ReelCaster',
    type: 'website',
    locale: 'en_CA',
  },
  robots: { index: true, follow: true },
};

const JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact ReelCaster',
  url: `${SITE_URL}/contact`,
  inLanguage: 'en-CA',
  publisher: {
    '@type': 'Organization',
    name: 'ReelCaster',
    url: SITE_URL,
    email: SUPPORT_EMAIL,
  },
};

const TOPICS = [
  {
    icon: AlertCircle,
    label: 'Refund or billing issue',
    subject: 'Billing question',
  },
  {
    icon: MessageCircle,
    label: 'Spot data correction',
    subject: 'Spot data correction',
  },
  {
    icon: Newspaper,
    label: 'Press / partnerships',
    subject: 'Press inquiry',
  },
];

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
      />

      <article data-testid="section-contact">
        <header className="max-w-5xl mx-auto px-6 pt-14 pb-8 md:pt-20 md:pb-10">
          <p className="text-rc-text-muted text-xs tracking-[0.25em] uppercase font-medium mb-3">
            Help · Contact
          </p>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-rc-text mb-4">
            Get in touch
          </h1>
          <p className="max-w-2xl text-base md:text-lg leading-relaxed text-rc-text-light">
            Email is the fastest way to reach us. Most messages get a reply
            within two business days (BC time, weekdays).
          </p>
        </header>

        <section className="max-w-3xl mx-auto px-6 pb-16 space-y-8">
          <div className="bg-rc-bg-dark border border-rc-bg-light rounded-xl p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20 flex-shrink-0">
                <Mail className="w-6 h-6 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-rc-text-muted mb-1">
                  Email
                </p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-xl md:text-2xl font-semibold text-rc-text hover:text-blue-300 underline-offset-4 hover:underline break-all"
                >
                  {SUPPORT_EMAIL}
                </a>
                <p className="text-sm text-rc-text-muted mt-2">
                  Include your account email and any relevant screenshots or
                  spot URLs — it speeds things up.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-rc-text mb-4">
              Common topics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TOPICS.map((t) => (
                <a
                  key={t.label}
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                    t.subject,
                  )}`}
                  className="bg-rc-bg-dark border border-rc-bg-light rounded-xl p-4 hover:border-blue-500/40 transition-colors flex flex-col gap-3"
                >
                  <t.icon className="w-5 h-5 text-rc-text-muted" />
                  <span className="text-sm font-medium text-rc-text">
                    {t.label}
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div className="bg-rc-bg-dark border border-rc-bg-light rounded-xl p-6 text-sm text-rc-text-light leading-relaxed">
            <p>
              Looking for self-serve answers first? The{' '}
              <Link
                href="/faq"
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                FAQ
              </Link>{' '}
              covers tiers, region coverage, billing, and how forecasts are
              built. For DFO regulation questions, the official source is{' '}
              <a
                href="https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/index-eng.html"
                target="_blank"
                rel="noopener"
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                DFO Pacific Region
              </a>
              .
            </p>
          </div>

          <p className="text-xs text-rc-text-muted">
            ReelCaster is based in Victoria, BC, Canada.
          </p>
        </section>
      </article>
    </>
  );
}
