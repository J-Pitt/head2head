import type { SceneFactory } from './PhaserGame'

type Graphics = Phaser.GameObjects.Graphics
type Text = Phaser.GameObjects.Text
type CursorKeys = Phaser.Types.Input.Keyboard.CursorKeys
type Pointer = Phaser.Input.Pointer

export const GRID = 15
export const SCELL = 26
export const SNAKE_W = GRID * SCELL
export const SNAKE_H = GRID * SCELL

type Pt = { x: number; y: number }

export const makeSnakeScene: SceneFactory = (Phaser, bridgeRef) => {
  return class SnakeScene extends Phaser.Scene {
    g!: Graphics
    scoreText!: Text
    statusText!: Text
    body: Pt[] = [{ x: 7, y: 7 }]
    dir: Pt = { x: 1, y: 0 }
    nextDir: Pt = { x: 1, y: 0 }
    food: Pt = { x: 11, y: 7 }
    score = 0
    alive = true
    moveAcc = 0
    stepMs = 160
    cursors!: CursorKeys
    swipeStart: { x: number; y: number } | null = null
    reportedDead = false

    constructor() {
      super('snake')
    }

    create() {
      this.g = this.add.graphics()
      this.scoreText = this.add
        .text(8, 6, 'Length: 1', { fontFamily: 'monospace', fontSize: '15px', color: '#e5e7eb' })
        .setDepth(10)
      this.statusText = this.add
        .text(SNAKE_W / 2, SNAKE_H / 2, '', {
          fontFamily: 'monospace',
          fontSize: '36px',
          color: '#fca5a5',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(10)
      this.placeFood()
      this.cursors = this.input.keyboard!.createCursorKeys()
      this.input.on('pointerdown', (p: Pointer) => {
        this.swipeStart = { x: p.x, y: p.y }
      })
      this.input.on('pointerup', (p: Pointer) => {
        if (!this.swipeStart) return
        const dx = p.x - this.swipeStart.x
        const dy = p.y - this.swipeStart.y
        if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return
        if (Math.abs(dx) > Math.abs(dy)) this.turn(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 })
        else this.turn(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 })
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

    turn(d: Pt) {
      // Disallow reversing directly into the neck.
      if (d.x === -this.dir.x && d.y === -this.dir.y) return
      this.nextDir = d
    }

    placeFood() {
      let p: Pt
      do {
        p = { x: Phaser.Math.Between(0, GRID - 1), y: Phaser.Math.Between(0, GRID - 1) }
      } while (this.body.some((s) => s.x === p.x && s.y === p.y))
      this.food = p
    }

    step() {
      this.dir = this.nextDir
      const head = { x: this.body[0].x + this.dir.x, y: this.body[0].y + this.dir.y }
      if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) return this.die()
      if (this.body.some((s) => s.x === head.x && s.y === head.y)) return this.die()
      this.body.unshift(head)
      if (head.x === this.food.x && head.y === this.food.y) {
        this.score++
        this.stepMs = Math.max(80, this.stepMs - 4)
        this.placeFood()
        bridgeRef.current.report({ score: this.score, alive: true, finished: false })
      } else {
        this.body.pop()
      }
    }

    die() {
      this.alive = false
      if (!this.reportedDead) {
        this.reportedDead = true
        bridgeRef.current.report({ score: this.score, alive: false, finished: false })
      }
    }

    update(_t: number, dms: number) {
      const running = this.started() && !this.over() && this.alive
      if (running) {
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) this.turn({ x: 0, y: -1 })
        if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) this.turn({ x: 0, y: 1 })
        if (Phaser.Input.Keyboard.JustDown(this.cursors.left!)) this.turn({ x: -1, y: 0 })
        if (Phaser.Input.Keyboard.JustDown(this.cursors.right!)) this.turn({ x: 1, y: 0 })
        const pm = bridgeRef.current.pendingMove
        if (pm) {
          if (pm === 'up') this.turn({ x: 0, y: -1 })
          else if (pm === 'down') this.turn({ x: 0, y: 1 })
          else if (pm === 'left') this.turn({ x: -1, y: 0 })
          else if (pm === 'right') this.turn({ x: 1, y: 0 })
          bridgeRef.current.pendingMove = null
        }
        this.moveAcc += dms
        while (this.moveAcc >= this.stepMs) {
          this.moveAcc -= this.stepMs
          this.step()
        }
      } else if (this.alive && this.over()) {
        // round timed out while still alive — lock in final score
        if (!this.reportedDead) {
          this.reportedDead = true
          bridgeRef.current.report({ score: this.score, alive: true, finished: false })
        }
      }
      this.draw()
    }

    private draw() {
      const g = this.g
      g.clear()
      g.fillStyle(0x10151f, 1)
      g.fillRect(0, 0, SNAKE_W, SNAKE_H)
      g.lineStyle(1, 0x1b2433, 1)
      for (let i = 1; i < GRID; i++) {
        g.beginPath()
        g.moveTo(i * SCELL, 0)
        g.lineTo(i * SCELL, SNAKE_H)
        g.moveTo(0, i * SCELL)
        g.lineTo(SNAKE_W, i * SCELL)
        g.strokePath()
      }
      g.fillStyle(0xf87171, 1)
      g.fillCircle(this.food.x * SCELL + SCELL / 2, this.food.y * SCELL + SCELL / 2, SCELL / 2 - 3)
      this.body.forEach((s, i) => {
        g.fillStyle(i === 0 ? 0xc4b5fd : 0xa78bfa, 1)
        g.fillRoundedRect(s.x * SCELL + 2, s.y * SCELL + 2, SCELL - 4, SCELL - 4, 5)
      })

      this.scoreText.setText('Length: ' + this.body.length)
      if (!this.started()) {
        const left = Math.ceil((bridgeRef.current.startAt - Date.now()) / 1000)
        this.statusText.setText(left > 0 ? String(left) : 'GO!')
      } else if (!this.alive) this.statusText.setText('CRASHED')
      else if (this.over()) this.statusText.setText('TIME!')
      else this.statusText.setText('')
    }
  }
}
