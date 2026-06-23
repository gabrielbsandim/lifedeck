import { ImageResponse } from 'next/og'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = `${SITE_NAME} - ${SITE_DESCRIPTION}`

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 28,
          padding: 96,
          background: 'linear-gradient(135deg, #6d4ae6 0%, #4c1fb8 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              background: 'rgba(255,255,255,0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="52"
              height="52"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span style={{ fontSize: 56, fontWeight: 700 }}>{SITE_NAME}</span>
        </div>
        <span style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.1 }}>
          {SITE_DESCRIPTION}
        </span>
        <span style={{ fontSize: 32, opacity: 0.85 }}>
          A shareable, multilingual to-do platform.
        </span>
      </div>
    ),
    size,
  )
}
