// Renders apps/mobile/assets/source/*.svg into the PNGs Expo ships in the app
// binary. Run it after touching any of those sources:
//
//   node scripts/render-mobile-assets.mjs
//
// Chromium is the rasteriser because the workspace already installs it for the
// web e2e suite; adding a second native image dependency just to convert four
// files once in a while is not worth the install cost. Playwright lives in
// apps/web, so it is resolved from there rather than from this file.
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(
  new URL('../apps/web/package.json', import.meta.url),
)
const { chromium } = require('@playwright/test')

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const source = join(root, 'apps/mobile/assets/source')
const out = join(root, 'apps/mobile/assets')

// [source file, output file, pixel size]. Sizes follow Expo's guidance: 1024
// for anything the store or the launcher resizes, 96 for the Android status
// bar icon, 48 for the web favicon.
const targets = [
  ['icon.svg', 'icon.png', 1024],
  ['adaptive-icon.svg', 'adaptive-icon.png', 1024],
  ['splash-icon.svg', 'splash-icon.png', 1024],
  ['notification-icon.svg', 'notification-icon.png', 96],
  ['icon.svg', 'favicon.png', 48],
]

const browser = await chromium.launch()
try {
  await mkdir(out, { recursive: true })
  for (const [from, to, size] of targets) {
    const svg = await readFile(join(source, from), 'utf8')
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    })
    // The sources carry a viewBox but no width/height, so the viewport alone
    // decides the output resolution and one source can serve several sizes.
    await page.setContent(
      `<style>html,body{margin:0}svg{display:block;width:100vw;height:100vh}</style>${svg}`,
    )
    const png = await page.screenshot({ omitBackground: true })
    await writeFile(join(out, to), png)
    await page.close()
    console.log(`${to} (${size}x${size})`)
  }
} finally {
  await browser.close()
}
