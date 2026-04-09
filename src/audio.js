import { expand } from './lsystem'

let _ctx = null

function getCtx() {
  if (!_ctx) _ctx = new AudioContext()
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

// Pentatonic scale intervals (semitones above root)
const PENTATONIC = [0, 2, 4, 7, 9]

function quantize(midi) {
  const octave = Math.floor(midi / 12)
  const pc = ((midi % 12) + 12) % 12
  const nearest = PENTATONIC.reduce((a, b) =>
    Math.abs(b - pc) < Math.abs(a - pc) ? b : a
  )
  return octave * 12 + nearest
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function playBug(lsystem) {
  const ctx = getCtx()
  const str = expand(lsystem)

  // Walk the L-system string to build a note list
  const notes = []
  let pitch = 60 // start at middle C
  const stack = []

  for (const c of str) {
    if (notes.length >= Math.min(8 * (lsystem.gen + 1), 64)) break
    if (c === 'F') {
      notes.push(quantize(pitch))
      pitch += 1 // slight upward drift keeps it melodic
    } else if (c === '+') {
      pitch += 2
    } else if (c === '-') {
      pitch -= 2
    } else if (c === '[') {
      stack.push(pitch)
    } else if (c === ']') {
      if (stack.length > 0) pitch = stack.pop()
    }
  }

  if (notes.length === 0) return () => {}

  // Wrap pitches into C3–C6 (48–84)
  const clamped = notes.map(n => {
    while (n < 48) n += 12
    while (n > 84) n -= 12
    return n
  })

  const BPM = 140
  const step = 60 / BPM / 2 // eighth notes
  const startAt = ctx.currentTime + 0.05

  const oscillators = []

  clamped.forEach((midi, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'triangle'
    osc.frequency.value = midiToFreq(midi)

    const t = startAt + i * step
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.12, t + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.001, t + step * 0.85)

    osc.start(t)
    osc.stop(t + step)
    oscillators.push(osc)
  })

  return function stop() {
    const now = ctx.currentTime
    oscillators.forEach(osc => { try { osc.stop(now) } catch (_) {} })
  }
}
