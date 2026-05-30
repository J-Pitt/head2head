import type { SceneFactory } from './PhaserGame'

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
        .text(8, 6, 'Crossings: 0', { fontFamily: 'monospace', fontSize: '16px', color: '#e5e7eb' })
        .setDepth(10)
      this.statusText = this.add
        .text(FROGGER_W / 2, FROGGER_H / 2, '', {
          fontFamily: 'monospace',
          fontSize: '40px',
          color: '#fde68a',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(10)

      const palette = [0xef4444, 0x3b82f6, 0xf59e0b, 0x10b981, 0xa855f7, 0xec4899]
      for (let r = 1; r <= ROWS - 2; r++) {
        if (r % 4 === 0) continue // safe breathing row
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
      for (let r = 0; r < ROWS; r++) {
        let col = 0x166534
        if (r === 0) col = 0x0ea5e9
        else if (this.lanes.find((l) => l.row === r)) col = 0x1f2937
        g.fillStyle(col, 1)
        g.fillRect(0, r * CELL, FROGGER_W, CELL)
      }
      g.fillStyle(0x22c55e, 1)
      for (let c = 0; c < COLS; c += 2) g.fillRect(c * CELL + 8, 8, CELL - 16, CELL - 16)
      for (const lane of this.lanes) {
        g.fillStyle(lane.color, 1)
        for (const cx of lane.cars) g.fillRoundedRect(cx, lane.row * CELL + 6, lane.len, CELL - 12, 6)
      }
      g.fillStyle(0x34d399, 1)
      g.fillRoundedRect(this.col * CELL + 5, this.row * CELL + 5, CELL - 10, CELL - 10, 8)
      g.fillStyle(0x064e3b, 1)
      g.fillCircle(this.col * CELL + 14, this.row * CELL + 15, 3)
      g.fillCircle(this.col * CELL + CELL - 14, this.row * CELL + 15, 3)

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
