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
  referenced_works: string[];
  cited_by_count: number;

  authors: { name: string }[]; 

  publication?: {
    journal?: string
    volume?: string
    issue?: string
    date?: string
    first_page?: string
    last_page?: string
  }

  topics?: {
    topic: string
    subfield: string
    field: string
    domain: string
  }[]
  full_source?: string 
  primary_topic?: string
}


function App() {
  const [results, setResults] = useState<Paper[]>([]);
  const [edges, setEdges] = useState<{ citing: string; cited: string }[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  //const [hasSearched, setHasSearched] = useState(false);


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


async function handleResults(newResults: Paper[]) {
  setResults(newResults);

  if (newResults.length === 0) {
    setEdges([]);
    return;
  }

  const paperIds = newResults.map((p) => p.id).join(',');
  try {
    const res = await fetch(`http://localhost:3000/get-cited-papers?paperIds=${paperIds}&limit=20`);
    if (!res.ok) throw new Error('Failed to fetch cited papers');
    const data = await res.json();
    console.log('Fetched cited papers data:', data);

    const citedNodes = data.nodes || [];
    const citedEdges = data.edges || [];

    const allNodeMap = new Map<string, Paper>();
    newResults.forEach((p) => allNodeMap.set(p.id, p));
    citedNodes.forEach((p: Paper) => allNodeMap.set(p.id, p));

    citedEdges.forEach((e: { citing: string; cited: string }) => {
      if (!allNodeMap.has(e.citing)) {
        allNodeMap.set(e.citing, {
          id: e.citing,
          title: 'Unknown',
          type: 'paper',
          cited_by_count: 0,
          doi: '',
          full_text_url: '',
          keywords: [],
          referenced_works: [],
          authors: [],
        });
      }
    });
  
    setResults(Array.from(allNodeMap.values())); 
    setEdges(citedEdges); 
  } catch (error) {
    console.error('Error fetching cited papers:', error);
    setEdges([]);
  }
}

  return (
    <div className="app-root">
      <header className="header">
        <h1 className="title">Research Paper Graph Exploration</h1>
        <Search onResults={handleResults} />
      </header>

      <div className="main-container">
        <div className="main-left" id="graph-pane">
          <Graph
            nodes={results}
            edges={edges}
            onSelectPaper={setSelectedPaper}
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
