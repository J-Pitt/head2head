import { By, until } from 'selenium-webdriver'
import { createDriver, quitQuietly } from './helpers/driver'
import {
  BASE_URL,
  DEFAULT_TIMEOUT,
  clearSiteStorage,
  clickByText,
  fillName,
  readRoomCode,
  scrollAndClick,
  sleep,
  uniqueName,
  waitForText,
} from './helpers/app'
import type { WebDriver } from 'selenium-webdriver'

async function openTriviaCreate(driver: WebDriver) {
  await driver.get(BASE_URL)
  await waitForText(driver, 'PLAY LOCALLY')
  const tile = await driver.wait(
    until.elementLocated(By.css('.mode-trivia .mode-card-inner')),
    DEFAULT_TIMEOUT
  )
  await scrollAndClick(driver, tile)
  await clickByText(driver, 'button', 'Start game')
  await waitForText(driver, 'Trivia — host room')
}

async function openTriviaJoin(driver: WebDriver) {
  await driver.get(BASE_URL)
  await waitForText(driver, 'PLAY LOCALLY')
  const tile = await driver.wait(
    until.elementLocated(By.css('.mode-trivia .mode-card-inner')),
    DEFAULT_TIMEOUT
  )
  await scrollAndClick(driver, tile)
  await clickByText(driver, 'button', 'Join game')
}

describe('Online trivia UI', function () {
  let host: WebDriver
  let guest: WebDriver

  before(async function () {
    host = await createDriver()
    guest = await createDriver()
  })

  after(async function () {
    await quitQuietly(host)
    await quitQuietly(guest)
  })

  beforeEach(async function () {
    await clearSiteStorage(host)
    await clearSiteStorage(guest)
  })

  it('hosts a trivia room and starts a game alone', async function () {
    await openTriviaCreate(host)
    await fillName(host, uniqueName('TriviaH'))
    await clickByText(host, 'button', 'Create room & enter lobby')
    await waitForText(host, 'Waiting for players', 20_000)
    const code = await readRoomCode(host)
    await clickByText(host, 'button', 'Start game')
    await host.wait(
      until.elementLocated(By.css('.question-card, .question-text, .jeopardy-board, .buzzer-pad')),
      20_000
    )
  })

  it('lets a second browser join with the room code', async function () {
    await openTriviaCreate(host)
    const hostName = uniqueName('H')
    const guestName = uniqueName('G')
    await fillName(host, hostName)
    await clickByText(host, 'button', 'Create room & enter lobby')
    await waitForText(host, 'Waiting for players', 20_000)
    const code = await readRoomCode(host)

    await openTriviaJoin(guest)
    const codeInput = await guest.findElement(By.css('.code-input'))
    await codeInput.clear()
    await codeInput.sendKeys(code)
    await clickByText(guest, 'button', 'Continue to join')
    await waitForText(guest, 'Trivia — join room', 20_000)
    await fillName(guest, guestName)
    await clickByText(guest, 'button', 'Join room')
    await waitForText(guest, 'Waiting for players', 20_000)
    await sleep(2500)
    await waitForText(host, guestName, 20_000)
  })

  it('supports room chat in the lobby', async function () {
    await openTriviaCreate(host)
    await fillName(host, uniqueName('ChatH'))
    await clickByText(host, 'button', 'Create room & enter lobby')
    await waitForText(host, 'Waiting for players', 20_000)
    const code = await readRoomCode(host)

    await openTriviaJoin(guest)
    await guest.findElement(By.css('.code-input')).sendKeys(code)
    await clickByText(guest, 'button', 'Continue to join')
    await fillName(guest, uniqueName('ChatG'))
    await clickByText(guest, 'button', 'Join room')
    await waitForText(guest, 'Waiting for players', 20_000)
    await sleep(2000)

    const chatInput = await host.wait(until.elementLocated(By.css('.chat-input')), DEFAULT_TIMEOUT)
    await chatInput.sendKeys('hello from host')
    await clickByText(host, 'button', 'Send')
    await sleep(2500)
    await waitForText(guest, 'hello from host', 20_000)
  })
})
