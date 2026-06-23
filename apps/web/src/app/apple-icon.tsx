import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #7d5bf0, #6741dd)',
        }}
      >
        <svg width="116" height="116" viewBox="0 0 32 32">
          <rect
            x="13"
            y="4"
            width="15"
            height="20"
            rx="4.5"
            fill="#ffffff"
            opacity="0.4"
          />
          <rect
            x="10"
            y="6.5"
            width="15"
            height="20"
            rx="4.5"
            fill="#ffffff"
            opacity="0.7"
          />
          <rect x="7" y="9" width="15" height="20" rx="4.5" fill="#ffffff" />
          <circle cx="12" cy="14.5" r="2.1" fill="#bd74e8" />
        </svg>
      </div>
    ),
    size,
  )
}
