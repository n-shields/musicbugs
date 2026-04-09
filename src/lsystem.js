export const SEEDS = [
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

export function expand(lsystem) {
  let str = lsystem.axiom
  for (let i = 0; i < lsystem.generations; i++) {
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

  if (r < 0.40) {
    // substitution
    const chars = s.split('')
    chars[pos] = randomSymbol()
    return chars.join('')
  } else if (r < 0.65 && s.length < 24) {
    // insertion
    return s.slice(0, pos) + randomSymbol() + s.slice(pos)
  } else if (r < 0.85 && s.length > 3) {
    // deletion
    return s.slice(0, pos) + s.slice(pos + 1)
  } else if (pos < s.length - 1) {
    // swap adjacent
    const chars = s.split('')
    ;[chars[pos], chars[pos + 1]] = [chars[pos + 1], chars[pos]]
    return chars.join('')
  }
  return s
}

function mutateOne(parent) {
  const rules = { ...parent.rules }
  const keys = Object.keys(rules)
  const numMutations = Math.random() < 0.35 ? 2 : 1
  for (let i = 0; i < numMutations; i++) {
    const key = keys[Math.floor(Math.random() * keys.length)]
    rules[key] = mutateRuleStr(rules[key])
  }
  return {
    id: uid(),
    axiom: parent.axiom,
    rules,
    angle: Math.max(5, Math.min(60, parent.angle + (Math.random() - 0.5) * 8)),
    generations: parent.generations,
    gen: parent.gen + 1,
  }
}

export function mutate(parent) {
  return Array.from({ length: 4 }, () => mutateOne(parent))
}
