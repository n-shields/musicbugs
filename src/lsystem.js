import { SCALES, TIME_SIGS } from './scales.js'

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
    rules: { F: 'F[+FH][-FF]F' },
    angle: 30,
    generations: 4,
    gen: 0,
  },
]

// Randomise musical character at startup
export const SEEDS = BASE_SEEDS.map(s => ({
  ...s,
  rootPitch: 60 + Math.floor(Math.random() * 12),
  scaleIdx:  Math.floor(Math.random() * SCALES.length),
  pitchStep: 2 + Math.floor(Math.random() * 4),
  timeSig:   TIME_SIGS[Math.floor(Math.random() * TIME_SIGS.length)],
  durBase:   Math.random() < 0.5 ? 'h' : 'q',
  ancestors: [],
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

// Build mutation pool from current rule keys.
// H (half-note condensing symbol) available at low rate.
// X available only when the bug already has an X rule.
function buildPool(rules) {
  let pool = 'FFFFFHH++-[]'
  if (rules.X) pool += 'XX'
  return pool
}

function mutateRuleStr(s, pool) {
  if (s.length === 0) return s
  const r = Math.random()
  const pos = Math.floor(Math.random() * s.length)
  const sym = () => pool[Math.floor(Math.random() * pool.length)]

  if (r < 0.55) {
    const chars = s.split('')
    chars[pos] = sym()
    return chars.join('')
  } else if (r < 0.72 && s.length < 24) {
    return s.slice(0, pos) + sym() + s.slice(pos)
  } else if (r < 0.88 && s.length > 3) {
    return s.slice(0, pos) + s.slice(pos + 1)
  } else if (pos < s.length - 1) {
    const chars = s.split('')
    ;[chars[pos], chars[pos + 1]] = [chars[pos + 1], chars[pos]]
    return chars.join('')
  }
  return s
}

// Starter X rules that make sensible branching patterns
const X_STARTERS = [
  'F[+FX][-FX]',
  'FX[-F][+F]',
  'F+X-F[X]',
]

function mutateOne(parent) {
  const rules = { ...parent.rules }
  const pool = buildPool(rules)

  // Mutate one rule string
  const keys = Object.keys(rules)
  const key = keys[Math.floor(Math.random() * keys.length)]
  rules[key] = mutateRuleStr(rules[key], pool)

  // Small chance to introduce an X rule if not present
  if (!rules.X && Math.random() < 0.06) {
    rules.X = X_STARTERS[Math.floor(Math.random() * X_STARTERS.length)]
  }

  const rootPitch = Math.random() < 0.15
    ? Math.max(55, Math.min(71, parent.rootPitch + Math.round((Math.random() - 0.5) * 4)))
    : parent.rootPitch
  const scaleIdx = Math.random() < 0.1
    ? Math.floor(Math.random() * SCALES.length)
    : parent.scaleIdx
  const pitchStep = Math.random() < 0.15
    ? Math.max(2, Math.min(7, parent.pitchStep + (Math.random() < 0.5 ? 1 : -1)))
    : parent.pitchStep
  const timeSig = Math.random() < 0.08
    ? TIME_SIGS[Math.floor(Math.random() * TIME_SIGS.length)]
    : parent.timeSig
  const durBase = Math.random() < 0.08
    ? (parent.durBase === 'h' ? 'q' : 'h')
    : parent.durBase

  return {
    id: uid(),
    axiom: parent.axiom,
    rules,
    angle: Math.max(5, Math.min(60, parent.angle + (Math.random() - 0.5) * 4)),
    generations: parent.generations,
    gen: parent.gen + 1,
    rootPitch,
    scaleIdx,
    pitchStep,
    timeSig,
    durBase,
    ancestors: [...(parent.ancestors || []), parent],
  }
}

export function mutate(parent) {
  return Array.from({ length: 4 }, () => mutateOne(parent))
}
