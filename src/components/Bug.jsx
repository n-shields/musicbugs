import { useEffect, useRef } from 'react'
import { drawBug, bugHue } from '../bugDraw'
import { playBug } from '../audio'
import Notation from './Notation'
import { SCALES, rootNoteName } from '../scales'

export default function Bug({ bug, onSelect }) {
  const canvasRef = useRef(null)
  const stopRef = useRef(null)
  const lastTapRef = useRef(0)

  useEffect(() => {
    if (canvasRef.current) drawBug(canvasRef.current, bug)
  }, [bug])

  function handleMouseEnter() {
    stopRef.current?.()
    stopRef.current = playBug(bug)
  }

  function handleMouseLeave() {
    stopRef.current?.()
    stopRef.current = null
  }

  function handleClick() {
    stopRef.current?.()
    stopRef.current = null
    onSelect(bug)
  }

  // Touch: single tap = play, double-tap = evolve
  function handlePointerDown(e) {
    if (e.pointerType !== 'touch') return
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      e.preventDefault()
      stopRef.current?.()
      stopRef.current = null
      lastTapRef.current = 0
      onSelect(bug)
    } else {
      stopRef.current?.()
      stopRef.current = playBug(bug)
      lastTapRef.current = now
    }
  }

  const hue = bugHue(bug)

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
          <span className="ls-gen">gen {bug.gen}</span>
          <span className="ls-hint ls-hint-mouse">hover · click to evolve</span>
          <span className="ls-hint ls-hint-touch">tap · double-tap to evolve</span>
        </div>
        <div className="ls-row">
          <span className="ls-key">scale</span>
          <span className="ls-val">{rootNoteName(bug.rootPitch ?? 60)} {SCALES[bug.scaleIdx ?? 0].name}</span>
        </div>
        <div className="ls-row">
          <span className="ls-key">axiom</span>
          <span className="ls-val">{bug.axiom}</span>
        </div>
        {Object.entries(bug.rules).map(([k, v]) => (
          <div key={k} className="ls-row">
            <span className="ls-key">{k} →</span>
            <span className="ls-val">{v}</span>
          </div>
        ))}
      </div>
      <Notation bug={bug} />
    </div>
  )
}
