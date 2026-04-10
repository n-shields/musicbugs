import { buildNotes, DUR_MULTIPLIERS } from './notes.js'

let _ctx = null

function getCtx() {
  if (!_ctx) _ctx = new AudioContext()
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function playBug(lsystem) {
  const ctx = getCtx()
  const notes = buildNotes(lsystem)
  if (notes.length === 0) return () => {}

  const BPM = 140
  const quarterNote = 60 / BPM
  const startAt = ctx.currentTime + 0.05
  const oscillators = []
  let t = startAt

  for (const { midi, durIdx } of notes) {
    const dur = quarterNote * DUR_MULTIPLIERS[durIdx]
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
