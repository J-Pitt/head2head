import type { SceneFactory } from './PhaserGame'
import { seededShuffle } from '@/lib/minigames/rng'
import { drawBox, drawSky, shade } from './pseudo3d'

export const MEMORY_W = 360
export const MEMORY_H = 420

const FACES = ['🍎', '🚀', '🐙', '🎸', '🍕', '🌈', '👾', '⚽']
const COLS = 4
const ROWS = 4
const PAD = 10
const GAP = 8

export type MemoryBridge = {
  startAt: number
  endAt: number | null
  active: boolean
  seed: number
  round: number
  report: (p: { score: number; alive?: boolean; finished?: boolean; finishAt?: number }) => void
}

export const makeMemoryScene: SceneFactory<MemoryBridge> = (Phaser, bridgeRef) => {
  const cardW = (MEMORY_W - PAD * 2 - GAP * (COLS - 1)) / COLS
  const cardH = (MEMORY_H - PAD * 2 - GAP * (ROWS - 1) - 28) / ROWS

  return class MemoryScene extends Phaser.Scene {
    g!: Phaser.GameObjects.Graphics
    labels: Phaser.GameObjects.Text[] = []
    statusText!: Phaser.GameObjects.Text
    deck: string[] = []
    flipped: number[] = []
    matched: number[] = []
    busy = false
    lastSeed = -1
    lastRound = -1
    reportedDone = false
    hitZones: Phaser.GameObjects.Zone[] = []

    constructor() {
      super('memory')
    }

    create() {
      this.g = this.add.graphics()
      this.statusText = this.add
        .text(MEMORY_W / 2, 10, '', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          color: '#fb923c',
        })
        .setOrigin(0.5, 0)
        .setDepth(10)

      for (let i = 0; i < COLS * ROWS; i++) {
        const col = i % COLS
        const row = Math.floor(i / COLS)
        const x = PAD + col * (cardW + GAP)
        const y = 28 + PAD + row * (cardH + GAP)
        const zone = this.add
          .zone(x + cardW / 2, y + cardH / 2, cardW, cardH)
          .setInteractive({ useHandCursor: true })
        zone.on('pointerdown', () => this.flip(i))
        this.hitZones.push(zone)
        const label = this.add
          .text(x + cardW / 2, y + cardH / 2 - 2, '?', {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '28px',
            color: '#e5e7eb',
          })
          .setOrigin(0.5)
          .setDepth(5)
        this.labels.push(label)
      }

      this.resetDeck()
    }

    private started() {
      return Date.now() >= bridgeRef.current.startAt
    }

    private over() {
      const e = bridgeRef.current.endAt
      return !bridgeRef.current.active || (e != null && Date.now() >= e)
    }

    private resetDeck() {
      const b = bridgeRef.current
      this.deck = seededShuffle([...FACES, ...FACES], b.seed || 1)
      this.flipped = []
      this.matched = []
      this.busy = false
      this.reportedDone = false
      this.lastSeed = b.seed
      this.lastRound = b.round
    }

    flip(i: number) {
      if (!this.started() || this.over() || this.busy) return
      if (this.flipped.includes(i) || this.matched.includes(i)) return
      const next = [...this.flipped, i]
      this.flipped = next
      if (next.length < 2) return

      this.busy = true
      const [a, b] = next
      if (this.deck[a!] === this.deck[b!]) {
        this.matched = [...this.matched, a!, b!]
        this.flipped = []
        this.busy = false
        const pairs = this.matched.length / 2
        if (this.matched.length === this.deck.length) {
          this.reportedDone = true
          bridgeRef.current.report({
            score: pairs,
            finished: true,
            finishAt: Date.now() - (bridgeRef.current.startAt || Date.now()),
          })
        } else {
          bridgeRef.current.report({ score: pairs })
        }
      } else {
        this.time.delayedCall(700, () => {
          this.flipped = []
          this.busy = false
        })
      }
    }

    update() {
      const b = bridgeRef.current
      if (b.seed !== this.lastSeed || b.round !== this.lastRound) {
        this.resetDeck()
      }

      if (!this.started()) {
        this.statusText.setText('Get ready…')
      } else if (this.over()) {
        this.statusText.setText(this.reportedDone ? 'Cleared!' : 'Time up')
      } else {
        this.statusText.setText(`${this.matched.length / 2} / 8 pairs`)
      }

      this.g.clear()
      drawSky(this.g, MEMORY_W, MEMORY_H, 0x1c1917, 0x0c0a09, 10)

      // Table slab
      drawBox(this.g, 6, 24, MEMORY_W - 12, MEMORY_H - 32, 14, 0x292524, { round: 10 })

      for (let i = 0; i < this.deck.length; i++) {
        const col = i % COLS
        const row = Math.floor(i / COLS)
        const x = PAD + col * (cardW + GAP)
        const y = 28 + PAD + row * (cardH + GAP)
        const open = this.flipped.includes(i) || this.matched.includes(i)
        const matched = this.matched.includes(i)
        const depth = matched ? 4 : open ? 12 : 8
        const color = matched ? 0x166534 : open ? 0x9a3412 : 0x1e293b

        drawBox(this.g, x, y, cardW, cardH, depth, color, { round: 8 })
        if (!open) {
          // Back pattern
          this.g.fillStyle(shade(0x475569, 1.1), 0.5)
          this.g.fillRoundedRect(x + 8, y + 8, cardW - 16, cardH - 16, 6)
        }

        const label = this.labels[i]!
        label.setText(open ? this.deck[i]! : '?')
        label.setColor(open ? '#fff7ed' : '#94a3b8')
        label.setY(y + cardH / 2 - depth * 0.15)
      }
    }
  }
}
