export function GET(request: Request) {
  const nonce = request.headers.get('x-nonce') ?? ''
  const nonceAttr = nonce ? ` nonce="${nonce}"` : ''
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
