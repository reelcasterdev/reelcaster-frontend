import type { Metadata } from 'next'
import MySpotDetailClient from './my-spot-detail-client'

export const metadata: Metadata = {
  title: 'My Spot | ReelCaster',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function MySpotDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <MySpotDetailClient slug={slug} />
}
