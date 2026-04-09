import { useEffect, useRef } from 'react'
import { drawBug, bugHue } from '../bugDraw'
import { playBug } from '../audio'

export default function Bug({ bug, onSelect }) {
  const canvasRef = useRef(null)
  const stopRef = useRef(null)

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

  const hue = bugHue(bug)

  return (
    <div
      className="bug-card"
      style={{ '--hue': hue }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} width={320} height={320} className="bug-canvas" />
      <div className="bug-lsystem">
        <div className="ls-meta">
          <span className="ls-gen">gen {bug.gen}</span>
          <span className="ls-hint">hover · click to evolve</span>
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
    </div>
  )
}
