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

export const PONG_W = 360
export const PONG_H = 480

export const makePongScene: SceneFactory = (Phaser, bridgeRef) => {
  const PADDLE_W = 80
  const PADDLE_H = 12
  const PADDLE_Y = PONG_H - 32
  const BALL_R = 8

  return class PongScene extends Phaser.Scene {
    g!: Graphics
    scoreText!: Text
    statusText!: Text
    cursors!: CursorKeys
    paddleX = PONG_W / 2
    ballX = PONG_W / 2
    ballY = PONG_H / 2
    ballVx = 200
    ballVy = -240
    score = 0
    alive = true
    reportedDead = false

    constructor() {
      super('pong')
    }

    create() {
      this.g = this.add.graphics()
      this.scoreText = this.add
        .text(8, 6, 'Rally: 0', HUD_STYLE)
        .setDepth(10)
      this.statusText = this.add
        .text(PONG_W / 2, PONG_H / 2, '', HUD_BANNER)
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
          this.paddleX + move * 360 * dt,
          PADDLE_W / 2 + 4,
          PONG_W - PADDLE_W / 2 - 4
        )

        this.ballX += this.ballVx * dt
        this.ballY += this.ballVy * dt

        if (this.ballX - BALL_R < 0) {
          this.ballX = BALL_R
          this.ballVx = Math.abs(this.ballVx)
        }
        if (this.ballX + BALL_R > PONG_W) {
          this.ballX = PONG_W - BALL_R
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
          this.ballVy = -Math.abs(this.ballVy) * 1.02
          this.ballVx = hit * 340
          this.score++
          bridgeRef.current.report({ score: this.score, alive: true, finished: false })
        }

        if (this.ballY - BALL_R > PONG_H) this.die()
      } else if (this.alive && this.over() && !this.reportedDead) {
        this.reportedDead = true
        bridgeRef.current.report({ score: this.score, alive: true, finished: false })
      }

      this.draw()
    }

    private draw() {
      const g = this.g
      g.clear()
      drawPerspectiveFloor(g, PONG_W, PONG_H, 40, 0x052e16, 0x4ade80)

      drawBox(g, 4, 44, 8, PONG_H - 60, 12, 0x166534, { glow: true })
      drawBox(g, PONG_W - 12, 44, 8, PONG_H - 60, 12, 0x166534, { glow: true })
      drawBox(g, 4, 40, PONG_W - 8, 10, 10, 0x22c55e, { glow: true })

      for (let y = 60; y < PONG_H - 50; y += 28) {
        drawBox(g, PONG_W / 2 - 3, y, 6, 14, 6, 0x86efac, { round: 2, glow: true })
      }

      drawGlow(g, this.paddleX, PADDLE_Y + PADDLE_H / 2, PADDLE_W * 0.55, 0x4ade80, 0.2)
      drawBox(
        g,
        this.paddleX - PADDLE_W / 2,
        PADDLE_Y,
        PADDLE_W,
        PADDLE_H,
        14,
        0x4ade80,
        { round: 5, glow: true }
      )
      drawSphere(g, this.ballX, this.ballY, BALL_R, 0xf8fafc)

      drawVignette(g, PONG_W, PONG_H, 0.4)

      this.scoreText.setText('Rally: ' + this.score)
      if (!this.started()) {
        const left = Math.ceil((bridgeRef.current.startAt - Date.now()) / 1000)
        this.statusText.setText(left > 0 ? String(left) : 'GO!')
      } else if (!this.alive) this.statusText.setText('MISS!')
      else if (this.over()) this.statusText.setText('TIME!')
      else this.statusText.setText('')
    }
  }
}
