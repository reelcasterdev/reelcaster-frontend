import MarketingHeader from '@/app/components/marketing/marketing-header'
import MarketingFooter from '@/app/components/marketing/marketing-footer'

// /fishing is public SEO content. Lives outside the (marketing) route group
// for legacy URL stability, but renders the same marketing chrome so the
// header/footer match the homepage and /species pages.
export default function FishingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-rc-bg-darkest text-rc-text flex flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
