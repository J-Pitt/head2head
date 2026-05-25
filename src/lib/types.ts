export type CategoryId = 'science' | 'nineties'
export type GameMode = 'turns' | 'buzzer'
export type GamePhase = 'question' | 'buzzing' | 'answering' | 'reveal'

export type PlayerStatus = 'active' | 'break'

export type Player = {
  id: string
  name: string
  avatar: string
  /** break = stepped away; still in room and can rejoin */
  status?: PlayerStatus
}

export type ChatMessage = {
  playerName: string
  text: string
  ts: number
  image?: string
}

export type TriviaQuestion = {
  id: string
  category: CategoryId
  question: string
  choices: [string, string, string, string]
  correctIndex: number
}

export type GameState = {
  gameStarted: boolean
  gameMode: GameMode
  categories: CategoryId[]
  questionIds: string[]
  questionIndex: number
  currentPlayerIndex: number
  scores: Record<string, number>
  phase: GamePhase
  /** Epoch ms — clients derive countdown from this */
  phaseStartedAt: number
  buzzWindowSec: number
  answerWindowSec: number
  turnAnswerSec: number
  buzzedBy?: string | null
  lastAnswer?: {
    playerId: string
    correct: boolean
    choiceIndex: number
  }
}

export type Room = {
  roomId: string
  gameCode: string
  hostName: string
  players: Player[]
  state: GameState | null
  messages: ChatMessage[]
  updatedAt: string
}

export type RejoinSession = {
  roomId: string
  gameCode: string
  playerName: string
  avatar: string
}
