import { useLayoutEffect, useRef } from 'react'
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Dot, Tuplet } from 'vexflow'
import { buildNotes } from '../notes.js'
import { bugHue } from '../bugDraw.js'

const NOTE_NAMES = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b']

function midiToVexKey(midi) {
  const octave = Math.floor(midi / 12) - 1
  return `${NOTE_NAMES[midi % 12]}/${octave}`
}

// VexFlow base duration (strip 'd'/'t' suffixes — modifiers handle those)
function vexBaseDur(dur) {
  return dur.replace(/[dt]$/, '')
}

const NOTES_PER_LINE = 9
const STAVE_BAND = 92
const STAVE_OFFSET = 22

// Split notes into lines, keeping triplet groups together
function toLines(notes) {
  const lines = []
  let line = []
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i]
    // If a triplet group would straddle the limit, push the line now
    if (line.length >= NOTES_PER_LINE - 2 && note.tripletStart) {
      if (line.length > 0) { lines.push(line); line = [] }
    } else if (line.length >= NOTES_PER_LINE) {
      lines.push(line); line = []
    }
    line.push(note)
  }
  if (line.length > 0) lines.push(line)
  return lines
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

    const padL = 10
    const width = el.offsetWidth || 280
    const lines = toLines(notes)
    const totalHeight = lines.length * STAVE_BAND + 22

    try {
      const renderer = new Renderer(el, Renderer.Backends.SVG)
      renderer.resize(width, totalHeight)
      const ctx = renderer.getContext()
      ctx.setFillStyle(color)
      ctx.setStrokeStyle(color)

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const lineNotes = lines[lineIdx]
        const y = lineIdx * STAVE_BAND + STAVE_OFFSET
        const clefExtra = lineIdx === 0 ? 46 : 0
        const staveWidth = width - padL * 2
        const noteAreaWidth = staveWidth - clefExtra - 8

        const stave = new Stave(padL, y, staveWidth)
        if (lineIdx === 0) stave.addClef('treble')
        stave.setContext(ctx).draw()

        // Build StaveNotes
        const staveNotes = lineNotes.map(note => {
          const sn = new StaveNote({
            keys: [midiToVexKey(note.midi)],
            duration: vexBaseDur(note.dur),
            auto_stem: true,
          }).setStyle({ fillStyle: color, strokeStyle: color })
          if (note.dotted) Dot.buildAndAttach([sn], { all: true })
          return sn
        })

        // Collect triplet groups within this line
        const tripletMap = new Map()
        lineNotes.forEach((note, i) => {
          if (note.tripletGroup !== undefined) {
            if (!tripletMap.has(note.tripletGroup)) tripletMap.set(note.tripletGroup, [])
            tripletMap.get(note.tripletGroup).push(staveNotes[i])
          }
        })
        const tuplets = [...tripletMap.values()].map(group =>
          new Tuplet(group, { num_notes: 3, notes_occupied: 2, ratioed: false })
        )

        // Beams for non-triplet eighth/sixteenth notes
        const beamable = staveNotes.filter((_, i) => lineNotes[i].tripletGroup === undefined)
        const beams = Beam.generateBeams(beamable)

        const voice = new Voice().setMode(Voice.Mode.SOFT)
        voice.addTickables(staveNotes)
        new Formatter().joinVoices([voice]).format([voice], noteAreaWidth)
        voice.draw(ctx, stave)
        beams.forEach(b => b.setContext(ctx).draw())
        tuplets.forEach(t => t.setContext(ctx).draw())
      }

      // Recolour anything VexFlow drew in black
      el.querySelectorAll('svg path, svg rect, svg text').forEach(node => {
        if (node.getAttribute('fill') === 'black') node.setAttribute('fill', color)
        if (node.getAttribute('stroke') === 'black') node.setAttribute('stroke', color)
      })
    } catch (e) {
      console.error('Notation render error:', e)
    }
  }, [bug])

  return <div ref={containerRef} className="notation-wrap" />
}
