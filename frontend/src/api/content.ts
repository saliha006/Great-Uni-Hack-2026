// Demo study content for the in-browser mock API. Openly written for this project.
import type { Item, SubjectKind } from './types'

export interface BankItem {
  item: Omit<Item, 'id' | 'phase'>
  answer: string // model answer / correct option
  keywords: string[] // what a good free-text answer mentions
}

export interface Bank {
  topic: string
  key_points: string[]
  recall: BankItem[]
  practice: BankItem[]
  probe: BankItem[]
}

const mcq = (prompt: string, options: string[], answer: string, difficulty: Item['difficulty'] = 2): BankItem => ({
  item: { kind: 'MCQ', prompt, options, difficulty, expected_seconds: 30 },
  answer,
  keywords: [answer.toLowerCase()],
})
const recall = (prompt: string, answer: string, keywords: string[], difficulty: Item['difficulty'] = 2, hint?: string): BankItem => ({
  item: { kind: 'RECALL_PROMPT', prompt, difficulty, expected_seconds: 60, hint },
  answer,
  keywords,
})
const short = (prompt: string, answer: string, keywords: string[], difficulty: Item['difficulty'] = 3): BankItem => ({
  item: { kind: 'SHORT_ANSWER', prompt, difficulty, expected_seconds: 90 },
  answer,
  keywords,
})
const problem = (prompt: string, answer: string, keywords: string[], difficulty: Item['difficulty'] = 3): BankItem => ({
  item: { kind: 'PROBLEM', prompt, difficulty, expected_seconds: 120 },
  answer,
  keywords,
})

