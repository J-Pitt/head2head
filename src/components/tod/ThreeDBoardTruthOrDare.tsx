'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMemo, useState } from 'react'

type TileKind = 'truth' | 'dare'

type Player = {
  id: string
  name: string
  piece: PieceId
  position: number
}

type PieceId = 'rocket' | 'crown' | 'gem' | 'skull' | 'star' | 'heart'

const PIECES: Record<PieceId, { icon: string; color: string }> = {
  rocket: { icon: '🚀', color: '#38bdf8' },
  crown: { icon: '👑', color: '#facc15' },
  gem: { icon: '💎', color: '#a78bfa' },
  skull: { icon: '💀', color: '#f43f5e' },
  star: { icon: '⭐', color: '#f97316' },
  heart: { icon: '💖', color: '#ec4899' },
}

const TRUTH_PROMPTS = [
  'What is one thing you are pretending not to care about right now?',
  'What is your biggest green flag in a relationship?',
  'Who in this room would you trust with your biggest secret?',
  'What is one thing you want to improve about yourself this year?',
  'What is a compliment you wish people gave you more often?',
]

const DARE_PROMPTS = [
  'Do your best dramatic movie monologue for 20 seconds.',
  'Send a wholesome compliment to someone in your contacts right now.',
  'Pose like a superhero and hold it for 15 seconds.',
  'Speak in a pirate voice until your next turn.',
  'Do 10 jumping jacks before the next roll.',
]

const WIDTH = 10
const DEPTH = 10
const HEIGHT = 5
const TOTAL_NODES = WIDTH * DEPTH * HEIGHT
const PATH_LENGTH = 80

function buildPath() {
  const coords: Array<{ x: number; y: number; z: number }> = []
  for (let z = 0; z < HEIGHT; z++) {
    for (let y = 0; y < DEPTH; y++) {
      if (y % 2 === 0) {
        for (let x = 0; x < WIDTH; x++) coords.push({ x, y, z })
      } else {
        for (let x = WIDTH - 1; x >= 0; x--) coords.push({ x, y, z })
      }
    }
  }
  return coords.slice(0, PATH_LENGTH)
}

function pathNodeToWorld(node: { x: number; y: number; z: number }) {
  const scale = 0.75
  return [(node.x - WIDTH / 2) * scale, node.z * 0.9, (node.y - DEPTH / 2) * scale] as const
}

