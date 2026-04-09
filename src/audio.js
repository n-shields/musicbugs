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

  // Walk the L-system string to build a note list, tracking bracket depth
  const notes = []
  let pitch = 60 // start at middle C
  let depth = 0
  const stack = []
  const BPM = 140
  const baseStep = 60 / BPM / 2 // eighth note at depth 0

  for (const c of str) {
    if (notes.length >= Math.min(8 * (lsystem.gen + 1), 64)) break
    if (c === 'F') {
      // Deeper branches get shorter notes: each level halves duration (min ~1/8 of base)
      const dur = baseStep * Math.pow(0.6, Math.min(depth, 4))
      notes.push({ midi: quantize(pitch), dur })
      pitch += 1 // slight upward drift keeps it melodic
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

  if (notes.length === 0) return () => {}

  // Wrap pitches into C3–C6 (48–84)
  const clamped = notes.map(({ midi, dur }) => {
    while (midi < 48) midi += 12
    while (midi > 84) midi -= 12
    return { midi, dur }
  })

  const startAt = ctx.currentTime + 0.05
  const oscillators = []
  let t = startAt

  for (const { midi, dur } of clamped) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'triangle'
    osc.frequency.value = midiToFreq(midi)

    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.12, t + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.85)

    osc.start(t)
    osc.stop(t + dur)
    oscillators.push(osc)
    t += dur
  }

  return function stop() {
    const now = ctx.currentTime
    oscillators.forEach(osc => { try { osc.stop(now) } catch (_) {} })
  }
}
