import { Builder, type WebDriver } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome'

export async function createDriver(opts?: {
  headless?: boolean
  width?: number
  height?: number
}): Promise<WebDriver> {
  const headless = opts?.headless ?? process.env.HEADED !== '1'
  const width = opts?.width ?? 1280
  const height = opts?.height ?? 1100

  const options = new chrome.Options()
  if (headless) {
    options.addArguments('--headless=new')
  }
  options.addArguments(
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    `--window-size=${width},${height}`,
    '--force-device-scale-factor=1'
  )

  // Prefer the system Chrome on macOS when present.
  if (process.platform === 'darwin') {
    options.setChromeBinaryPath('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
  }

  return new Builder().forBrowser('chrome').setChromeOptions(options).build()
}

export async function quitQuietly(driver: WebDriver | null | undefined) {
  if (!driver) return
  try {
    await driver.quit()
  } catch {
    // ignore teardown races
  }
}
