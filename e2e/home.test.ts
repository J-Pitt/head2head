import { By, until } from 'selenium-webdriver'
import { expect } from 'chai'
import { createDriver, quitQuietly } from './helpers/driver'
import {
  BASE_URL,
  DEFAULT_TIMEOUT,
  clearSiteStorage,
  clickByText,
  scrollAndClick,
  waitForText,
} from './helpers/app'
import type { WebDriver } from 'selenium-webdriver'

describe('Home UI', function () {
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

  it('loads the branded Trivia or Dare home', async function () {
    await waitForText(driver, 'Trivia')
    await waitForText(driver, 'The Board Game')
    await waitForText(driver, 'Think quick. Dare harder.')
    await waitForText(driver, 'PLAY LOCALLY')
    await waitForText(driver, 'PLAY ONLINE')
    await waitForText(driver, 'Also try')
    await waitForText(driver, 'Trivia')
    await waitForText(driver, 'Classic ToD')
    await waitForText(driver, 'Mini games')
  })

  it('opens PLAY ONLINE join/create choices', async function () {
    await clickByText(driver, 'button', 'PLAY ONLINE')
    await waitForText(driver, 'Join game')
    await waitForText(driver, 'Start game')
  })

  it('routes PLAY LOCALLY into the board game setup', async function () {
    await clickByText(driver, 'a', 'PLAY LOCALLY')
    await driver.wait(until.urlContains('/truth-or-dare'), DEFAULT_TIMEOUT)
    await waitForText(driver, 'Set up your game')
    await waitForText(driver, 'Pass & play')
    await waitForText(driver, 'Enter lobby')
  })

  it('opens Mini games quick picks', async function () {
    const tile = await driver.wait(
      until.elementLocated(By.css('.mode-minigames .mode-card-inner')),
      DEFAULT_TIMEOUT
    )
    await scrollAndClick(driver, tile)
    await waitForText(driver, 'Play solo')
    await waitForText(driver, 'Play locally')
    await waitForText(driver, 'Play online')
  })
})
