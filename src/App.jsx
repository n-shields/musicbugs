import { useState, useEffect } from 'react'
import Bug from './components/Bug'
import { SEEDS, mutate } from './lsystem'
import { resumeAudio } from './audio'

export default function App() {
  const [bugs, setBugs] = useState(SEEDS)
  const [past,   setPast]   = useState([])
  const [future, setFuture] = useState([])
  const [audioReady, setAudioReady] = useState(false)

  useEffect(() => {
    function unlock() {
      resumeAudio()
      setAudioReady(true)
      window.removeEventListener('pointerdown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  function handleSelect(bug) {
    setPast(p => [...p, bugs])
    setFuture([])
    setBugs(mutate(bug))
  }

  function handleBack() {
    if (past.length === 0) return
    setFuture(f => [bugs, ...f])
    setBugs(past[past.length - 1])
    setPast(p => p.slice(0, -1))
  }

  function handleForward() {
    if (future.length === 0) return
    setPast(p => [...p, bugs])
    setBugs(future[0])
    setFuture(f => f.slice(1))
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">musicbugs</h1>
        <div className="app-nav">
          {!audioReady && <span className="audio-hint">click a bug to enable audio</span>}
          <button className="nav-btn" disabled={past.length === 0}   onClick={handleBack}>←</button>
          <button className="nav-btn" disabled={future.length === 0} onClick={handleForward}>→</button>
        </div>
      </header>
      <div className="bug-grid">
        {bugs.map(bug => (
          <Bug key={bug.id} bug={bug} onSelect={handleSelect} />
        ))}
      </div>
    </div>
  )
}
