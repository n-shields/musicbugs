import { useState } from 'react'
import Bug from './components/Bug'
import { SEEDS, mutate } from './lsystem'

export default function App() {
  const [bugs, setBugs] = useState(SEEDS)
  const [history, setHistory] = useState([])

  function handleSelect(bug) {
    setHistory(h => [...h, bugs])
    setBugs(mutate(bug))
  }

  function handleBack() {
    if (history.length === 0) return
    setBugs(history[history.length - 1])
    setHistory(h => h.slice(0, -1))
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">musicbugs</h1>
        <div className="app-nav">
          {history.length > 0 && (
            <button className="back-btn" onClick={handleBack}>← back</button>
          )}
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
