import { expand } from './lsystem.js'
import { SCALES } from './scales.js'

function quantize(midi, intervals) {
  const octave = Math.floor(midi / 12)
  const pc = ((midi % 12) + 12) % 12
  const nearest = intervals.reduce((a, b) =>
    Math.abs(b - pc) < Math.abs(a - pc) ? b : a
  )
  return octave * 12 + nearest
}

// Base VexFlow duration string by depth
function baseDur(depth) {
  return ['q', '8', '16', '32'][Math.min(depth, 3)]
}

// Duration as a fraction of a quarter note
export const DUR_MULTIPLIERS = {
  q:   1,    qd: 1.5,
  '8': 0.5,  '8d': 0.75,  '8t':  1 / 3,
  '16': 0.25, '16d': 0.375, '16t': 1 / 6,
  '32': 0.125,
}

export function buildNotes(lsystem) {
  const scale = SCALES[lsystem.scaleIdx ?? 0].intervals
  const rootPitch = lsystem.rootPitch ?? 60
  const str = expand(lsystem)

  const raw = []
  let pitch = rootPitch
  let depth = 0
  const stack = []
  let prevChar = null

  for (const c of str) {
    if (raw.length >= 64) break
    if (c === 'F') {
      let midi = quantize(pitch, scale)
      while (midi < 60) midi += 12
      while (midi > 84) midi -= 12

      // Dotted: F immediately after a turn at shallow depth
      const dotted = (prevChar === '+' || prevChar === '-') && depth <= 1
      raw.push({ midi, depth, dur: baseDur(depth), dotted })
      pitch += 1
    } else if (c === '+') {
      pitch += 2
    } else if (c === '-') {
      pitch -= 2
    } else if (c === '[') {
      stack.push(pitch)
      depth++
    } else if (c === ']') {
      if (stack.length > 0) pitch = stack.pop()
      depth = Math.max(0, depth - 1)
    }
    prevChar = c
  }

  // Post-process: group three consecutive non-dotted notes at depth ≥ 1 into triplets
  const notes = []
  let tripletCounter = 0
  let i = 0
  while (i < raw.length) {
    const a = raw[i], b = raw[i + 1], c2 = raw[i + 2]
    if (
      b && c2 &&
      !a.dotted && !b.dotted && !c2.dotted &&
      a.depth >= 1 && a.depth === b.depth && b.depth === c2.depth
    ) {
      const g = tripletCounter++
      const td = a.depth === 1 ? '8t' : '16t'
      notes.push({ ...a, dur: td, tripletGroup: g, tripletStart: true })
      notes.push({ ...b, dur: td, tripletGroup: g })
      notes.push({ ...c2, dur: td, tripletGroup: g, tripletEnd: true })
      i += 3
    } else {
      notes.push(raw[i])
      i++
    }
  }

  return notes
}
