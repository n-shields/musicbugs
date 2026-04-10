import { useLayoutEffect, useRef } from 'react'
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam } from 'vexflow'
import { buildNotes, DUR_TYPES } from '../notes.js'
import { bugHue } from '../bugDraw.js'

// C, Db, D, Eb, E, F, Gb, G, Ab, A, Bb, B
const NOTE_NAMES = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b']

function midiToVexKey(midi) {
  const octave = Math.floor(midi / 12) - 1
  return `${NOTE_NAMES[midi % 12]}/${octave}`
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
    const color = `hsl(${hue}, 65%, 62%)`

    const containerWidth = el.offsetWidth || 320
    const minNoteWidth = 26
    const staveLeft = 12
    const staveWidth = Math.max(
      containerWidth - staveLeft * 2,
      notes.length * minNoteWidth + 80
    )
    const totalWidth = staveWidth + staveLeft * 2

    try {
      const renderer = new Renderer(el, Renderer.Backends.SVG)
      renderer.resize(totalWidth, 82)
      const ctx = renderer.getContext()
      ctx.setFillStyle(color)
      ctx.setStrokeStyle(color)

      const stave = new Stave(staveLeft, 6, staveWidth)
      stave.addClef('treble')
      stave.setContext(ctx).draw()

      const staveNotes = notes.map(({ midi, durIdx }) =>
        new StaveNote({
          keys: [midiToVexKey(midi)],
          duration: DUR_TYPES[durIdx],
          auto_stem: true,
        }).setStyle({ fillStyle: color, strokeStyle: color })
      )

      const beams = Beam.generateBeams(staveNotes)
      const voice = new Voice().setMode(Voice.Mode.SOFT)
      voice.addTickables(staveNotes)
      new Formatter().joinVoices([voice]).format([voice], staveWidth - 50)
      voice.draw(ctx, stave)
      beams.forEach(b => b.setContext(ctx).draw())

      // Recolour any elements VexFlow drew in black (clef, staff lines, ledger lines)
      el.querySelectorAll('svg path, svg rect, svg text').forEach(node => {
        const fill = node.getAttribute('fill')
        const stroke = node.getAttribute('stroke')
        if (fill === 'black' || fill === '#000000' || fill === 'rgb(0, 0, 0)') {
          node.setAttribute('fill', color)
        }
        if (stroke === 'black' || stroke === '#000000' || stroke === 'rgb(0, 0, 0)') {
          node.setAttribute('stroke', color)
        }
      })
    } catch (e) {
      console.error('Notation render error:', e)
    }
  }, [bug])

  return <div ref={containerRef} className="notation-wrap" />
}
