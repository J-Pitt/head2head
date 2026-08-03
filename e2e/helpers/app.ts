import { By, until, type WebDriver, type WebElement } from 'selenium-webdriver'

export type { WebDriver, WebElement }

export const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000'
export const DEFAULT_TIMEOUT = 15_000

export function uniqueName(prefix: string) {
  return `${prefix}${Date.now().toString(36).slice(-5)}`
}

export async function goHome(driver: WebDriver) {
  await driver.get(BASE_URL)
  await driver.wait(until.elementLocated(By.css('h1.logo, .logo, .app-shell')), DEFAULT_TIMEOUT)
}

export async function clearSiteStorage(driver: WebDriver) {
  await driver.get(BASE_URL)
  await driver.executeScript(`
    try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
  `)
  await driver.navigate().refresh()
  await driver.wait(until.elementLocated(By.css('.app-shell, h1')), DEFAULT_TIMEOUT)
}

export async function clickByText(
  driver: WebDriver,
  tag: string,
  text: string,
  timeout = DEFAULT_TIMEOUT
): Promise<WebElement> {
  const xpath = `//${tag}[contains(normalize-space(.), ${JSON.stringify(text)})]`
  const el = await driver.wait(until.elementLocated(By.xpath(xpath)), timeout)
  await driver.wait(until.elementIsVisible(el), timeout)
  await driver.wait(until.elementIsEnabled(el), timeout)
  await scrollAndClick(driver, el)
  return el
}

export async function findByText(
  driver: WebDriver,
  tag: string,
  text: string,
  timeout = DEFAULT_TIMEOUT
): Promise<WebElement> {
  const xpath = `//${tag}[contains(normalize-space(.), ${JSON.stringify(text)})]`
  const el = await driver.wait(until.elementLocated(By.xpath(xpath)), timeout)
  await driver.wait(until.elementIsVisible(el), timeout)
  return el
}

export async function waitForText(
  driver: WebDriver,
  text: string,
  timeout = DEFAULT_TIMEOUT
): Promise<WebElement> {
  const xpath = `//*[contains(normalize-space(.), ${JSON.stringify(text)})]`
  const el = await driver.wait(until.elementLocated(By.xpath(xpath)), timeout)
  await driver.wait(until.elementIsVisible(el), timeout)
  return el
}

export async function fillName(driver: WebDriver, name: string) {
  const input = await driver.wait(
    until.elementLocated(By.css('input[placeholder="Alex"]')),
    DEFAULT_TIMEOUT
  )
  await input.clear()
  await input.sendKeys(name)
}

export async function acceptPrompt(driver: WebDriver, value: string) {
  await driver.wait(until.alertIsPresent(), DEFAULT_TIMEOUT)
  const alert = await driver.switchTo().alert()
  await alert.sendKeys(value)
  await alert.accept()
}

export async function readRoomCode(driver: WebDriver): Promise<string> {
  // Trivia room bar: "Code: ABC123" or party/tod: room-code-display
  const candidates = [
    By.css('.room-code-display'),
    By.css('.room-code'),
  ]
  for (const locator of candidates) {
    const els = await driver.findElements(locator)
    for (const el of els) {
      const text = (await el.getText()).trim()
      const match = text.match(/\b([A-Z0-9]{4,6})\b/)
      if (match) return match[1]
    }
  }
  throw new Error('Could not find a room code on the page')
}

export async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

export async function scrollAndClick(driver: WebDriver, el: WebElement) {
  await driver.executeScript(
    'arguments[0].scrollIntoView({block:"center", inline:"nearest"});',
    el
  )
  await sleep(150)
  try {
    await el.click()
  } catch {
    await driver.executeScript('arguments[0].click();', el)
  }
}
