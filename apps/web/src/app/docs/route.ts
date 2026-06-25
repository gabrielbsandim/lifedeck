import { SITE_NAME } from '@/lib/site'

const NONCE_PATTERN = /^[A-Za-z0-9+/=_-]{16,128}$/

export function GET(request: Request) {
  const rawNonce = request.headers.get('x-nonce') ?? ''
  const nonceAttr = NONCE_PATTERN.test(rawNonce) ? ` nonce="${rawNonce}"` : ''
  const fontStack =
    "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
  const html = `<!doctype html>
<html>
  <head>
    <title>${SITE_NAME} API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.svg" />
    <style${nonceAttr}>:root{--scalar-font:${fontStack};--scalar-font-code:ui-monospace,SFMono-Regular,Menlo,monospace}</style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/v1/openapi"
      data-configuration='{"withDefaultFonts":false}'${nonceAttr}
    ></script>
    <script src="/scalar/standalone.js"${nonceAttr}></script>
  </body>
</html>`

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
