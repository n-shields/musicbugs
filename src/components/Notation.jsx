import { useLayoutEffect, useRef } from 'react'
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Dot, BarlineType } from 'vexflow'
import { buildNotes, DUR_BEATS } from '../notes.js'
import { bugHue, depthHue } from '../bugDraw.js'

const NOTE_NAMES = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b']

function midiToVexKey(midi) {
  const octave = Math.floor(midi / 12) - 1
  return `${NOTE_NAMES[midi % 12]}/${octave}`
}

// Strip dotted suffix so VexFlow gets the base duration; Dot modifier added separately
function vexBaseDur(dur) {
  return dur.replace(/d$/, '')
}

// Quarter-note units per measure for a given time signature
function measureBeats(ts) {
  return ts.num * (4 / ts.den)
}

const STAVE_BAND = 92
const STAVE_OFFSET = 22
// Extra horizontal space on the first stave for clef + time signature
const CLEF_TS_W = 58

function renderMeasure(ctx, stave, notes, hue, noteAreaW) {
  if (!notes || notes.length === 0) return

  const staveNotes = notes.map(note => {
    const nc = `hsl(${depthHue(hue, note.depth)}, 65%, 62%)`
    const keys = note.chordMidi
      ? [note.midi, note.chordMidi].sort((a, b) => a - b).map(midiToVexKey)
      : [midiToVexKey(note.midi)]
    const sn = new StaveNote({
      keys,
      duration: vexBaseDur(note.dur),
      auto_stem: true,
    }).setStyle({ fillStyle: nc, strokeStyle: nc })
    if (note.dotted) Dot.buildAndAttach([sn], { all: true })
    return sn
  })

  const beams = Beam.generateBeams(staveNotes)
  const voice = new Voice().setMode(Voice.Mode.SOFT)
  voice.addTickables(staveNotes)
  new Formatter().joinVoices([voice]).format([voice], noteAreaW)
  voice.draw(ctx, stave)
  beams.forEach(b => b.setContext(ctx).draw())
}

export default function Notation({ bug }) {
  const containerRef = useRef(null)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.innerHTML = ''

    const notes = buildNotes(bug)
    if (notes.length === 0) return

    const hue = bugHue(bug)
    const baseColor = `hsl(${hue}, 65%, 62%)`
    const padL = 10
    const width = el.offsetWidth || 280
    const staveWidth = width - padL * 2

    const ts = bug.timeSig ?? { num: 4, den: 4 }
    const tsStr = `${ts.num}/${ts.den}`
    const mBeats = measureBeats(ts)

    // Split notes into measures by accumulated beat count
    const measures = []
    let cur = []
    let beats = 0
    for (const note of notes) {
      const b = DUR_BEATS[note.dur] ?? 0.25
      if (beats + b > mBeats + 0.001 && cur.length > 0) {
        measures.push(cur)
        cur = [note]
        beats = b
      } else {
        cur.push(note)
        beats += b
      }
    }
    if (cur.length > 0) measures.push(cur)

    // Group into pairs for display (2 measures per line)
    const linePairs = []
    for (let i = 0; i < measures.length; i += 2) {
      linePairs.push([measures[i], measures[i + 1] ?? null])
    }

    const totalHeight = linePairs.length * STAVE_BAND + STAVE_OFFSET
    try {
      const renderer = new Renderer(el, Renderer.Backends.SVG)
      renderer.resize(width, totalHeight)
      const ctx = renderer.getContext()
      ctx.setFillStyle(baseColor)
      ctx.setStrokeStyle(baseColor)

      for (let li = 0; li < linePairs.length; li++) {
        const [m1, m2] = linePairs[li]
        const y = li * STAVE_BAND + STAVE_OFFSET
        const isFirst = li === 0
        const extra = isFirst ? CLEF_TS_W : 0
        const isSingle = m2 === null

        // Each measure gets equal note-area width
        const halfStave = (staveWidth - extra) / 2

        // Stave 1
        const s1w = isSingle ? staveWidth : halfStave + extra
        const s1 = new Stave(padL, y, s1w)
        if (isFirst) { s1.addClef('treble'); s1.addTimeSignature(tsStr) }
        s1.setContext(ctx).draw()
        renderMeasure(ctx, s1, m1, hue, isSingle ? staveWidth - extra - 8 : halfStave - 8)

        // Stave 2 (only when there's a second measure on this line)
        if (!isSingle) {
          const s2 = new Stave(padL + s1w, y, halfStave)
          s2.setBegBarType(BarlineType.NONE)
          s2.setContext(ctx).draw()
          renderMeasure(ctx, s2, m2, hue, halfStave - 8)
        }
      }

      // Recolour VexFlow's default black elements
      el.querySelectorAll('svg path, svg rect, svg text').forEach(node => {
        if (node.getAttribute('fill') === 'black') node.setAttribute('fill', baseColor)
        if (node.getAttribute('stroke') === 'black') node.setAttribute('stroke', baseColor)
      })
    } catch (e) {
      console.error('Notation render error:', e)
    }
  }, [bug])

  return <div ref={containerRef} className="notation-wrap" />
}
