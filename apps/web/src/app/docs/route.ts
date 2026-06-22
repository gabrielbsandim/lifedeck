const NONCE_PATTERN = /^[A-Za-z0-9+/=_-]{16,128}$/

export function GET(request: Request) {
  const rawNonce = request.headers.get('x-nonce') ?? ''
  const nonceAttr = NONCE_PATTERN.test(rawNonce) ? ` nonce="${rawNonce}"` : ''
  const html = `<!doctype html>
<html>
  <head>
    <title>TaskIn API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/api/v1/openapi"${nonceAttr}></script>
    <script src="/scalar/standalone.js"${nonceAttr}></script>
  </body>
</html>`

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
