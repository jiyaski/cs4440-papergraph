import { useState, useEffect } from 'react'
import Search from './components/Search'
import Graph from './components/Graph'
import PaperContent from './components/PaperContent'
import './styles/App.css'

export interface Paper {
  id: string
  title: string
  doi: string
  type: string
  full_text_url: string
  keywords: string[]
  abstract_inverted_index?: string;

  authors: { name: string }[]; 

  publication?: {
    journal?: string
    volume?: string
    issue?: string
    date?: string
    first_page?: string
    last_page?: string
  }

  citations: {
    count: number
    referenced_works: string[]
  }

  topics?: {
    topic: string
    subfield: string
    field: string
    domain: string
  }[]
  full_source?: string 
  cited_by_count?: number
  primary_topic?: string
}

function App() {
  const [results, setResults] = useState<Paper[]>([])
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

useEffect(() => {
  const resizer = document.getElementById('drag-bar')
  const left = document.getElementById('graph-pane')
  const right = document.getElementById('details-pane')

  let isDragging = false

  resizer?.addEventListener('mousedown', (e) => {
    e.preventDefault()
    isDragging = true
    document.body.style.cursor = 'ew-resize'
  })

  window.addEventListener('mousemove', (e) => {
    if (!isDragging || !left || !right) return

    const containerOffsetLeft = left.parentElement!.offsetLeft
    const pointerRelativeXPos = e.clientX - containerOffsetLeft
    const minWidth = 200
    const maxWidth = left.parentElement!.offsetWidth - minWidth

    const newLeftWidth = Math.max(minWidth, Math.min(pointerRelativeXPos, maxWidth))

    left.style.width = `${newLeftWidth}px`
  })

  window.addEventListener('mouseup', () => {
    isDragging = false
    document.body.style.cursor = 'default'
  })

  return () => {
    window.removeEventListener('mousemove', () => {})
    window.removeEventListener('mouseup', () => {})
  }
}, [])



  return (
    <div className="app-root">
      <header className="header">
        <h1 className="title">Research Paper Graph Exploration</h1>
        <Search onResults={setResults} onSearch={() => setHasSearched(true)} />
      </header>

      <div className="main-container">
        <div className="main-left" id="graph-pane">
          <Graph
            data={results}
            onSelectPaper={setSelectedPaper}
            hasSearched={hasSearched}
          />
        </div>

        <div className="resizer" id="drag-bar" />
          <div className="main-right" id="details-pane">
            <PaperContent paper={selectedPaper} />
          </div>
        </div>
    </div>
  )
}

export default App
