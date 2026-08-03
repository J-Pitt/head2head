import type { SceneFactory } from './PhaserGame'
import { drawBox, drawBoxOnGround, drawPerspectiveFloor, drawSky } from './pseudo3d'

type Graphics = Phaser.GameObjects.Graphics
type Text = Phaser.GameObjects.Text

export const DINO_W = 360
export const DINO_H = 480

type Obstacle = { x: number; w: number; h: number; scored: boolean }

export const makeDinoScene: SceneFactory = (Phaser, bridgeRef) => {
  const GROUND_H = 48
  const GROUND_Y = DINO_H - GROUND_H
  const DINO_X = 72
  const DINO_W_BOX = 30
  const DINO_H_BOX = 34
  const GRAVITY = 1900
  const JUMP_V = -560
  const BASE_SPEED = 300
  const MAX_SPEED = 520

  return class DinoScene extends Phaser.Scene {
    g!: Graphics
    scoreText!: Text
    statusText!: Text
    dinoY = GROUND_Y - DINO_H_BOX
    vy = 0
    onGround = true
    obstacles: Obstacle[] = []
    spawnAcc = 0
    score = 0
    alive = true
    reportedDead = false
    runTime = 0
    legFrame = 0

    constructor() {
      super('dino')
    }

    create() {
      this.g = this.add.graphics()
      this.scoreText = this.add
        .text(8, 6, 'Score: 0', { fontFamily: 'monospace', fontSize: '16px', color: '#e5e7eb' })
        .setDepth(10)
      this.statusText = this.add
        .text(DINO_W / 2, DINO_H / 2 - 40, '', {
          fontFamily: 'monospace',
          fontSize: '36px',
          color: '#fde68a',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(10)
      this.input.on('pointerdown', () => this.jump())
      this.input.keyboard!.on('keydown-SPACE', () => this.jump())
      this.input.keyboard!.on('keydown-UP', () => this.jump())
    }

    private started() {
      return Date.now() >= bridgeRef.current.startAt
    }

    private over() {
      const e = bridgeRef.current.endAt
      return !bridgeRef.current.active || (e != null && Date.now() >= e)
    }

    jump() {
      if (!this.started() || this.over() || !this.alive) return
      if (this.onGround) {
        this.vy = JUMP_V
        this.onGround = false
      }
    }

    private speed() {
      return Math.min(MAX_SPEED, BASE_SPEED + this.runTime * 18)
    }

    spawnObstacle(x: number) {
      const tall = Math.random() < 0.35
      const w = tall ? 22 : 16
      const h = tall ? 44 : 28
      this.obstacles.push({ x, w, h, scored: false })
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

      if (bridgeRef.current.flap) {
        bridgeRef.current.flap = false
        this.jump()
      }

      if (running) {
        this.runTime += dt
        this.legFrame += dms
        const spd = this.speed()

        this.vy += GRAVITY * dt
        this.dinoY += this.vy * dt
        const floor = GROUND_Y - DINO_H_BOX
        if (this.dinoY >= floor) {
          this.dinoY = floor
          this.vy = 0
          this.onGround = true
        }

        this.spawnAcc += dms
        const spawnGap = Math.max(900, 1700 - this.runTime * 40)
        if (this.spawnAcc >= spawnGap) {
          this.spawnAcc = 0
          this.spawnObstacle(DINO_W + 20)
        }

        for (const o of this.obstacles) o.x -= spd * dt
        this.obstacles = this.obstacles.filter((o) => o.x > -40)

        const dinoLeft = DINO_X + 4
        const dinoRight = DINO_X + DINO_W_BOX - 4
        const dinoTop = this.dinoY + 4
        const dinoBottom = this.dinoY + DINO_H_BOX - 2

        for (const o of this.obstacles) {
          if (!o.scored && o.x + o.w < DINO_X) {
            o.scored = true
            this.score++
            bridgeRef.current.report({ score: this.score, alive: true, finished: false })
          }
          const oLeft = o.x
          const oRight = o.x + o.w
          const oTop = GROUND_Y - o.h
          const oBottom = GROUND_Y
          if (dinoRight > oLeft && dinoLeft < oRight && dinoBottom > oTop && dinoTop < oBottom) {
            this.die()
          }
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
      drawSky(g, DINO_W, GROUND_Y, 0x1e293b, 0x334155, 14)
      drawPerspectiveFloor(g, DINO_W, DINO_H, GROUND_Y, 0x3f3f46, 0x71717a)

      // Distant mountains
      g.fillStyle(0x27272a, 0.7)
      g.fillTriangle(40, GROUND_Y, 110, GROUND_Y - 70, 180, GROUND_Y)
      g.fillTriangle(160, GROUND_Y, 240, GROUND_Y - 95, 320, GROUND_Y)

      for (const o of this.obstacles) {
        drawBoxOnGround(g, o.x, GROUND_Y, o.w, o.h, 10, 0x16a34a, { round: 3 })
        if (o.h > 32) {
          drawBoxOnGround(g, o.x - 6, GROUND_Y - o.h + 26, 8, 14, 6, 0x15803d, {
            round: 2,
            shadow: false,
          })
          drawBoxOnGround(g, o.x + o.w - 2, GROUND_Y - o.h + 20, 8, 12, 6, 0x15803d, {
            round: 2,
            shadow: false,
          })
        }
      }

      const running = this.started() && !this.over() && this.alive
      const legUp = running && this.onGround && Math.floor(this.legFrame / 120) % 2 === 0
      const bodyBottom = this.dinoY + DINO_H_BOX - 6
      drawBoxOnGround(g, DINO_X, bodyBottom, DINO_W_BOX, DINO_H_BOX - 6, 12, 0x4b5563, {
        round: 4,
      })
      drawBox(g, DINO_X + DINO_W_BOX - 4, this.dinoY - 10, 14, 12, 8, 0x6b7280, { round: 3 })
      g.fillStyle(0xffffff, 1)
      g.fillCircle(DINO_X + DINO_W_BOX + 4, this.dinoY - 5, 2.5)
      drawBox(g, DINO_X - 10, this.dinoY + 8, 12, 6, 5, 0x4b5563, { round: 2 })
      if (this.onGround) {
        drawBoxOnGround(g, DINO_X + 4, bodyBottom + 8, 8, legUp ? 4 : 10, 4, 0x374151, {
          round: 1,
          shadow: false,
        })
        drawBoxOnGround(g, DINO_X + 16, bodyBottom + 8, 8, legUp ? 10 : 4, 4, 0x374151, {
          round: 1,
          shadow: false,
        })
      }

      this.scoreText.setText('Score: ' + this.score)
      if (!this.started()) {
        const left = Math.ceil((bridgeRef.current.startAt - Date.now()) / 1000)
        this.statusText.setText(left > 0 ? String(left) : 'GO!')
      } else if (!this.alive) this.statusText.setText('CRASH!')
      else if (this.over()) this.statusText.setText('TIME!')
      else this.statusText.setText('')
    }
  }
}
