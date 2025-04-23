import { useState } from 'react'
import { Paper } from '../App'
import '../styles/Search.css'

interface SearchProps {
  onResults: (results: Paper[]) => void
  onSearch: () => void
}

/* const sampleData: Paper[] = [
  {
    id: '1',
    title: 'Aero-Puff Dynamics',
    doi: '10.xxxx/abc123',
    type: 'journal-article',
    full_text_url: 'https://example.com/full.pdf',
    keywords: ['airplanes', 'planes', 'aero-puff', 'dynamics'],
    abstract_inverted_index: {
      Dynamics: [0], makes: [1], plane: [2], go: [3], kachow: [3]
    },
    authors: [
      { name: 'Lightning McQueen', affiliation: ['University of Radiator Springs'] }
    ],
    publication: {
      journal: 'Journal of Fluff Engineering',
      volume: '88',
      issue: '9',
      date: '2023-11-03',
      first_page: '12',
      last_page: '31'
    },
    citations: {
      count: 6,
      referenced_works: ['2']
    },
    topics: [
      {
        topic: 'Aero-puff dynamics',
        subfield: 'Dynamics',
        field: 'Aerospace Engineering',
        domain: 'Engineering'
      }
    ]
  },
  {
    id: '2',
    title: 'Wings and Things',
    doi: '10.xxxx/abc123',
    type: 'journal-article',
    full_text_url: 'https://example.com/full.pdf',
    keywords: ['airplanes', 'planes', 'wings'],
    abstract_inverted_index: {
      Can: [0], you: [1], help: [2], me: [3], find: [4], the: [5], wings:[6]
    },
    authors: [
      { name: 'Dora the Explorer', affiliation: ['Dora Institute of Technology'] }
    ],
    publication: {
      journal: 'The Aerofluff Institute',
      volume: '42',
      issue: '1',
      date: '2022-02-14',
      first_page: '88',
      last_page: '102'
    },
    citations: {
      count: 3,
      referenced_works: []
    },
    topics: [
      {
        topic: 'Wings',
        subfield: 'Dynamics',
        field: 'Aerospace Engineering',
        domain: 'Engineering'
      }
    ]
  },
  {
    id: '3',
    title: 'How to Fly',
    doi: '10.xxxx/abc123',
    type: 'journal-article',
    full_text_url: 'https://example.com/full.pdf',
    keywords: ['airplanes', 'planes', 'fly'],
    abstract_inverted_index: {
      Elmo: [0], wants: [1], to: [2], flyyyy: [3]
    },
    authors: [
      { name: 'Elmo', affiliation: ['Sesame Street University'] }
    ],
    publication: {
      journal: 'Guide of Elmo',
      volume: '3',
      issue: '7',
      date: '2021-09-09',
      first_page: '210',
      last_page: '229'
    },
    citations: {
      count: 5,
      referenced_works: []
    },
    topics: [
      {
        topic: 'Flying',
        subfield: 'Air Transportation',
        field: 'Transportation',
        domain: 'Transportation'
      }
    ]
  },
  {
    id: '4',
    title: 'Plane Crazy ',
    doi: '10.xxxx/abc123',
    type: 'journal-article',
    full_text_url: 'https://example.com/full.pdf',
    keywords: ['planes', 'plane', 'fuel'],
    abstract_inverted_index: {
      Fuel: [0], curves: [1], show: [2], crazy: [3], thrust: [4], variance: [5]
    },
    authors: [
      { name: 'Dr. Minnie Mouse', affiliation: ['College of Mickey Mouse Clubhouse'] }
    ],
    publication: {
      journal: 'Fake Flight Letters',
      volume: '21',
      issue: '5',
      date: '2023-05-26',
      first_page: '300',
      last_page: '315'
    },
    citations: {
      count: 1,
      referenced_works: []
    },
    topics: [
      {
        topic: 'Fuel types',
        subfield: 'Fuel Efficiency',
        field: 'Aerospace Engineering',
        domain: 'Engineering'
      }
    ]
  }
] */


export default function Search({ onResults, onSearch }: SearchProps) {
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
      console.log('📡 Sent request to:', url.toString())
      if (!res.ok) throw new Error('Search failed')

      const data = await res.json()
      console.log('Received data:', data)

      onResults(data)
      onSearch()
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
