import { By, until } from 'selenium-webdriver'
import { expect } from 'chai'
import { createDriver, quitQuietly } from './helpers/driver'
import {
  BASE_URL,
  DEFAULT_TIMEOUT,
  clearSiteStorage,
  clickByText,
  fillName,
  uniqueName,
  waitForText,
} from './helpers/app'
import type { WebDriver } from 'selenium-webdriver'

describe('Board Truth or Dare UI', function () {
  let driver: WebDriver

  before(async function () {
    driver = await createDriver()
  })

  after(async function () {
    await quitQuietly(driver)
  })

  beforeEach(async function () {
    await clearSiteStorage(driver)
  })

  it('starts a local lobby, adds a player, and opens the board', async function () {
    await driver.get(`${BASE_URL}/truth-or-dare?local=1`)
    await waitForText(driver, 'Set up your game')
    await fillName(driver, uniqueName('Board'))
    await clickByText(driver, 'button', 'Enter lobby')

    await waitForText(driver, 'Pass & play', 20_000)
    await waitForText(driver, "Let's go!")
    await clickByText(driver, 'button', '+ Add player')
    await waitForText(driver, 'Player 2')

    await clickByText(driver, 'button', "Let's go!")
    await driver.wait(until.elementLocated(By.css('.board-track, .board-play-panel')), 20_000)
    await waitForText(driver, 'Roll the dice')
  })

  it('hosts an online room and shows a shareable code', async function () {
    await driver.get(`${BASE_URL}/truth-or-dare?host=1`)
    await waitForText(driver, 'Start a board game')
    await fillName(driver, uniqueName('Host'))
    await clickByText(driver, 'button', 'Enter lobby')
    await waitForText(driver, 'Waiting room', 20_000)
    const codeEl = await driver.wait(until.elementLocated(By.css('.room-code-display')), 20_000)
    const code = (await codeEl.getText()).trim()
    expect(code).to.match(/^[A-Z0-9]{4,6}$/)
    const start = await driver.findElement(By.xpath(`//button[contains(., "Let's go")]`))
    expect(await start.isEnabled()).to.equal(false)
  })

  it('joins from a second browser and starts the board', async function () {
    const host = driver
    const guest = await createDriver()
    try {
      await clearSiteStorage(guest)

      await host.get(`${BASE_URL}/truth-or-dare?host=1`)
      await fillName(host, uniqueName('TH'))
      await clickByText(host, 'button', 'Enter lobby')
      await waitForText(host, 'Waiting room', 20_000)
      const code = (await host.findElement(By.css('.room-code-display')).getText()).trim()

      await guest.get(`${BASE_URL}/truth-or-dare?code=${encodeURIComponent(code)}`)
      await waitForText(guest, 'Join the board game', 20_000)
      await fillName(guest, uniqueName('TG'))
      await clickByText(guest, 'button', 'Join lobby')
      await waitForText(guest, 'Waiting for the host', 20_000)

      await host.wait(
        until.elementIsEnabled(
          await host.findElement(By.xpath(`//button[contains(., "Let's go")]`))
        ),
        20_000
      )
      await clickByText(host, 'button', "Let's go!")
      await host.wait(until.elementLocated(By.css('.board-track, .board-play-panel')), 20_000)
      await guest.wait(until.elementLocated(By.css('.board-track, .board-play-panel')), 20_000)
    } finally {
      await quitQuietly(guest)
    }
  })

  it('can leave a lobby back to home', async function () {
    await driver.get(`${BASE_URL}/truth-or-dare?local=1`)
    await fillName(driver, uniqueName('Leave'))
    await clickByText(driver, 'button', 'Enter lobby')
    await waitForText(driver, "Let's go!", 20_000)
    await clickByText(driver, 'button', 'Leave')
    await driver.wait(async () => {
      const url = await driver.getCurrentUrl()
      return (
        url.includes('truth-or-dare') ||
        url.replace(/\/$/, '').endsWith(BASE_URL.replace(/\/$/, ''))
      )
    }, DEFAULT_TIMEOUT)
  })
})
