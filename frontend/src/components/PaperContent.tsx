import '../styles/PaperContent.css'
import { Paper } from '../App'

interface PaperDetailsProps {
  paper: Paper | null
}

function reconstruct(index: Record<string, number[]>): string {
  const positions: string[] = [];
  for (const [word, idxs] of Object.entries(index)) {
    idxs.forEach(position => {
      positions[position] = word;
    });
  }
  return positions.join(' ');
}


export default function PaperContent({ paper }: PaperDetailsProps) {
  
  if (!paper) return <div className="paper-content">Select a paper to see details.</div>

    return (
      <div className="paper-content">
        <h2 className="paper-title">{paper.title}</h2>
  
        <p className="paper-meta">
          <strong>Authors:</strong>{' '}
          {paper.authors.map((author, idx) => (
            <span key={idx}>
              {(typeof author === 'string' ? author : author?.name) || "Unknown"}
              {idx !== paper.authors.length - 1 && "; "}
            </span>
          ))}
        </p>
  
        <p className="paper-meta">
          <strong>Publication Data:</strong>{' '}
          {paper.publication?.journal || 'Unknown'} {paper.publication?.date ? `(${paper.publication.date})` : ''}
        </p>
  
        <p className="paper-meta">
          <strong>Pages:</strong>{' '}
          {paper.publication?.first_page && paper.publication?.last_page
            ? `${paper.publication.first_page}-${paper.publication.last_page}`
            : 'N/A'}
        </p>
  
        <p className="paper-meta">
          <strong>DOI:</strong>{' '}
          {paper.doi ? (
            <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer">
              {paper.doi}
            </a>
          ) : 'Unavailable'}
        </p>
  
        <p className="paper-meta">
          <strong>Full Text:</strong>{' '}
          {paper.full_source ? (
            <a href={paper.full_source} target="_blank" rel="noreferrer">
              View Full Text
            </a>
          ) : 'Unavailable'}
        </p>
  
        <p className="paper-meta">
          <strong>Citations:</strong> {paper.cited_by_count ?? 0}
        </p>
  
        <p className="paper-meta">
          <strong>Keywords:</strong>{' '}
          {paper.keywords && paper.keywords.length > 0 ? paper.keywords.join(', ') : 'None'}
        </p>
  
        {paper.primary_topic && (
          <p className="paper-meta">
            <strong>Primary Topic:</strong> {paper.primary_topic || 'Unknown'}
          </p>
        )}

        <div className="paper-meta">
          <strong>Abstract:</strong> 
          {paper.abstract_inverted_index ? (
            <p>{reconstruct(JSON.parse(paper.abstract_inverted_index))}</p>
          ) : (
            <p className="text-gray-400">Abstract unavailable.</p>
          )}
        </div>

      </div>
    )
  }  
