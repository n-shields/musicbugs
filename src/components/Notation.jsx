import { useLayoutEffect, useRef } from 'react'
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Dot } from 'vexflow'
import { buildNotes } from '../notes.js'
import { bugHue, depthHue } from '../bugDraw.js'

const NOTE_NAMES = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b']

function midiToVexKey(midi) {
  const octave = Math.floor(midi / 12) - 1
  return `${NOTE_NAMES[midi % 12]}/${octave}`
}

// Strip the 'd' suffix so VexFlow gets the base duration; we add a Dot modifier separately
function vexBaseDur(dur) {
  return dur.replace(/d$/, '')
}

const NOTES_PER_LINE = 9
const STAVE_BAND = 92
const STAVE_OFFSET = 22

export default function Notation({ bug }) {
  const containerRef = useRef(null)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.innerHTML = ''

    const notes = buildNotes(bug)
    if (notes.length === 0) return

    const hue = bugHue(bug)
    const baseColor = `hsl(${hue}, 65%, 62%)` // staff lines, clef, beams
    const padL = 10
    const width = el.offsetWidth || 280

    // Split into lines of NOTES_PER_LINE
    const lines = []
    for (let i = 0; i < notes.length; i += NOTES_PER_LINE) {
      lines.push(notes.slice(i, i + NOTES_PER_LINE))
    }

    const totalHeight = lines.length * STAVE_BAND + 22

    try {
      const renderer = new Renderer(el, Renderer.Backends.SVG)
      renderer.resize(width, totalHeight)
      const ctx = renderer.getContext()
      ctx.setFillStyle(baseColor)
      ctx.setStrokeStyle(baseColor)

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const lineNotes = lines[lineIdx]
        const y = lineIdx * STAVE_BAND + STAVE_OFFSET
        const clefExtra = lineIdx === 0 ? 46 : 0
        const staveWidth = width - padL * 2
        const noteAreaWidth = staveWidth - clefExtra - 8

        const stave = new Stave(padL, y, staveWidth)
        if (lineIdx === 0) stave.addClef('treble')
        stave.setContext(ctx).draw()

        const staveNotes = lineNotes.map(note => {
          const nc = `hsl(${depthHue(hue, note.depth)}, 65%, 62%)`
          // Two-note chord when chordMidi is set; keys must be low→high
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
        new Formatter().joinVoices([voice]).format([voice], noteAreaWidth)
        voice.draw(ctx, stave)
        beams.forEach(b => b.setContext(ctx).draw())
      }

      // Recolour structural elements (clef, staff lines, beams) left black by VexFlow
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
