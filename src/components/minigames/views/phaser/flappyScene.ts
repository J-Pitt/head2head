import type { SceneFactory } from './PhaserGame'

type Graphics = Phaser.GameObjects.Graphics
type Text = Phaser.GameObjects.Text

export const FLAPPY_W = 360
export const FLAPPY_H = 480

type Pipe = { x: number; gapY: number; scored: boolean }

export const makeFlappyScene: SceneFactory = (Phaser, bridgeRef) => {
  const GAP = 150
  const PIPE_W = 56
  const SPEED = 130
  const GRAVITY = 1100
  const FLAP_V = -360
  const BIRD_X = 96
  const R = 14

  return class FlappyScene extends Phaser.Scene {
    g!: Graphics
    scoreText!: Text
    statusText!: Text
    y = FLAPPY_H / 2
    vy = 0
    pipes: Pipe[] = []
    spawnAcc = 0
    score = 0
    alive = true
    reportedDead = false

    constructor() {
      super('flappy')
    }

    create() {
      this.g = this.add.graphics()
      this.scoreText = this.add
        .text(8, 6, 'Score: 0', { fontFamily: 'monospace', fontSize: '16px', color: '#e5e7eb' })
        .setDepth(10)
      this.statusText = this.add
        .text(FLAPPY_W / 2, FLAPPY_H / 2, '', {
          fontFamily: 'monospace',
          fontSize: '36px',
          color: '#bae6fd',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(10)
      this.input.on('pointerdown', () => this.flap())
      this.input.keyboard!.on('keydown-SPACE', () => this.flap())
      this.input.keyboard!.on('keydown-UP', () => this.flap())
      this.spawnPipe(FLAPPY_W + 60)
    }

    private started() {
      return Date.now() >= bridgeRef.current.startAt
    }
    private over() {
      const e = bridgeRef.current.endAt
      return !bridgeRef.current.active || (e != null && Date.now() >= e)
    }

    flap() {
      if (!this.started() || this.over() || !this.alive) return
      this.vy = FLAP_V
    }

    spawnPipe(x: number) {
      const gapY = Phaser.Math.Between(90, FLAPPY_H - 90 - GAP)
      this.pipes.push({ x, gapY, scored: false })
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

      // bridge.flap from on-screen button
      if (bridgeRef.current.flap) {
        bridgeRef.current.flap = false
        this.flap()
      }

      if (running) {
        this.vy += GRAVITY * dt
        this.y += this.vy * dt
        this.spawnAcc += dms
        if (this.spawnAcc > 1500) {
          this.spawnAcc = 0
          this.spawnPipe(FLAPPY_W + PIPE_W)
        }
        for (const p of this.pipes) p.x -= SPEED * dt
        this.pipes = this.pipes.filter((p) => p.x > -PIPE_W)

        for (const p of this.pipes) {
          if (!p.scored && p.x + PIPE_W < BIRD_X - R) {
            p.scored = true
            this.score++
            bridgeRef.current.report({ score: this.score, alive: true, finished: false })
          }
          const inX = BIRD_X + R > p.x && BIRD_X - R < p.x + PIPE_W
          const inGap = this.y - R > p.gapY && this.y + R < p.gapY + GAP
          if (inX && !inGap) this.die()
        }
        if (this.y + R > FLAPPY_H || this.y - R < 0) this.die()
      } else if (this.alive && this.over() && !this.reportedDead) {
        this.reportedDead = true
        bridgeRef.current.report({ score: this.score, alive: true, finished: false })
      }
      this.draw()
    }

    private draw() {
      const g = this.g
      g.clear()
      g.fillStyle(0x0c1a2b, 1)
      g.fillRect(0, 0, FLAPPY_W, FLAPPY_H)
      g.fillStyle(0x14532d, 1)
      g.fillRect(0, FLAPPY_H - 16, FLAPPY_W, 16)
      g.fillStyle(0x22c55e, 1)
      for (const p of this.pipes) {
        g.fillRect(p.x, 0, PIPE_W, p.gapY)
        g.fillRect(p.x, p.gapY + GAP, PIPE_W, FLAPPY_H - p.gapY - GAP)
      }
      g.fillStyle(0xfacc15, 1)
      g.fillCircle(BIRD_X, this.y, R)
      g.fillStyle(0x111827, 1)
      g.fillCircle(BIRD_X + 5, this.y - 4, 2.5)

      this.scoreText.setText('Score: ' + this.score)
      if (!this.started()) {
        const left = Math.ceil((bridgeRef.current.startAt - Date.now()) / 1000)
        this.statusText.setText(left > 0 ? String(left) : 'GO!')
      } else if (!this.alive) this.statusText.setText('DOWN!')
      else if (this.over()) this.statusText.setText('TIME!')
      else this.statusText.setText('')
    }
  }
}
