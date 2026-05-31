import type { SceneFactory } from './PhaserGame'

type Graphics = Phaser.GameObjects.Graphics
type Text = Phaser.GameObjects.Text

export const DINO_W = 360
export const DINO_H = 480

type Obstacle = { x: number; w: number; h: number; scored: boolean }

export const makeDinoScene: SceneFactory = (Phaser, bridgeRef) => {
  const GROUND_H = 36
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
        .text(8, 6, 'Score: 0', { fontFamily: 'monospace', fontSize: '16px', color: '#374151' })
        .setDepth(10)
      this.statusText = this.add
        .text(DINO_W / 2, DINO_H / 2 - 40, '', {
          fontFamily: 'monospace',
          fontSize: '36px',
          color: '#6b7280',
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

      // Sky
      g.fillStyle(0xf7f7f7, 1)
      g.fillRect(0, 0, DINO_W, DINO_H)

      // Ground strip
      g.fillStyle(0xe5e7eb, 1)
      g.fillRect(0, GROUND_Y, DINO_W, GROUND_H)
      g.lineStyle(2, 0x9ca3af, 1)
      g.beginPath()
      g.moveTo(0, GROUND_Y)
      g.lineTo(DINO_W, GROUND_Y)
      g.strokePath()

      // Obstacles (cacti)
      for (const o of this.obstacles) {
        g.fillStyle(0x16a34a, 1)
        g.fillRect(o.x, GROUND_Y - o.h, o.w, o.h)
        if (o.h > 32) {
          g.fillRect(o.x - 6, GROUND_Y - o.h + 12, 8, 14)
          g.fillRect(o.x + o.w - 2, GROUND_Y - o.h + 8, 8, 12)
        }
      }

      // Dino body
      const running = this.started() && !this.over() && this.alive
      const legUp = running && this.onGround && Math.floor(this.legFrame / 120) % 2 === 0
      g.fillStyle(0x374151, 1)
      g.fillRect(DINO_X, this.dinoY, DINO_W_BOX, DINO_H_BOX - 6)
      // Head
      g.fillRect(DINO_X + DINO_W_BOX - 4, this.dinoY - 10, 14, 12)
      // Eye
      g.fillStyle(0xffffff, 1)
      g.fillRect(DINO_X + DINO_W_BOX + 2, this.dinoY - 8, 4, 4)
      // Tail
      g.fillStyle(0x374151, 1)
      g.fillRect(DINO_X - 10, this.dinoY + 8, 12, 6)
      // Legs
      if (this.onGround) {
        g.fillRect(DINO_X + 4, this.dinoY + DINO_H_BOX - 8, 8, legUp ? 4 : 10)
        g.fillRect(DINO_X + 16, this.dinoY + DINO_H_BOX - 8, 8, legUp ? 10 : 4)
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