export const BANKS: Record<string, Bank> = {
  'Data Structures': {
    topic: 'Hash tables',
    key_points: [
      'A hash function maps a key to a bucket index',
      'Collisions happen when two keys land in the same bucket',
      'Chaining or open addressing resolves collisions',
      'Average lookup is O(1) when the load factor stays low',
    ],
    recall: [
      recall('From memory: what does a hash function do in a hash table?', 'It turns a key into an index of the underlying array (a bucket).', ['key', 'index', 'bucket'], 1, 'Think about how a key finds its slot.'),
      recall('What is a collision, and why can it never be fully avoided?', 'Two different keys hash to the same bucket. There are more possible keys than buckets, so some must share.', ['same', 'bucket', 'more keys'], 2),
      recall('Explain separate chaining in one or two sentences.', 'Each bucket holds a list; colliding keys are appended to that bucket\'s list.', ['list', 'bucket'], 2),
      recall('What is the load factor and what happens when it gets too high?', 'Entries divided by buckets. When it is high, chains get long and lookups slow, so the table resizes and rehashes.', ['entries', 'buckets', 'resize'], 3),
      recall('Why is average lookup O(1) but worst case O(n)?', 'With a good hash and low load factor each bucket has few keys; if every key collides, you scan one long chain.', ['collide', 'chain', 'load'], 3),
      recall('Name one difference between linear probing and chaining.', 'Probing stores everything in the array and steps to the next free slot; chaining stores lists in buckets.', ['next', 'slot', 'list'], 2),
      recall('What makes a good hash function?', 'Fast to compute, deterministic, and spreads keys evenly across buckets.', ['even', 'fast', 'deterministic'], 2),
      recall('What does rehashing involve?', 'Allocating a bigger array and reinserting every entry using the new size.', ['bigger', 'reinsert'], 3),
    ],
    practice: [
      mcq('Average-case time to look up a key in a well-sized hash table?', ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], 'O(1)', 1),
      mcq('Which technique stores colliding keys in a linked list per bucket?', ['Separate chaining', 'Linear probing', 'Double hashing', 'Cuckoo hashing'], 'Separate chaining', 2),
      mcq('Load factor 0.75 with 16 buckets means roughly how many entries?', ['12', '8', '16', '21'], '12', 2),
      problem('Insert keys 12, 22, 32 into a table of size 10 with h(k) = k mod 10 and linear probing. Which slot does 32 land in?', 'Slot 4 (2 is taken by 12, 3 by 22).', ['4'], 3),
      mcq('Worst-case lookup when every key collides?', ['O(n)', 'O(1)', 'O(log n)', 'O(n²)'], 'O(n)', 2),
      problem('A table doubles from 8 to 16 buckets. Why must existing keys move?', 'Their index is hash mod size, and the size changed, so most indices change.', ['mod', 'size'], 3),
      mcq('Which is NOT a goal of a hash function?', ['Preserve key order', 'Spread keys evenly', 'Be fast', 'Be deterministic'], 'Preserve key order', 3),
      problem('h(k) = k mod 7. Which of 14, 21, 9 collide?', '14 and 21 both map to 0.', ['14', '21'], 2),
    ],
    probe: [
      mcq('A collision means…', ['Two keys map to the same bucket', 'The table is full', 'A key is deleted', 'The hash function crashes'], 'Two keys map to the same bucket', 2),
      mcq('Raising the bucket count while keeping entries fixed lowers the…', ['Load factor', 'Key size', 'Hash output', 'Number of keys'], 'Load factor', 2),
      mcq('Open addressing stores colliding keys…', ['In other slots of the same array', 'In a linked list', 'In a second table only', 'Nowhere, they are dropped'], 'In other slots of the same array', 2),
      short('Explain why a hash table resizes when it gets full.', 'High load factor means more collisions and slower lookups; resizing restores near-O(1).', ['collision', 'slow', 'load']),
      short('Give one way to resolve collisions and how it works.', 'Chaining: each bucket keeps a list of entries that hashed there.', ['chain', 'list', 'probing', 'slot']),
    ],
  },
  'Cell Biology': {
    topic: 'Diffusion and osmosis',
    key_points: [
      'Diffusion moves particles from high to low concentration',
      'Osmosis is the movement of water across a partially permeable membrane',
      'Both are passive and need no energy from the cell',
      'Water moves toward the more concentrated solution',
    ],
    recall: [
      recall('From memory: what is the difference between diffusion and osmosis?', 'Diffusion is any particle moving down its concentration gradient; osmosis is specifically water crossing a partially permeable membrane.', ['water', 'membrane', 'gradient'], 2, 'Think about what moves, and across what.'),
      recall('Why do diffusion and osmosis need no energy from the cell?', 'They are passive: particles move down a concentration gradient by random motion.', ['passive', 'gradient'], 1),
      recall('A red blood cell is placed in pure water. What happens and why?', 'Water moves in by osmosis because the cell is more concentrated; it swells and may burst.', ['water', 'in', 'burst', 'swell'], 3),
      recall('Name two factors that speed up diffusion.', 'Higher temperature, steeper gradient, larger surface area, shorter distance.', ['temperature', 'surface', 'gradient', 'distance'], 2),
      recall('What does "partially permeable" mean?', 'The membrane lets some molecules through (like water) but not others (like large solutes).', ['some', 'not others'], 1),
      recall('How is active transport different from diffusion?', 'Active transport moves substances against the gradient and uses energy (ATP).', ['against', 'energy', 'atp'], 3),
    ],
    practice: [
      mcq('Osmosis is the movement of…', ['Water across a partially permeable membrane', 'Any particle down a gradient', 'Glucose using ATP', 'Ions through channels only'], 'Water across a partially permeable membrane', 1),
      mcq('Which increases the rate of diffusion?', ['Higher temperature', 'Thicker membrane', 'Smaller surface area', 'Lower gradient'], 'Higher temperature', 2),
      mcq('A plant cell in a concentrated salt solution will…', ['Lose water and become plasmolysed', 'Gain water and burst', 'Stay the same', 'Gain salt by osmosis'], 'Lose water and become plasmolysed', 3),
      short('Explain why oxygen diffuses into the blood in the lungs.', 'Oxygen is more concentrated in the alveoli than in the blood, so it moves down its gradient.', ['concentrat', 'gradient', 'alveoli']),
      mcq('Which process needs energy?', ['Active transport', 'Diffusion', 'Osmosis', 'All of them'], 'Active transport', 2),
      short('Water potential is lower in solution A than B. Which way does water move?', 'From B to A, toward the lower water potential.', ['b to a', 'toward a', 'into a']),
    ],
    probe: [
      mcq('Diffusion moves particles…', ['From high to low concentration', 'From low to high concentration', 'Only across membranes', 'Only when ATP is present'], 'From high to low concentration', 2),
      mcq('Osmosis specifically involves…', ['Water', 'Glucose', 'Oxygen', 'Proteins'], 'Water', 1),
      mcq('An animal cell in a very dilute solution will…', ['Swell', 'Shrink', 'Not change', 'Lose its nucleus'], 'Swell', 2),
      short('Explain osmosis to a friend in one sentence.', 'Water moves across a partially permeable membrane toward the more concentrated solution.', ['water', 'membrane', 'concentrat']),
      short('Why is diffusion called passive?', 'It needs no energy from the cell; particles move down the gradient by random motion.', ['energy', 'gradient', 'passive']),
    ],
  },
}

// For user-created subjects: build a simple bank from pasted material so the flow still works.
export function bankFromMaterial(name: string, kind: SubjectKind, text: string): Bank {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(' ').length >= 6)
    .slice(0, 12)
  const fallback = [`${name} covers several key ideas worth explaining in your own words.`]
  const src = sentences.length ? sentences : fallback
  const words = (s: string) => s.toLowerCase().match(/[a-z]{6,}/g)?.slice(0, 3) ?? []
  const recallItems = src.map((s, i) =>
    recall(`From memory: explain this idea in your own words. "${s.split(' ').slice(0, 7).join(' ')}…"`, s, words(s), ((i % 3) + 1) as Item['difficulty']),
  )
  const practiceItems = src.map((s) =>
    kind === 'PERFORMANCE'
      ? problem(`Work through this: ${s}`, s, words(s))
      : short(`Explain: ${s.split(' ').slice(0, 8).join(' ')}…`, s, words(s)),
  )
  return {
    topic: name,
    key_points: src.slice(0, 4),
    recall: recallItems,
    practice: practiceItems,
    probe: src.slice(0, 5).map((s) => short(`Explain: ${s.split(' ').slice(0, 8).join(' ')}…`, s, words(s))),
  }
}