export default function ThreeDBoardTruthOrDare() {
  const path = useMemo(() => buildPath(), [])
  const tileKinds = useMemo<TileKind[]>(
    () => path.map((_, idx) => (idx % 2 === 0 ? 'truth' : 'dare')),
    [path]
  )

  const [draftName, setDraftName] = useState('')
  const [draftPiece, setDraftPiece] = useState<PieceId>('rocket')
  const [players, setPlayers] = useState<Player[]>([])
  const [turnIdx, setTurnIdx] = useState(0)
  const [lastRoll, setLastRoll] = useState<number | null>(null)
  const [eventText, setEventText] = useState(
    'Add players, pick pieces, then start rolling. First to the final node wins.'
  )

  const activePlayer = players[turnIdx] ?? null
  const gameReady = players.length >= 2

  function addPlayer() {
    const name = draftName.trim()
    if (!name) return
    setPlayers((curr) => [
      ...curr,
      { id: crypto.randomUUID(), name: name.slice(0, 20), piece: draftPiece, position: 0 },
    ])
    setDraftName('')
  }

  function resetGame() {
    setPlayers((curr) => curr.map((p) => ({ ...p, position: 0 })))
    setTurnIdx(0)
    setLastRoll(null)
    setEventText('Game reset. Roll to start a fresh race.')
  }

  function rollDice() {
    if (!activePlayer) return
    const roll = 1 + Math.floor(Math.random() * 6)
    setLastRoll(roll)
    setPlayers((curr) => {
      const next = [...curr]
      const player = next[turnIdx]
      if (!player) return curr
      const target = Math.min(PATH_LENGTH - 1, player.position + roll)
      next[turnIdx] = { ...player, position: target }
      const landed = tileKinds[target]
      const prompt =
        landed === 'truth'
          ? TRUTH_PROMPTS[Math.floor(Math.random() * TRUTH_PROMPTS.length)]
          : DARE_PROMPTS[Math.floor(Math.random() * DARE_PROMPTS.length)]
      const won = target >= PATH_LENGTH - 1
      setEventText(
        won
          ? `${player.name} wins!`
          : `${player.name} rolled ${roll} and landed on ${landed.toUpperCase()}: ${prompt}`
      )
      return next
    })
    setTurnIdx((curr) => (curr + 1) % players.length)
  }

  return (
    <section className="card tod-stage board3d-shell">
      <div className="board3d-toolbar">
        <h2>3D Truth or Dare Board</h2>
        <p className="lobby-sub">
          Grid: {WIDTH}x{DEPTH}x{HEIGHT} ({TOTAL_NODES} nodes)
        </p>
      </div>

      <div className="board3d-layout">
        <div className="board3d-canvas-wrap">
          <Canvas camera={{ position: [6, 8, 10], fov: 55 }}>
            <color attach="background" args={['#090b19']} />
            <ambientLight intensity={0.7} />
            <directionalLight position={[8, 10, 5]} intensity={1.25} />
            <pointLight position={[-5, 6, -4]} intensity={0.8} color="#22d3ee" />
            <pointLight position={[4, 4, 6]} intensity={0.8} color="#f472b6" />
            <BoardScene path={path} tileKinds={tileKinds} players={players} />
            <OrbitControls makeDefault enablePan={false} minDistance={7} maxDistance={22} />
          </Canvas>
        </div>

        <aside className="board3d-panel">
          <p className="board3d-event">{eventText}</p>
          <p className="board3d-turn">
            Turn: <strong>{activePlayer ? activePlayer.name : '—'}</strong>
          </p>
          <p className="board3d-roll">Last roll: {lastRoll ?? '—'}</p>

          <div className="board3d-actions">
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Player name"
              maxLength={20}
            />
            <div className="board3d-pieces">
              {(Object.keys(PIECES) as PieceId[]).map((piece) => (
                <button
                  key={piece}
                  type="button"
                  className={`btn-ghost btn-sm ${draftPiece === piece ? 'is-selected' : ''}`}
                  onClick={() => setDraftPiece(piece)}
                  title={piece}
                >
                  {PIECES[piece].icon}
                </button>
              ))}
            </div>
            <button type="button" className="btn" onClick={addPlayer}>
              Add player
            </button>
            <button type="button" className="btn btn-primary" disabled={!gameReady} onClick={rollDice}>
              Roll dice
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={resetGame}>
              Reset
            </button>
          </div>

          <ul className="board3d-players">
            {players.map((p, idx) => (
              <li key={p.id} className={idx === turnIdx ? 'is-turn' : ''}>
                <span>
                  {PIECES[p.piece].icon} {p.name}
                </span>
                <span>tile {p.position + 1}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  )
}

function BoardScene({
  path,
  tileKinds,
  players,
}: {
  path: Array<{ x: number; y: number; z: number }>
  tileKinds: TileKind[]
  players: Player[]
}) {
  return (
    <group>
      {path.map((node, idx) => {
        const [x, y, z] = pathNodeToWorld(node)
        const tile = tileKinds[idx]
        const color = tile === 'truth' ? '#38bdf8' : '#f43f5e'
        return (
          <mesh key={idx} position={[x, y, z]}>
            <boxGeometry args={[0.52, 0.2, 0.52]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
          </mesh>
        )
      })}

      {players.map((player, idx) => {
        const node = path[player.position] ?? path[0]
        const [x, y, z] = pathNodeToWorld(node)
        const stackOffset = idx * 0.2
        return (
          <mesh key={player.id} position={[x, y + 0.38 + stackOffset, z]}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color={PIECES[player.piece].color} />
          </mesh>
        )
      })}
    </group>
  )
}
