import { ImageResponse } from 'next/og'
import { SITE_NAME } from '@/lib/site'
import { loadPublicBookingPage } from '@/server/booking-public-page'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = SITE_NAME

export default async function BookingOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = await loadPublicBookingPage(slug)
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 24,
          padding: '0 96px',
          background: 'linear-gradient(150deg, #fbfaff, #efeafc)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, color: '#1b1830' }}>
          {page?.displayName ?? SITE_NAME}
        </div>
        {page?.headline && (
          <div style={{ fontSize: 36, color: '#5b5677' }}>{page.headline}</div>
        )}
        <div style={{ fontSize: 28, color: '#6d4ae6' }}>{SITE_NAME}</div>
      </div>
    ),
    size,
  )
}
