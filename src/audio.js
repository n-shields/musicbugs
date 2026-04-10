import { buildNotes, DUR_MULTIPLIERS } from './notes.js'

let _ctx = null

function getCtx() {
  if (!_ctx) _ctx = new AudioContext()
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

export function resumeAudio() {
  getCtx()
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

  for (const note of notes) {
    const mult = DUR_MULTIPLIERS[note.dur] ?? 0.5
    const dur = quarterNote * mult
    const midis = note.chordMidi ? [note.midi, note.chordMidi] : [note.midi]
    // Reduce gain slightly when playing chords to avoid clipping
    const peakGain = note.chordMidi ? 0.09 : 0.12

    for (const midi of midis) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'triangle'
      osc.frequency.value = midiToFreq(midi)

      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(peakGain, t + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.85)

      osc.start(t)
      osc.stop(t + dur)
      oscillators.push(osc)
    }
    t += dur
  }

  return function stop() {
    const now = ctx.currentTime
    oscillators.forEach(osc => { try { osc.stop(now) } catch (_) {} })
  }
}
