import { ImageResponse } from 'next/og'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/site'

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
          padding: '0 96px',
          position: 'relative',
          background: 'linear-gradient(150deg, #fbfaff, #efeafc)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -60,
            bottom: -90,
            display: 'flex',
            opacity: 0.5,
          }}
        >
          <svg width="520" height="520" viewBox="0 0 32 32">
            <rect x="13" y="4" width="15" height="20" rx="4.5" fill="#ddd0f7" />
            <rect
              x="10"
              y="6.5"
              width="15"
              height="20"
              rx="4.5"
              fill="#bda3f0"
            />
            <rect x="7" y="9" width="15" height="20" rx="4.5" fill="#6d4ae6" />
            <circle cx="12" cy="14.5" r="2.1" fill="#9a4fd6" />
          </svg>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginBottom: 36,
          }}
        >
          <svg width="64" height="64" viewBox="0 0 32 32">
            <rect x="13" y="4" width="15" height="20" rx="4.5" fill="#dbcdf6" />
            <rect
              x="10"
              y="6.5"
              width="15"
              height="20"
              rx="4.5"
              fill="#b89df0"
            />
            <rect x="7" y="9" width="15" height="20" rx="4.5" fill="#6d4ae6" />
            <circle cx="12" cy="14.5" r="2.1" fill="#9a4fd6" />
          </svg>
          <span
            style={{
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#23202e',
            }}
          >
            {SITE_NAME}
          </span>
        </div>

        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.08,
            color: '#23202e',
            maxWidth: 760,
            display: 'flex',
          }}
        >
          {SITE_DESCRIPTION}
        </div>
        <div
          style={{
            fontSize: 30,
            color: '#5b5570',
            marginTop: 22,
            display: 'flex',
          }}
        >
          {SITE_TAGLINE}
        </div>
      </div>
    ),
    size,
  )
}
