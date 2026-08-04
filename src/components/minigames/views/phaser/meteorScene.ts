import type { SceneFactory } from './PhaserGame'
import {
  drawBoxOnGround,
  drawGlow,
  drawPerspectiveFloor,
  drawSky,
  drawSphere,
  drawStars,
  drawVignette,
  shade,
  HUD_BANNER,
  HUD_STYLE,
} from './pseudo3d'

type Graphics = Phaser.GameObjects.Graphics
type Text = Phaser.GameObjects.Text
type CursorKeys = Phaser.Types.Input.Keyboard.CursorKeys

export const METEOR_W = 360
export const METEOR_H = 480

type Meteor = { x: number; y: number; r: number; vy: number }

export const makeMeteorScene: SceneFactory = (Phaser, bridgeRef) => {
  const SHIP_W = 36
  const SHIP_H = 20
  const SHIP_Y = METEOR_H - 36

  return class MeteorScene extends Phaser.Scene {
    g!: Graphics
    scoreText!: Text
    statusText!: Text
    cursors!: CursorKeys
    shipX = METEOR_W / 2
    meteors: Meteor[] = []
    spawnAcc = 0
    score = 0
    alive = true
    reportedDead = false
    surviveAcc = 0

    constructor() {
      super('meteor')
    }

    create() {
      this.g = this.add.graphics()
      this.scoreText = this.add
        .text(8, 6, 'Score: 0', HUD_STYLE)
        .setDepth(10)
      this.statusText = this.add
        .text(METEOR_W / 2, METEOR_H / 2, '', HUD_BANNER)
        .setOrigin(0.5)
        .setDepth(10)
      this.cursors = this.input.keyboard!.createCursorKeys()
    }

    private started() {
      return Date.now() >= bridgeRef.current.startAt
    }

    private over() {
      const e = bridgeRef.current.endAt
      return !bridgeRef.current.active || (e != null && Date.now() >= e)
    }

    spawnMeteor() {
      const r = Phaser.Math.Between(10, 22)
      this.meteors.push({
        x: Phaser.Math.Between(r + 8, METEOR_W - r - 8),
        y: -r,
        r,
        vy: Phaser.Math.Between(140, 260),
      })
    }

    die() {
      this.alive = false
      if (!this.reportedDead) {
        this.reportedDead = true
        bridgeRef.current.report({ score: this.score, alive: false, finished: false })
      }
    }

    update(_t: number, dms: number) {
      const dt = Math.min(dms, 40) / 1000
      const running = this.started() && !this.over() && this.alive

      if (running) {
        let move = 0
        if (this.cursors.left?.isDown) move -= 1
        if (this.cursors.right?.isDown) move += 1
        const pm = bridgeRef.current.pendingMove
        if (pm === 'left') move -= 1
        if (pm === 'right') move += 1
        bridgeRef.current.pendingMove = null
        this.shipX = Phaser.Math.Clamp(
          this.shipX + move * 320 * dt,
          SHIP_W / 2 + 4,
          METEOR_W - SHIP_W / 2 - 4
        )

        this.spawnAcc += dms
        const spawnEvery = Math.max(450, 900 - this.score * 12)
        if (this.spawnAcc >= spawnEvery) {
          this.spawnAcc = 0
          this.spawnMeteor()
        }

        this.surviveAcc += dms
        if (this.surviveAcc >= 1000) {
          this.surviveAcc = 0
          this.score++
          bridgeRef.current.report({ score: this.score, alive: true, finished: false })
        }

        for (const m of this.meteors) m.y += m.vy * dt
        this.meteors = this.meteors.filter((m) => m.y < METEOR_H + 40)

        const shipLeft = this.shipX - SHIP_W / 2 + 4
        const shipRight = this.shipX + SHIP_W / 2 - 4
        const shipTop = SHIP_Y + 4
        const shipBottom = SHIP_Y + SHIP_H

        for (const m of this.meteors) {
          const closestX = Phaser.Math.Clamp(m.x, shipLeft, shipRight)
          const closestY = Phaser.Math.Clamp(m.y, shipTop, shipBottom)
          const dx = m.x - closestX
          const dy = m.y - closestY
          if (dx * dx + dy * dy < m.r * m.r * 0.9) this.die()
        }
      } else if (this.alive && this.over() && !this.reportedDead) {
        this.reportedDead = true
        bridgeRef.current.report({ score: this.score, alive: true, finished: false })
      }

      this.draw()
    }

    private draw() {
      const g = this.g
      g.clear()
      drawSky(g, METEOR_W, METEOR_H - 40, 0x020617, 0x312e81, 18, { haze: 1, hazeColor: 0xa78bfa })
      drawStars(g, METEOR_W, METEOR_H - 50, 48, 19)
      drawPerspectiveFloor(g, METEOR_W, METEOR_H, METEOR_H - 40, 0x1e1b4b, 0x818cf8)

      const sorted = [...this.meteors].sort((a, b) => a.y - b.y)
      for (const m of sorted) {
        const depthScale = 0.7 + (m.y / METEOR_H) * 0.5
        drawGlow(g, m.x, m.y, m.r * depthScale * 1.4, 0xf97316, 0.2)
        drawSphere(g, m.x, m.y, m.r * depthScale, shade(0xa8a29e, 0.9 + depthScale * 0.2))
        g.fillStyle(0xf97316, 0.55)
        g.fillCircle(m.x - m.r * 0.2, m.y - m.r * 0.2, m.r * 0.42 * depthScale)
      }

      drawGlow(g, this.shipX, SHIP_Y + SHIP_H / 2, SHIP_W, 0x38bdf8, 0.22)
      drawBoxOnGround(
        g,
        this.shipX - SHIP_W / 2,
        SHIP_Y + SHIP_H,
        SHIP_W,
        SHIP_H,
        14,
        0x38bdf8,
        { round: 5, glow: true }
      )
      g.fillStyle(0xe0f2fe, 1)
      g.fillTriangle(
        this.shipX,
        SHIP_Y - 8,
        this.shipX - 11,
        SHIP_Y + 8,
        this.shipX + 11,
        SHIP_Y + 8
      )
      g.fillStyle(0xfbbf24, 0.85)
      g.fillCircle(this.shipX, SHIP_Y + SHIP_H - 2, 3.5)

      drawVignette(g, METEOR_W, METEOR_H, 0.45)

      this.scoreText.setText('Score: ' + this.score)
      if (!this.started()) {
        const left = Math.ceil((bridgeRef.current.startAt - Date.now()) / 1000)
        this.statusText.setText(left > 0 ? String(left) : 'GO!')
      } else if (!this.alive) this.statusText.setText('HIT!')
      else if (this.over()) this.statusText.setText('TIME!')
      else this.statusText.setText('')
    }
  }
}
