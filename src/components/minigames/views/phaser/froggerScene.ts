import type { SceneFactory } from './PhaserGame'
import {
  drawBox,
  drawBoxOnGround,
  drawDisc3d,
  drawGlow,
  drawSky,
  drawStars,
  drawVignette,
  HUD_BANNER,
  HUD_STYLE,
} from './pseudo3d'

type Graphics = Phaser.GameObjects.Graphics
type Text = Phaser.GameObjects.Text
type CursorKeys = Phaser.Types.Input.Keyboard.CursorKeys
type Pointer = Phaser.Input.Pointer

export const COLS = 9
export const ROWS = 12
export const CELL = 40
export const FROGGER_W = COLS * CELL
export const FROGGER_H = ROWS * CELL

type Lane = { row: number; dir: number; speed: number; cars: number[]; len: number; color: number }

export const makeFroggerScene: SceneFactory = (Phaser, bridgeRef) => {
  return class FroggerScene extends Phaser.Scene {
    g!: Graphics
    scoreText!: Text
    statusText!: Text
    lanes: Lane[] = []
    col = 4
    row = ROWS - 1
    score = 0
    swipeStart: { x: number; y: number } | null = null
    cursors!: CursorKeys
    lastReport = 0

    constructor() {
      super('frogger')
    }

    create() {
      this.g = this.add.graphics()
      this.scoreText = this.add
        .text(8, 6, 'Crossings: 0', HUD_STYLE)
        .setDepth(10)
      this.statusText = this.add
        .text(FROGGER_W / 2, FROGGER_H / 2, '', HUD_BANNER)
        .setOrigin(0.5)
        .setDepth(10)

      const palette = [0xef4444, 0x3b82f6, 0xf59e0b, 0x10b981, 0xa855f7, 0xec4899]
      for (let r = 1; r <= ROWS - 2; r++) {
        if (r % 4 === 0) continue
        const dir = r % 2 === 0 ? 1 : -1
        const speed = 55 + ((r * 37) % 95)
        const len = 1.4 * CELL
        const count = 2 + (r % 2)
        const cars: number[] = []
        for (let i = 0; i < count; i++) cars.push(i * (FROGGER_W / count) + ((r * 13) % CELL))
        this.lanes.push({ row: r, dir, speed, cars, len, color: palette[r % palette.length] })
      }

      this.cursors = this.input.keyboard!.createCursorKeys()
      this.input.on('pointerdown', (p: Pointer) => {
        this.swipeStart = { x: p.x, y: p.y }
      })
      this.input.on('pointerup', (p: Pointer) => {
        if (!this.swipeStart) return
        const dx = p.x - this.swipeStart.x
        const dy = p.y - this.swipeStart.y
        if (Math.abs(dx) < 14 && Math.abs(dy) < 14) this.tryMove('up')
        else if (Math.abs(dx) > Math.abs(dy)) this.tryMove(dx > 0 ? 'right' : 'left')
        else this.tryMove(dy > 0 ? 'down' : 'up')
        this.swipeStart = null
      })
    }

    private started() {
      return Date.now() >= bridgeRef.current.startAt
    }
    private over() {
      const e = bridgeRef.current.endAt
      return !bridgeRef.current.active || (e != null && Date.now() >= e)
    }

    private tryMove(dir: string) {
      if (!this.started() || this.over()) return
      if (dir === 'up' && this.row > 0) this.row--
      else if (dir === 'down' && this.row < ROWS - 1) this.row++
      else if (dir === 'left' && this.col > 0) this.col--
      else if (dir === 'right' && this.col < COLS - 1) this.col++
      if (this.row === 0) {
        this.score++
        this.report()
        this.row = ROWS - 1
        this.col = 4
      }
    }

    private report() {
      bridgeRef.current.report({ score: this.score, alive: true, finished: false })
    }

    update(_t: number, dms: number) {
      const dt = dms / 1000
      const running = this.started() && !this.over()
      if (running) {
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) this.tryMove('up')
        if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) this.tryMove('down')
        if (Phaser.Input.Keyboard.JustDown(this.cursors.left!)) this.tryMove('left')
        if (Phaser.Input.Keyboard.JustDown(this.cursors.right!)) this.tryMove('right')
        const pm = bridgeRef.current.pendingMove
        if (pm) {
          this.tryMove(pm)
          bridgeRef.current.pendingMove = null
        }
        for (const lane of this.lanes) {
          for (let i = 0; i < lane.cars.length; i++) {
            lane.cars[i] += lane.dir * lane.speed * dt
            if (lane.cars[i] > FROGGER_W + lane.len) lane.cars[i] = -lane.len
            if (lane.cars[i] < -lane.len) lane.cars[i] = FROGGER_W + lane.len
          }
        }
        const fx = this.col * CELL
        for (const lane of this.lanes) {
          if (lane.row !== this.row) continue
          for (const cx of lane.cars) {
            if (fx < cx + lane.len && fx + CELL > cx) {
              this.row = ROWS - 1
              this.col = 4
              break
            }
          }
        }
      }
      this.draw()
      if (running && Date.now() - this.lastReport > 700) {
        this.lastReport = Date.now()
        this.report()
      }
    }

    private draw() {
      const g = this.g
      g.clear()
      drawSky(g, FROGGER_W, FROGGER_H, 0x064e3b, 0x022c22, 14, { haze: 1, hazeColor: 0x34d399 })
      drawStars(g, FROGGER_W, 80, 18, 5)

      for (let r = 0; r < ROWS; r++) {
        let col = 0x166534
        let elev = 5
        if (r === 0) {
          col = 0x0ea5e9
          elev = 10
        } else if (this.lanes.find((l) => l.row === r)) {
          col = 0x111827
          elev = 4
        } else if (r % 4 === 0) {
          col = 0x14532d
          elev = 7
        }
        for (let c = 0; c < COLS; c++) {
          drawBox(g, c * CELL + 1, r * CELL + 6, CELL - 4, CELL - 8, elev, col, { round: 4 })
        }
      }

      for (let c = 0; c < COLS; c += 2) {
        drawBox(g, c * CELL + 8, 10, CELL - 16, CELL - 18, 8, 0x4ade80, { round: 5, glow: true })
      }

      for (const lane of this.lanes) {
        for (const cx of lane.cars) {
          drawBoxOnGround(g, cx, lane.row * CELL + CELL - 6, lane.len, CELL - 14, 10, lane.color, {
            round: 6,
            glow: true,
          })
        }
      }

      const fx = this.col * CELL + 5
      const fy = this.row * CELL + CELL - 6
      drawGlow(g, fx + (CELL - 10) / 2, fy - (CELL - 12) / 2, 18, 0x34d399, 0.2)
      drawBoxOnGround(g, fx, fy, CELL - 10, CELL - 12, 12, 0x34d399, { round: 8, glow: true })
      drawDisc3d(g, fx + 9, fy - (CELL - 12) + 10, 3.4, 3, 0xecfdf5)
      drawDisc3d(g, fx + CELL - 19, fy - (CELL - 12) + 10, 3.4, 3, 0xecfdf5)

      drawVignette(g, FROGGER_W, FROGGER_H, 0.38)

      this.scoreText.setText('Crossings: ' + this.score)
      if (!this.started()) {
        const left = Math.ceil((bridgeRef.current.startAt - Date.now()) / 1000)
        this.statusText.setText(left > 0 ? String(left) : 'GO!')
      } else if (this.over()) {
        this.statusText.setText('TIME!')
      } else this.statusText.setText('')
    }
  }
}
