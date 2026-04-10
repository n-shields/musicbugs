import { expand } from './lsystem.js'

const PENTATONIC = [0, 2, 4, 7, 9]

function quantize(midi) {
  const octave = Math.floor(midi / 12)
  const pc = ((midi % 12) + 12) % 12
  const nearest = PENTATONIC.reduce((a, b) =>
    Math.abs(b - pc) < Math.abs(a - pc) ? b : a
  )
  return octave * 12 + nearest
}

// depth index → VexFlow duration string
export const DUR_TYPES = ['q', '8', '16', '32']

// depth index → fraction of a quarter note
export const DUR_MULTIPLIERS = [1, 0.5, 0.25, 0.125]

export function buildNotes(lsystem) {
  const str = expand(lsystem)
  const maxNotes = Math.min(1 << Math.min(lsystem.gen, 6), 64) // 1, 2, 4, 8, 16, 32, 64
  const notes = []
  let pitch = 60, depth = 0
  const stack = []

  for (const c of str) {
    if (notes.length >= maxNotes) break
    if (c === 'F') {
      let midi = quantize(pitch)
      while (midi < 60) midi += 12
      while (midi > 84) midi -= 12
      notes.push({ midi, durIdx: Math.min(depth, 3) })
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
  }
  return notes
}
