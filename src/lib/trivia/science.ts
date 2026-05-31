import type { TriviaQuestion } from '../types'

export const SCIENCE_QUESTIONS: TriviaQuestion[] = [
  // $200 — middle school
  {
    id: 'sci-d1-1',
    category: 'science',
    difficulty: 1,
    question: 'Which planet is known as the Red Planet?',
    choices: ['Venus', 'Mars', 'Jupiter', 'Mercury'],
    correctIndex: 1,
  },
  {
    id: 'sci-d1-2',
    category: 'science',
    difficulty: 1,
    question: 'What gas do plants absorb from the air for photosynthesis?',
    choices: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
    correctIndex: 2,
  },
  // $400
  {
    id: 'sci-d2-1',
    category: 'science',
    difficulty: 2,
    question: 'How many bones are in an adult human body?',
    choices: ['186', '206', '256', '306'],
    correctIndex: 1,
  },
  {
    id: 'sci-d2-2',
    category: 'science',
    difficulty: 2,
    question: 'What is the most abundant gas in Earth’s atmosphere?',
    choices: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Argon'],
    correctIndex: 2,
  },
  // $600
  {
    id: 'sci-d3-1',
    category: 'science',
    difficulty: 3,
    question: 'What is the chemical symbol for gold?',
    choices: ['Go', 'Gd', 'Au', 'Ag'],
    correctIndex: 2,
  },
  {
    id: 'sci-d3-2',
    category: 'science',
    difficulty: 3,
    question: 'Approximately how long does sunlight take to reach Earth?',
    choices: ['8 seconds', '8 minutes', '8 hours', '8 days'],
    correctIndex: 1,
  },
  // $800
  {
    id: 'sci-d4-1',
    category: 'science',
    difficulty: 4,
    question: 'Which enzyme in saliva begins the digestion of starch?',
    choices: ['Pepsin', 'Amylase', 'Lipase', 'Trypsin'],
    correctIndex: 1,
  },
  {
    id: 'sci-d4-2',
    category: 'science',
    difficulty: 4,
    question: 'Which planet rotates so slowly that its day is longer than its year?',
    choices: ['Mercury', 'Venus', 'Mars', 'Uranus'],
    correctIndex: 1,
  },
  // $1000 — hardest
  {
    id: 'sci-d5-1',
    category: 'science',
    difficulty: 5,
    question: 'Which particle’s discovery at CERN in 2012 confirmed the Higgs mechanism?',
    choices: ['Neutrino', 'Higgs boson', 'Graviton', 'Tachyon'],
    correctIndex: 1,
  },
  {
    id: 'sci-d5-2',
    category: 'science',
    difficulty: 5,
    question: 'Which blood type is the universal plasma donor (not RBC donor)?',
    choices: ['O−', 'AB+', 'A+', 'B−'],
    correctIndex: 1,
  },
]
