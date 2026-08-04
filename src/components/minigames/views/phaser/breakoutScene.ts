import type { SceneFactory } from './PhaserGame'
import {
  drawBox,
  drawGlow,
  drawPerspectiveFloor,
  drawSphere,
  drawVignette,
  HUD_BANNER,
  HUD_STYLE,
} from './pseudo3d'

type Graphics = Phaser.GameObjects.Graphics
type Text = Phaser.GameObjects.Text
type CursorKeys = Phaser.Types.Input.Keyboard.CursorKeys

export const BREAKOUT_W = 360
export const BREAKOUT_H = 480

type Brick = { x: number; y: number; w: number; h: number; alive: boolean; color: number }

export const makeBreakoutScene: SceneFactory = (Phaser, bridgeRef) => {
  const PADDLE_W = 72
  const PADDLE_H = 12
  const PADDLE_Y = BREAKOUT_H - 28
  const BALL_R = 7
  const COLS = 8
  const ROWS = 5
  const BRICK_W = (BREAKOUT_W - 16) / COLS
  const BRICK_H = 22
  const BRICK_TOP = 48

  return class BreakoutScene extends Phaser.Scene {
    g!: Graphics
    scoreText!: Text
    statusText!: Text
    cursors!: CursorKeys
    paddleX = BREAKOUT_W / 2
    ballX = BREAKOUT_W / 2
    ballY = PADDLE_Y - 24
    ballVx = 220
    ballVy = -280
    bricks: Brick[] = []
    score = 0
    alive = true
    reportedDead = false

    constructor() {
      super('breakout')
    }

    create() {
      this.g = this.add.graphics()
      this.scoreText = this.add
        .text(8, 6, 'Bricks: 0', HUD_STYLE)
        .setDepth(10)
      this.statusText = this.add
        .text(BREAKOUT_W / 2, BREAKOUT_H / 2, '', HUD_BANNER)
        .setOrigin(0.5)
        .setDepth(10)
      this.cursors = this.input.keyboard!.createCursorKeys()
      this.resetBricks()
      this.resetBall()
    }

    private started() {
      return Date.now() >= bridgeRef.current.startAt
    }

    private over() {
      const e = bridgeRef.current.endAt
      return !bridgeRef.current.active || (e != null && Date.now() >= e)
    }

    resetBricks() {
      const colors = [0xf472b6, 0xa78bfa, 0x38bdf8, 0x34d399, 0xfacc15]
      this.bricks = []
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          this.bricks.push({
            x: 8 + col * BRICK_W,
            y: BRICK_TOP + row * (BRICK_H + 4),
            w: BRICK_W - 4,
            h: BRICK_H,
            alive: true,
            color: colors[row % colors.length]!,
          })
        }
      }
    }

    resetBall() {
      this.ballX = this.paddleX
      this.ballY = PADDLE_Y - 20
      const angle = Phaser.Math.FloatBetween(-0.8, 0.8)
      const speed = 280
      this.ballVx = Math.sin(angle) * speed
      this.ballVy = -Math.cos(angle) * speed
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
        this.paddleX = Phaser.Math.Clamp(
          this.paddleX + move * 340 * dt,
          PADDLE_W / 2 + 4,
          BREAKOUT_W - PADDLE_W / 2 - 4
        )

        this.ballX += this.ballVx * dt
        this.ballY += this.ballVy * dt

        if (this.ballX - BALL_R < 0) {
          this.ballX = BALL_R
          this.ballVx = Math.abs(this.ballVx)
        }
        if (this.ballX + BALL_R > BREAKOUT_W) {
          this.ballX = BREAKOUT_W - BALL_R
          this.ballVx = -Math.abs(this.ballVx)
        }
        if (this.ballY - BALL_R < 0) {
          this.ballY = BALL_R
          this.ballVy = Math.abs(this.ballVy)
        }

        const paddleLeft = this.paddleX - PADDLE_W / 2
        const paddleRight = this.paddleX + PADDLE_W / 2
        if (
          this.ballVy > 0 &&
          this.ballY + BALL_R >= PADDLE_Y &&
          this.ballY - BALL_R <= PADDLE_Y + PADDLE_H &&
          this.ballX >= paddleLeft &&
          this.ballX <= paddleRight
        ) {
          this.ballY = PADDLE_Y - BALL_R
          const hit = (this.ballX - this.paddleX) / (PADDLE_W / 2)
          this.ballVy = -Math.abs(this.ballVy)
          this.ballVx = hit * 320
        }

        if (this.ballY - BALL_R > BREAKOUT_H) this.die()

        for (const b of this.bricks) {
          if (!b.alive) continue
          if (
            this.ballX + BALL_R > b.x &&
            this.ballX - BALL_R < b.x + b.w &&
            this.ballY + BALL_R > b.y &&
            this.ballY - BALL_R < b.y + b.h
          ) {
            b.alive = false
            this.ballVy *= -1
            this.score++
            bridgeRef.current.report({ score: this.score, alive: true, finished: false })
          }
        }

        if (this.bricks.every((b) => !b.alive)) {
          this.resetBricks()
          this.resetBall()
          this.ballVy = -Math.abs(this.ballVy) * 1.05
          this.ballVx *= 1.05
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
      drawPerspectiveFloor(g, BREAKOUT_W, BREAKOUT_H, 36, 0x0f172a, 0x22d3ee)

      drawBox(g, 0, 36, 6, BREAKOUT_H - 48, 10, 0x334155, { glow: true })
      drawBox(g, BREAKOUT_W - 6, 36, 6, BREAKOUT_H - 48, 10, 0x334155, { glow: true })
      drawBox(g, 0, 28, BREAKOUT_W, 10, 12, 0x64748b, { glow: true })

      for (const b of this.bricks) {
        if (!b.alive) continue
        drawBox(g, b.x, b.y, b.w, b.h, 9, b.color, { round: 4, glow: true })
      }

      drawGlow(g, this.paddleX, PADDLE_Y + PADDLE_H / 2, PADDLE_W * 0.5, 0x22d3ee, 0.22)
      drawBox(
        g,
        this.paddleX - PADDLE_W / 2,
        PADDLE_Y,
        PADDLE_W,
        PADDLE_H,
        12,
        0x22d3ee,
        { round: 5, glow: true }
      )
      drawSphere(g, this.ballX, this.ballY, BALL_R, 0xfef08a)

      drawVignette(g, BREAKOUT_W, BREAKOUT_H, 0.4)

      this.scoreText.setText('Bricks: ' + this.score)
      if (!this.started()) {
        const left = Math.ceil((bridgeRef.current.startAt - Date.now()) / 1000)
        this.statusText.setText(left > 0 ? String(left) : 'GO!')
      } else if (!this.alive) this.statusText.setText('OUT!')
      else if (this.over()) this.statusText.setText('TIME!')
      else this.statusText.setText('')
    }
  }
}
