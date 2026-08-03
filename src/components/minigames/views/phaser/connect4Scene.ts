import type { SceneFactory } from './PhaserGame'
import { drawDisc3d, drawSky, drawSlab, shade } from './pseudo3d'

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
      drawSky(this.g, C4_W, C4_H, 0x0f172a, 0x1e3a8a, 12)

      // Table legs + board frame in 3D
      drawSlab(this.g, ox - 14, oy + boardH + 4, boardW + 28, 18, 12, 0x1e3a8a)
      drawSlab(this.g, ox - 10, oy - 10, boardW + 20, boardH + 20, 16, 0x1d4ed8)

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const v = b.board[row * COLS + col] ?? 0
          const cx = ox + col * cell + cell / 2
          const cy = oy + row * cell + cell / 2
          const r = cell * 0.34
          if (v > 0) {
            const color = b.colors[(v - 1) % b.colors.length] ?? '#ef4444'
            drawDisc3d(this.g, cx, cy, r, 9, hexToNum(color))
          } else {
            // Empty socket — recessed hole
            this.g.fillStyle(0x0f172a, 1)
            this.g.fillEllipse(cx, cy + 2, r * 2.05, r * 1.25)
            this.g.fillStyle(shade(0x1e3a8a, 0.55), 1)
            this.g.fillEllipse(cx, cy, r * 1.9, r * 1.1)
          }
        }
      }

      if (b.myTurn && b.status === 'live') {
        this.g.fillStyle(0xfbbf24, 0.9)
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
          drawDisc3d(this.g, cx, tipY + 4, 5, 4, 0xfbbf24)
          this.g.fillStyle(0xfbbf24, 0.85)
          this.g.fillTriangle(cx, tipY + 14, cx - 7, tipY + 4, cx + 7, tipY + 4)
        }
      }
    }
  }
}
