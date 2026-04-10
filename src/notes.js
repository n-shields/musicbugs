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

function baseDur(depth) {
  return ['q', '8', '16', '32'][Math.min(depth, 3)]
}

// Duration as a fraction of a quarter note
export const DUR_MULTIPLIERS = {
  'q': 1, 'qd': 1.5,
  '8': 0.5, '8d': 0.75,
  '16': 0.25, '16d': 0.375,
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

  for (const c of str) {
    if (raw.length >= 64) break
    if (c === 'F') {
      let midi = quantize(pitch, scale)
      while (midi < 60) midi += 12
      while (midi > 84) midi -= 12
      raw.push({ midi, depth, dur: baseDur(depth) })
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

  // Post-process: dotted rhythm pairs.
  // A note at depth D, when followed by a note at depth D+1, becomes dotted
  // (e.g. dotted quarter → eighth, dotted eighth → sixteenth).
  // Limited to depths 0–1 to keep it to well-known dotted-rhythm pairs.
  const notes = raw.map((note, i) => {
    const next = raw[i + 1]
    const dotted =
      next !== undefined &&
      note.depth <= 1 &&
      next.depth === note.depth + 1
    return dotted
      ? { ...note, dur: note.dur + 'd', dotted: true }
      : { ...note, dotted: false }
  })

  return notes
}
