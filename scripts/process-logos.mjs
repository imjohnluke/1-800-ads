/**
 * Cleans exported logo PNGs (removes dark fringes, trims padding).
 * Run: node scripts/process-logos.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../public/images/1-800-ads')

const srcWhite =
  process.argv[2] ??
  join(__dirname, '../public/images/1-800-ads/logo-white.source.png')

async function main() {
  let PNG
  try {
    PNG = require('pngjs').PNG
  } catch {
    console.error('Install pngjs first: npm install --save-dev pngjs')
    process.exit(1)
  }

  if (!existsSync(srcWhite)) {
    console.error(`Missing source logo: ${srcWhite}`)
    process.exit(1)
  }

  const input = PNG.sync.read(readFileSync(srcWhite))
  const { width, height, data } = input

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]

    if (a < 24) {
      data[i + 3] = 0
      continue
    }

    if (a < 245 && r + g + b < 120) {
      data[i + 3] = 0
      continue
    }

    data[i + 3] = 255
  }

  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (data[i + 3] > 0) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  const pad = 8
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad)
  maxY = Math.min(height - 1, maxY + pad)

  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1
  const cropped = new PNG({ width: cropW, height: cropH })

  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const src = ((y + minY) * width + (x + minX)) * 4
      const dst = (y * cropW + x) * 4
      cropped.data[dst] = data[src]
      cropped.data[dst + 1] = data[src + 1]
      cropped.data[dst + 2] = data[src + 2]
      cropped.data[dst + 3] = data[src + 3]
    }
  }

  const out = PNG.sync.write(cropped)
  writeFileSync(join(outDir, 'logo-white.png'), out)
  writeFileSync(join(outDir, 'logo.png'), out)
  console.log(`Wrote logo-white.png (${cropW}x${cropH})`)
}

main()
