import { useState } from 'react'
import { Paper } from '../App'
import '../styles/Search.css'

interface SearchProps {
  onResults: (results: Paper[]) => void
}


export default function Search({ onResults }: SearchProps) {
  const [keywordQuery, setKeywordQuery] = useState('')
  const [authorQuery, setAuthorQuery] = useState('')

  const handleSearch = async () => {
    const keyword = keywordQuery.trim()
    const author = authorQuery.trim()

    if (!keyword && !author) return

    const url = new URL('http://localhost:3000/papers/search')
    if (keyword) {
      url.searchParams.set('q', keyword)
    }
    if (author) {
      url.searchParams.set('author', author)
    }

    try {
      const res = await fetch(url.toString())
      console.log('Sent request to:', url.toString())
      if (!res.ok) throw new Error('Search failed')

      const data = await res.json()
      console.log('Received data:', data)

      onResults(data)
    } catch (err) {
      console.error('Search error:', err)
      onResults([])
    }
  }

  return (
    <div className="search-bar">
      <input
        type="text"
        className="search-input"
        placeholder="Search papers by keyword..."
        value={keywordQuery}
        onChange={(e) => setKeywordQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
      />
      <button className="search-button" onClick={handleSearch}>
        Search
      </button>
      <input
        type="text"
        className="search-input"
        placeholder="Search papers by author..."
        value={authorQuery}
        onChange={(e) => setAuthorQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
      />
      <button className="search-button" onClick={handleSearch}>
        Search
      </button>
    </div>
  )
}
