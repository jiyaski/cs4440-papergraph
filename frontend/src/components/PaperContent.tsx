import '../styles/PaperContent.css'
import { Paper } from '../App'

interface PaperDetailsProps {
  paper: Paper | null
}

export default function PaperContent({ paper }: PaperDetailsProps) {
  if (!paper) return <div className="paper-content">Select a paper to see details.</div>

  return (
    <div className="paper-content">
      <h2 className="paper-title">{paper.title}</h2>

      <p className="paper-meta">
        <strong>Authors:</strong>{' '}
        {paper.authors.map((a) => `${a.name} (${a.affiliation?.join(', ') || 'N/A'})`).join('; ')}
      </p>

      <p className="paper-meta">
        <strong>Published In:</strong>{' '}
        {paper.publication.journal || 'Unknown'} ({paper.publication.date})
      </p>

      <p className="paper-meta">
        <strong>Pages:</strong>{' '}
        {paper.publication.first_page} – {paper.publication.last_page}
      </p>

      <p className="paper-meta">
        <strong>DOI:</strong>{' '}
        {paper.doi ? (
          <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer">
            {paper.doi}
          </a>
        ) : 'N/A'}
      </p>

      <p className="paper-meta">
        <strong>Full Text:</strong>{' '}
        {paper.full_text_url ? (
          <a href={paper.full_text_url} target="_blank" rel="noreferrer">
            View PDF
          </a>
        ) : 'Unavailable'}
      </p>

      <p className="paper-meta">
        <strong>Citations:</strong> {paper.citations.count}
      </p>

      <p className="paper-meta">
        <strong>Keywords:</strong> {paper.keywords?.join(', ') || 'None'}
      </p>

      {paper.topics?.length > 0 && (
        <div className="paper-meta">
          <strong>Topics:</strong>
          <ul style={{ marginLeft: '1rem', marginTop: '0.25rem' }}>
            {paper.topics.map((t, idx) => (
              <li key={idx}>
                {t.topic} — {t.subfield}, {t.field}, {t.domain}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
