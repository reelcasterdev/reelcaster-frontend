// /fishing is public SEO content. City pages render with the standard
// marketing chrome (dark `bg-rc-bg-darkest` body + `<MarketingHeader>` +
// `<MarketingFooter>`) — that wrapping moved INTO the city branch of
// `[...slug]/page.tsx` so the spot branch can render its own light
// editorial layout without two stacked headers.
export default function FishingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
