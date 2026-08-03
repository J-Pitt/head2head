import { By, until } from 'selenium-webdriver'
import { expect } from 'chai'
import { createDriver, quitQuietly } from './helpers/driver'
import {
  BASE_URL,
  clearSiteStorage,
  clickByText,
  fillName,
  readRoomCode,
  sleep,
  uniqueName,
  waitForText,
} from './helpers/app'
import type { WebDriver } from 'selenium-webdriver'

describe('Classic Truth or Dare UI', function () {
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

  it('hosts classic mode and shows a lobby', async function () {
    await host.get(`${BASE_URL}/truth-or-dare?classic=1&host=1`)
    await waitForText(host, 'Truth · Dare')
    await waitForText(host, 'Classic mode')
    await fillName(host, uniqueName('ClassicH'))
    await clickByText(host, 'button', 'Enter lobby')
    await waitForText(host, 'Lobby', 20_000)
    const badge = await host.findElements(By.css('.classic-header-badge, .room-code-display, .room-code'))
    expect(badge.length).to.be.at.least(1)
  })

  it('joins from a second browser and starts a turn', async function () {
    await host.get(`${BASE_URL}/truth-or-dare?classic=1&host=1`)
    const hostName = uniqueName('CH')
    const guestName = uniqueName('CG')
    await fillName(host, hostName)
    await clickByText(host, 'button', 'Enter lobby')
    await waitForText(host, 'Lobby', 20_000)

    // Prefer header badge / room code text
    let code = ''
    try {
      code = await readRoomCode(host)
    } catch {
      const badges = await host.findElements(By.css('.classic-header-badge'))
      for (const b of badges) {
        const t = (await b.getText()).trim()
        if (/^[A-Z0-9]{4,6}$/.test(t)) {
          code = t
          break
        }
      }
    }
    expect(code).to.match(/^[A-Z0-9]{4,6}$/)

    await guest.get(`${BASE_URL}/truth-or-dare?classic=1&code=${encodeURIComponent(code)}`)
    await fillName(guest, guestName)
    await clickByText(guest, 'button', 'Enter lobby')
    await waitForText(guest, 'Waiting for the host', 20_000)
    await sleep(1500)

    await host.wait(until.elementIsEnabled(
      await host.findElement(By.xpath(`//button[contains(., "Start game")]`))
    ), 20_000)
    await clickByText(host, 'button', 'Start game')

    // Polling can lag — wait until either player sees the choose UI or waiting hint
    await host.wait(async () => {
      const [truthHost, truthGuest, waitHost, waitGuest, turnHost, turnGuest] = await Promise.all([
        host.findElements(By.css('.btn-truth, .truth-dare-picker')),
        guest.findElements(By.css('.btn-truth, .truth-dare-picker')),
        host.findElements(By.xpath(`//*[contains(., "to pick Truth or Dare")]`)),
        guest.findElements(By.xpath(`//*[contains(., "to pick Truth or Dare")]`)),
        host.findElements(By.css('.turn')),
        guest.findElements(By.css('.turn')),
      ])
      return (
        truthHost.length +
          truthGuest.length +
          waitHost.length +
          waitGuest.length +
          turnHost.length +
          turnGuest.length >
        0
      )
    }, 25_000)

    await sleep(2000)

    const chooseOrWait = [
      ...(await host.findElements(By.css('.btn-truth, .truth-dare-picker'))),
      ...(await guest.findElements(By.css('.btn-truth, .truth-dare-picker'))),
      ...(await host.findElements(By.xpath(`//*[contains(., "to pick Truth or Dare") or contains(., "Pick one")]`))),
      ...(await guest.findElements(By.xpath(`//*[contains(., "to pick Truth or Dare") or contains(., "Pick one")]`))),
      ...(await host.findElements(By.css('.turn'))),
      ...(await guest.findElements(By.css('.turn'))),
    ]
    expect(chooseOrWait.length).to.be.at.least(1)
  })
})
