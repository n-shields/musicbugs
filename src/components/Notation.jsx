import { useLayoutEffect, useRef } from 'react'
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam } from 'vexflow'
import { buildNotes, DUR_TYPES } from '../notes.js'
import { bugHue } from '../bugDraw.js'

const NOTE_NAMES = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b']

function midiToVexKey(midi) {
  const octave = Math.floor(midi / 12) - 1
  return `${NOTE_NAMES[midi % 12]}/${octave}`
}

const NOTES_PER_LINE = 8
const STAVE_BAND = 92   // px allocated per line (extra room for ledger lines below)
const STAVE_OFFSET = 22 // top margin within each band

export default function Notation({ bug }) {
  const containerRef = useRef(null)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.innerHTML = ''

    const notes = buildNotes(bug)
    if (notes.length === 0) return

    const hue = bugHue(bug)
    const color = `hsl(${hue}, 65%, 62%)`

    const padL = 10
    const padR = 10
    const width = el.offsetWidth || 280

    const numLines = Math.max(1, Math.ceil(notes.length / NOTES_PER_LINE))
    const totalHeight = numLines * STAVE_BAND + 22

    try {
      const renderer = new Renderer(el, Renderer.Backends.SVG)
      renderer.resize(width, totalHeight)
      const ctx = renderer.getContext()
      ctx.setFillStyle(color)
      ctx.setStrokeStyle(color)

      for (let line = 0; line < numLines; line++) {
        const lineNotes = notes.slice(line * NOTES_PER_LINE, (line + 1) * NOTES_PER_LINE)
        if (lineNotes.length === 0) break

        const y = line * STAVE_BAND + STAVE_OFFSET
        const clefWidth = line === 0 ? 46 : 0
        const staveWidth = width - padL - padR
        const noteAreaWidth = staveWidth - clefWidth - 8

        const stave = new Stave(padL, y, staveWidth)
        if (line === 0) stave.addClef('treble')
        stave.setContext(ctx).draw()

        const staveNotes = lineNotes.map(({ midi, durIdx }) =>
          new StaveNote({
            keys: [midiToVexKey(midi)],
            duration: DUR_TYPES[durIdx],
            auto_stem: true,
          }).setStyle({ fillStyle: color, strokeStyle: color })
        )

        const beams = Beam.generateBeams(staveNotes)
        const voice = new Voice().setMode(Voice.Mode.SOFT)
        voice.addTickables(staveNotes)
        new Formatter().joinVoices([voice]).format([voice], noteAreaWidth)
        voice.draw(ctx, stave)
        beams.forEach(b => b.setContext(ctx).draw())
      }

      // Recolour anything VexFlow left black (clef, staff lines, ledger lines)
      el.querySelectorAll('svg path, svg rect, svg text').forEach(node => {
        const fill = node.getAttribute('fill')
        const stroke = node.getAttribute('stroke')
        if (fill === 'black' || fill === '#000000') node.setAttribute('fill', color)
        if (stroke === 'black' || stroke === '#000000') node.setAttribute('stroke', color)
      })
    } catch (e) {
      console.error('Notation render error:', e)
    }
  }, [bug])

  return <div ref={containerRef} className="notation-wrap" />
}
