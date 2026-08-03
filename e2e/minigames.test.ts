import { By, until } from 'selenium-webdriver'
import { expect } from 'chai'
import { createDriver, quitQuietly } from './helpers/driver'
import {
  BASE_URL,
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

describe('Mini games UI', function () {
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

  it('enters a solo lobby and lists playable games', async function () {
    await host.get(`${BASE_URL}/minigames?solo=1`)
    await waitForText(host, 'Solo')
    await fillName(host, uniqueName('Solo'))
    await clickByText(host, 'button', 'Enter lobby')
    await waitForText(host, 'Solo games', 20_000)
    await waitForText(host, 'Choose a game')
    await waitForText(host, 'Memory')
    await waitForText(host, 'Frogger')
    await waitForText(host, 'Dino Run')
    await waitForText(host, 'Breakout')
  })

  it('starts Memory and shows the Phaser board', async function () {
    await host.get(`${BASE_URL}/minigames?solo=1`)
    await fillName(host, uniqueName('Mem'))
    await clickByText(host, 'button', 'Enter lobby')
    await waitForText(host, 'Choose a game', 20_000)

    const row = await host.wait(
      until.elementLocated(
        By.xpath(
          `//button[contains(@class,"minigame-row") and .//strong[normalize-space()="Memory"]]`
        )
      ),
      20_000
    )
    await scrollAndClick(host, row)
    await host.wait(until.elementLocated(By.css('.minigame-play-shell')), 20_000)
    await waitForText(host, 'Memory', 20_000)
    await host.wait(until.elementLocated(By.css('.phaser-canvas, canvas')), 20_000)
    await waitForText(host, 'clear all 8 pairs')
  })

  it('creates an online games room another browser can join', async function () {
    await host.get(`${BASE_URL}/minigames?host=1`)
    await waitForText(host, 'Host online')
    await fillName(host, uniqueName('MH'))
    await clickByText(host, 'button', 'Enter lobby')
    await waitForText(host, 'Games room', 20_000)
    const code = await readRoomCode(host)
    expect(code).to.match(/^[A-Z0-9]{4,6}$/)

    await guest.get(`${BASE_URL}/minigames?code=${encodeURIComponent(code)}`)
    await waitForText(guest, 'Join online', 20_000)
    await fillName(guest, uniqueName('MG'))
    await clickByText(guest, 'button', 'Join room')
    await waitForText(guest, 'Games room', 20_000)
    await sleep(1500)
    await waitForText(host, '2 players', 20_000)
  })

  it('navigates home from the join screen', async function () {
    await host.get(`${BASE_URL}/minigames?solo=1`)
    await clickByText(host, 'a', '← Home')
    await host.wait(until.urlMatches(/\/?$/), 10_000)
    await waitForText(host, 'PLAY LOCALLY')
  })
})
