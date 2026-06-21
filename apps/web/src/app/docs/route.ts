export function GET() {
  const html = `<!doctype html>
<html>
  <head>
    <title>TaskIn API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/api/v1/openapi"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.0"></script>
  </body>
</html>`

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
