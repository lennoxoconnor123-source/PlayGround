#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
: "${CAPTURE_URL:?CAPTURE_URL must be the exact preview URL}"
: "${CAPTURE_DIR:?CAPTURE_DIR must be the evidence output directory}"
export PROJECT_DIR
/usr/bin/time -p node --input-type=module <<'NODE'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, realpathSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'

const project = realpathSync(process.env.PROJECT_DIR)
const output = resolve(process.env.CAPTURE_DIR)
const rel = relative(project, output)
if (!isAbsolute(process.env.CAPTURE_DIR) || rel === '' || (rel !== '..' && !rel.startsWith(`..${process.platform === 'win32' ? '\\\\' : '/'}`) && !isAbsolute(rel))) {
  console.error('CAPTURE_DIR must be an absolute path outside the project source tree.')
  process.exit(1)
}
let target
try {
  target = new URL(process.env.CAPTURE_URL)
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error('URL must use HTTP or HTTPS.')
} catch (error) {
  console.error(`Invalid CAPTURE_URL: ${error.message}`)
  process.exit(1)
}

const playwrightHome = join(process.env.HOME, '.local/share/omgithub-playwright')
const require = createRequire(join(playwrightHome, 'package.json'))
let chromium, config
try {
  ({ chromium } = require('playwright'))
  const configPath = join(playwrightHome, process.platform === 'darwin' ? 'metal.json' : 'linux.json')
  config = JSON.parse(readFileSync(configPath, 'utf8'))
  if (process.platform === 'linux') {
    process.env.DISPLAY ||= ':' + readFileSync(join(playwrightHome, 'display'), 'utf8').trim()
  }
} catch (error) {
  console.error(`Browser automation setup unavailable: ${error.message}`)
  process.exit(75)
}

mkdirSync(output, { recursive: true })
let browser
let exitCode = 0
const infrastructureError = error => {
  const text = `${error?.name || ''} ${error?.message || error}`
  return /timeout|timed out|net::|browser.*(closed|disconnected)|target.*closed|connection.*closed|crash|launch/i.test(text)
}
try {
  try {
    browser = await chromium.launch({ ...config.browser.launchOptions, timeout: 30000 })
  } catch (error) {
    console.error(`Could not launch capture browser: ${error.message}`)
    process.exitCode = 75
    throw error
  }

  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    let page
    try {
      page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    } catch (error) {
      console.error(`Could not create ${name} browser page: ${error.message}`)
      process.exitCode = 75
      throw error
    }

    const origin = target.origin
    const defects = []
    page.on('pageerror', error => defects.push(`JavaScript error: ${error.message}`))
    page.on('response', response => {
      let sameOrigin = false
      try { sameOrigin = new URL(response.url()).origin === origin } catch {}
      if (sameOrigin && response.status() >= 400) defects.push(`HTTP ${response.status()}: ${response.url()}`)
    })
    page.on('requestfailed', request => {
      let sameOrigin = false
      try { sameOrigin = new URL(request.url()).origin === origin } catch {}
      if (sameOrigin) defects.push(`Request failed: ${request.url()} (${request.failure()?.errorText || 'unknown error'})`)
    })

    let response
    try {
      response = await page.goto(process.env.CAPTURE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
    } catch (error) {
      console.error(`Temporary navigation failure for ${name}: ${error.message}`)
      process.exitCode = 75
      throw error
    }
    if (!response) {
      console.error(`Navigation returned no response for ${name}.`)
      process.exitCode = 75
      throw new Error('Navigation returned no response.')
    }
    if (response.status() >= 500 || [408, 429].includes(response.status())) {
      console.error(`Temporary preview response HTTP ${response.status()} for ${name}.`)
      process.exitCode = 75
      throw new Error(`Temporary HTTP ${response.status()}`)
    }
    if (!response.ok()) throw new Error(`Preview returned HTTP ${response.status()} for ${name}.`)

    try {
      await page.locator('#game').waitFor({ state: 'visible', timeout: 20000 })
      await page.locator('#start-button').waitFor({ state: 'visible', timeout: 20000 })
      await page.waitForFunction(() => {
        const canvas = document.querySelector('#game')
        return document.readyState !== 'loading' && canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0 && document.body.innerText.trim().length > 0
      }, { timeout: 20000 })
      await page.evaluate(() => document.fonts?.ready)
    } catch (error) {
      process.exitCode = 1
      throw new Error(`Rendered content check failed for ${name}: ${error.message}`)
    }

    await page.waitForTimeout(700)
    await page.screenshot({ path: join(output, `final-${name}.png`), fullPage: false, timeout: 30000 }).catch(error => {
      if (infrastructureError(error)) process.exitCode = 75
      throw error
    })
    if (defects.length) throw new Error(`${name} page defects: ${[...new Set(defects)].join('; ')}`)
    console.log(`Captured ${name} view (${width}x${height}) at ${process.env.CAPTURE_URL}`)
    await page.close()
  }
} catch (error) {
  if (!process.exitCode) process.exitCode = infrastructureError(error) ? 75 : 1
  console.error(error.message || error)
} finally {
  if (browser) {
    try { await browser.close() }
    catch (error) {
      console.error(`Could not close capture browser cleanly: ${error.message}`)
      if (!process.exitCode) process.exitCode = 75
    }
  }
}
NODE
