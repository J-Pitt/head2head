import type { SceneFactory } from './PhaserGame'
import { drawDisc3d, drawGlow, drawSky, drawSlab, drawStars, drawVignette, shade } from './pseudo3d'

export const C4_W = 360
export const C4_H = 380

const COLS = 7
const ROWS = 6
const PAD = 16
const TOP = 40

export type Connect4Bridge = {
  board: number[]
  myTurn: boolean
  myValue: number
  colors: string[]
  status: string
  drop: (col: number) => void
}

function hexToNum(hex: string): number {
  const h = hex.replace('#', '')
  return parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
}

export const makeConnect4Scene: SceneFactory<Connect4Bridge> = (_Phaser, bridgeRef) => {
  const cell = Math.min((C4_W - PAD * 2) / COLS, (C4_H - TOP - PAD) / (ROWS + 0.6))
  const boardW = cell * COLS
  const boardH = cell * ROWS
  const ox = (C4_W - boardW) / 2
  const oy = TOP

  return class Connect4Scene extends Phaser.Scene {
    g!: Phaser.GameObjects.Graphics
    statusText!: Phaser.GameObjects.Text
    colZones: Phaser.GameObjects.Zone[] = []

    constructor() {
      super('connect4')
    }

    create() {
      this.g = this.add.graphics()
      this.statusText = this.add
        .text(C4_W / 2, 12, '', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          color: '#e5e7eb',
        })
        .setOrigin(0.5, 0)
        .setDepth(10)

      for (let col = 0; col < COLS; col++) {
        const zone = this.add
          .zone(ox + col * cell + cell / 2, oy + boardH / 2, cell, boardH + cell * 0.55)
          .setInteractive({ useHandCursor: true })
        zone.on('pointerdown', () => this.tryDrop(col))
        this.colZones.push(zone)
      }
    }

    private tryDrop(col: number) {
      const b = bridgeRef.current
      if (!b.myTurn || b.status !== 'live') return
      b.drop(col)
    }

    update() {
      const b = bridgeRef.current
      if (b.status === 'over') {
        this.statusText.setText('Round over')
      } else if (b.myTurn) {
        this.statusText.setText('Your turn — tap a column')
      } else {
        this.statusText.setText('Waiting…')
      }

      this.g.clear()
      drawSky(this.g, C4_W, C4_H, 0x020617, 0x1e3a8a, 16, { haze: 1, hazeColor: 0x60a5fa })
      drawStars(this.g, C4_W, C4_H, 28, 4)

      drawSlab(this.g, ox - 14, oy + boardH + 4, boardW + 28, 18, 14, 0x1e3a8a)
      drawSlab(this.g, ox - 10, oy - 10, boardW + 20, boardH + 20, 18, 0x2563eb)

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const v = b.board[row * COLS + col] ?? 0
          const cx = ox + col * cell + cell / 2
          const cy = oy + row * cell + cell / 2
          const r = cell * 0.34
          if (v > 0) {
            const color = b.colors[(v - 1) % b.colors.length] ?? '#ef4444'
            drawDisc3d(this.g, cx, cy, r, 11, hexToNum(color))
          } else {
            this.g.fillStyle(0x020617, 1)
            this.g.fillEllipse(cx, cy + 2, r * 2.1, r * 1.28)
            this.g.fillStyle(shade(0x1e3a8a, 0.5), 1)
            this.g.fillEllipse(cx, cy, r * 1.92, r * 1.12)
          }
        }
      }

      if (b.myTurn && b.status === 'live') {
        for (let col = 0; col < COLS; col++) {
          let free = false
          for (let row = ROWS - 1; row >= 0; row--) {
            if ((b.board[row * COLS + col] ?? 0) === 0) {
              free = true
              break
            }
          }
          if (!free) continue
          const cx = ox + col * cell + cell / 2
          const tipY = oy - 8
          drawGlow(this.g, cx, tipY + 6, 14, 0xfbbf24, 0.25)
          drawDisc3d(this.g, cx, tipY + 4, 5.5, 5, 0xfbbf24)
          this.g.fillStyle(0xfde68a, 0.95)
          this.g.fillTriangle(cx, tipY + 15, cx - 8, tipY + 4, cx + 8, tipY + 4)
        }
      }

      drawVignette(this.g, C4_W, C4_H, 0.4)
    }
  }
}
