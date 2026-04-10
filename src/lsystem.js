import { SCALES } from './scales.js'

const BASE_SEEDS = [
  {
    id: 'seed-0',
    axiom: 'F',
    rules: { F: 'FF+[+F-F-F]-[-F+F+F]' },
    angle: 25,
    generations: 3,
    gen: 0,
  },
  {
    id: 'seed-1',
    axiom: 'X',
    rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' },
    angle: 25,
    generations: 4,
    gen: 0,
  },
  {
    id: 'seed-2',
    axiom: 'F',
    rules: { F: 'F[+F]F[-F][F]' },
    angle: 20,
    generations: 4,
    gen: 0,
  },
  {
    id: 'seed-3',
    axiom: 'F',
    rules: { F: 'F[+FF][-FF]F' },
    angle: 30,
    generations: 4,
    gen: 0,
  },
]

// Randomise musical character at startup
export const SEEDS = BASE_SEEDS.map(s => ({
  ...s,
  rootPitch: 60 + Math.floor(Math.random() * 12), // C4–B4
  scaleIdx:  Math.floor(Math.random() * SCALES.length),
}))

// Expand using min(gen+1, generations) iterations so early-gen bugs are visually simple
export function expand(lsystem) {
  const iters = Math.min(lsystem.gen + 1, lsystem.generations)
  let str = lsystem.axiom
  for (let i = 0; i < iters; i++) {
    let next = ''
    for (const c of str) {
      next += lsystem.rules[c] ?? c
      if (next.length > 8000) break
    }
    str = next
    if (str.length > 8000) break
  }
  return str
}

let _uid = 0
function uid() { return `bug-${Date.now()}-${_uid++}` }

// Weighted symbol pool: F appears more often so mutations stay drawable
const POOL = 'FFFFF++-[]'

function randomSymbol() {
  return POOL[Math.floor(Math.random() * POOL.length)]
}

function mutateRuleStr(s) {
  if (s.length === 0) return s
  const r = Math.random()
  const pos = Math.floor(Math.random() * s.length)

  if (r < 0.55) {
    const chars = s.split('')
    chars[pos] = randomSymbol()
    return chars.join('')
  } else if (r < 0.72 && s.length < 24) {
    return s.slice(0, pos) + randomSymbol() + s.slice(pos)
  } else if (r < 0.88 && s.length > 3) {
    return s.slice(0, pos) + s.slice(pos + 1)
  } else if (pos < s.length - 1) {
    const chars = s.split('')
    ;[chars[pos], chars[pos + 1]] = [chars[pos + 1], chars[pos]]
    return chars.join('')
  }
  return s
}

function mutateOne(parent) {
  const rules = { ...parent.rules }
  const keys = Object.keys(rules)
  const key = keys[Math.floor(Math.random() * keys.length)]
  rules[key] = mutateRuleStr(rules[key])

  // Occasionally shift root pitch or scale
  const rootPitch = Math.random() < 0.15
    ? Math.max(55, Math.min(71, parent.rootPitch + (Math.round((Math.random() - 0.5) * 4))))
    : parent.rootPitch
  const scaleIdx = Math.random() < 0.1
    ? Math.floor(Math.random() * SCALES.length)
    : parent.scaleIdx

  return {
    id: uid(),
    axiom: parent.axiom,
    rules,
    angle: Math.max(5, Math.min(60, parent.angle + (Math.random() - 0.5) * 4)),
    generations: parent.generations,
    gen: parent.gen + 1,
    rootPitch,
    scaleIdx,
  }
}

export function mutate(parent) {
  return Array.from({ length: 4 }, () => mutateOne(parent))
}
