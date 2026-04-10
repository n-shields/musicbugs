export const SCALES = [
  { name: 'pentatonic major', intervals: [0, 2, 4, 7, 9] },
  { name: 'pentatonic minor', intervals: [0, 3, 5, 7, 10] },
  { name: 'major',            intervals: [0, 2, 4, 5, 7, 9, 11] },
  { name: 'natural minor',    intervals: [0, 2, 3, 5, 7, 8, 10] },
  { name: 'dorian',           intervals: [0, 2, 3, 5, 7, 9, 10] },
  { name: 'whole tone',       intervals: [0, 2, 4, 6, 8, 10] },
  { name: 'blues',            intervals: [0, 3, 5, 6, 7, 10] },
]

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

export function rootNoteName(midi) {
  return NOTE_NAMES[midi % 12]
}
