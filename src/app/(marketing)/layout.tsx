import MarketingHeader from '@/app/components/marketing/marketing-header'
import MarketingFooter from '@/app/components/marketing/marketing-footer'

// (marketing) route group — public surface, dark `rc-*` theme so it
// previews the brand the user gets after sign-up. NO `AppShell` chrome.
export default function MarketingGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-rc-bg-darkest text-rc-text antialiased flex flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}
