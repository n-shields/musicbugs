import { useEffect, useRef, useState, useMemo } from 'react'
import { drawBug, bugHue } from '../bugDraw'
import { playBug } from '../audio'
import Notation from './Notation'
import { SCALES, rootNoteName } from '../scales'

export default function Bug({ bug, onSelect }) {
  const canvasRef  = useRef(null)
  const stopRef    = useRef(null)
  const lastTapRef = useRef(0)

  // Full ancestry chain ending at the current bug
  const lineage = useMemo(() => [...(bug.ancestors || []), bug], [bug])
  const [viewIdx, setViewIdx] = useState(lineage.length - 1)

  // Reset to latest when the bug prop changes (new generation shown)
  useEffect(() => { setViewIdx(lineage.length - 1) }, [bug.id])

  const displayBug = lineage[viewIdx]
  const hue = bugHue(displayBug)

  useEffect(() => {
    if (canvasRef.current) drawBug(canvasRef.current, displayBug)
  }, [displayBug])

  function handleMouseEnter() {
    stopRef.current?.()
    stopRef.current = playBug(displayBug)
  }
  function handleMouseLeave() {
    stopRef.current?.()
    stopRef.current = null
  }
  function handleClick() {
    stopRef.current?.()
    stopRef.current = null
    onSelect(displayBug)
  }

  function handlePointerDown(e) {
    if (e.pointerType !== 'touch') return
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      e.preventDefault()
      stopRef.current?.()
      stopRef.current = null
      lastTapRef.current = 0
      onSelect(displayBug)
    } else {
      stopRef.current?.()
      stopRef.current = playBug(displayBug)
      lastTapRef.current = now
    }
  }

  function stepView(delta, e) {
    e.stopPropagation()
    setViewIdx(i => Math.max(0, Math.min(lineage.length - 1, i + delta)))
  }

  return (
    <div
      className="bug-card"
      style={{ '--hue': hue }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
    >
      <canvas ref={canvasRef} width={320} height={320} className="bug-canvas" />
      <div className="bug-lsystem">
        <div className="ls-meta">
          <div className="ls-lineage">
            <button
              className="iter-btn"
              disabled={viewIdx === 0}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => stepView(-1, e)}
            >◀</button>
            <span className="ls-gen">gen {displayBug.gen}</span>
            <button
              className="iter-btn"
              disabled={viewIdx === lineage.length - 1}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => stepView(1, e)}
            >▶</button>
          </div>
          <span className="ls-hint ls-hint-mouse">hover · click to evolve</span>
          <span className="ls-hint ls-hint-touch">tap · double-tap to evolve</span>
        </div>
        <div className="ls-row">
          <span className="ls-key">scale</span>
          <span className="ls-val">{rootNoteName(displayBug.rootPitch ?? 60)} {SCALES[displayBug.scaleIdx ?? 0].name}</span>
        </div>
        <div className="ls-row">
          <span className="ls-key">axiom</span>
          <span className="ls-val">{displayBug.axiom}</span>
        </div>
        {Object.entries(displayBug.rules).map(([k, v]) => (
          <div key={k} className="ls-row">
            <span className="ls-key">{k} →</span>
            <span className="ls-val">{v}</span>
          </div>
        ))}
      </div>
      <Notation bug={displayBug} />
    </div>
  )
}
