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

// dur levels indexed by depth; durBase controls the slowest/fastest range
const DUR_LEVELS = {
  h: ['h', 'q', '8', '16'],   // half-note base: slow bugs
  q: ['q', '8', '16', '16'],  // quarter-note base: no 32nds
}

function baseDur(depth, durBase) {
  const levels = DUR_LEVELS[durBase ?? 'q']
  return levels[Math.min(depth, 3)]
}

// Duration values in quarter-note units (used by audio AND notation)
export const DUR_MULTIPLIERS = {
  'w': 4,   'wd': 6,
  'h': 2,   'hd': 3,
  'q': 1,   'qd': 1.5,
  '8': 0.5, '8d': 0.75,
  '16': 0.25, '16d': 0.375,
  '32': 0.125,
}

// Alias used by Notation.jsx for measure-beat accounting
export const DUR_BEATS = DUR_MULTIPLIERS

export function buildNotes(lsystem) {
  const scale    = SCALES[lsystem.scaleIdx  ?? 0].intervals
  const rootPitch = lsystem.rootPitch ?? 60
  const step      = lsystem.pitchStep ?? 2   // semitones per +/-
  const durBase   = lsystem.durBase ?? 'q'
  const str       = expand(lsystem)

  const raw = []
  let pitch = rootPitch
  let depth = 0
  const stack = []

  for (let ci = 0; ci < str.length; ci++) {
    const c = str[ci]
    if (raw.length >= 128) break

    if (c === 'F' || c === 'H') {
      let midi = quantize(pitch, scale)
      while (midi < 60) midi += 12
      while (midi > 84) midi -= 12

      // Chord: trunk F immediately before a branch gets a harmony fifth
      let chordMidi = null
      if (c === 'F' && depth === 0 && str[ci + 1] === '[') {
        let cm = quantize(midi + 7, scale)
        if (cm <= midi) cm += 12
        while (cm > 84) cm -= 12
        chordMidi = cm
      }

      // H always produces a half note regardless of depth
      const dur = c === 'H' ? 'h' : baseDur(depth, durBase)
      raw.push({ midi, depth, dur, chordMidi })
      pitch += 1
    } else if (c === '+') {
      pitch += step
    } else if (c === '-') {
      pitch -= step
    } else if (c === '[') {
      stack.push(pitch)
      depth++
    } else if (c === ']') {
      if (stack.length > 0) pitch = stack.pop()
      depth = Math.max(0, depth - 1)
    }
  }

  // Dotted rhythm pairs: depth-D note followed by depth-(D+1) note
  return raw.map((note, i) => {
    const next = raw[i + 1]
    const dotted = next !== undefined && note.depth <= 1 && next.depth === note.depth + 1
    return dotted ? { ...note, dur: note.dur + 'd', dotted: true } : { ...note, dotted: false }
  })
}
