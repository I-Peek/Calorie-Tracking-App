// Renders the SVG app icon to the PNG sizes required for the PWA manifest and iOS.
// Usage: node scripts/generate-icons.mjs  (requires Playwright's Chromium)
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
import { readFile, writeFile } from 'node:fs/promises'

const svg = await readFile(new URL('../public/icons/favicon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage()

async function render(size, file, { padding = 0, background } = {}) {
  const inner = size - padding * 2
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<html><body style="margin:0;background:${background ?? 'transparent'};display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`,
  )
  const buf = await page.screenshot({ omitBackground: !background, clip: { x: 0, y: 0, width: size, height: size } })
  await writeFile(new URL(`../public/icons/${file}`, import.meta.url), buf)
  console.log('wrote', file)
}

await render(192, 'icon-192.png')
await render(512, 'icon-512.png')
// Maskable icons need a safe zone: full-bleed background + centered artwork.
await render(512, 'icon-maskable-512.png', { padding: 56, background: '#059669' })
// iOS ignores transparency – use solid background.
await render(180, 'apple-touch-icon.png', { background: '#059669' })
await browser.close()
