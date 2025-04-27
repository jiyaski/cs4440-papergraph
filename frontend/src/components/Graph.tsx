import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { Paper } from '../App'
import '../styles/App.css'

interface GraphProps {
  data: Paper[]
  onSelectPaper: (paper: Paper) => void
  hasSearched: boolean
}

const typeColorMap: Record<string, string> = {
  'preprint':     'lightblue',
  'article':      '#5555ff',
  'review':       'magenta',
  'book':         'green',
  'book-chapter': 'green',
}

export default function Graph({ data, onSelectPaper, hasSearched }: GraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const gRef = useRef<SVGGElement | null>(null)
  const paperIds = new Set(data.map((d) => d.id));

  useEffect(() => {
    console.log('Graph received data:', data)
    console.log('First paper sample:', data[10]);

    if (!data.length || !svgRef.current || !gRef.current) return

    const svg = d3.select(svgRef.current)
    const g = d3.select(gRef.current)
    svg.selectAll('*').attr('pointer-events', 'all')

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    g.selectAll('*').remove()

    const nodes = data.map((d) => ({ 
      id: d.id, 
      label: d.title, 
      cited_by_count: d.cited_by_count || 0,
      type: d.type,
    }))
    const links = data.flatMap((d) =>
      (d.referenced_works || [])
        .filter((targetId) => paperIds.has(targetId))
        .map((targetId) => ({
          source: d.id,
          target: targetId
        }))
    );
    

    // for sizing nodes based on cited_by_count 
    const radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(nodes, (d) => d.cited_by_count) || 1])
      .range([5, 25])  // min/max radius sizes

    const simulation = d3
      .forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .on('tick', ticked)

    const link = g
      .append('g')
      .attr('stroke', '#ccc')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', 1.5) 
      console.log('Links created:', links.length)


    const node = g
      .append('g')
      .selectAll<SVGCircleElement, any>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d) => radiusScale(d.cited_by_count))  // size nodes based on citation count 
      .attr('fill', (d) => typeColorMap[d.type] || 'orange')  // color nodes based on type 
      .call(
        d3
          .drag<SVGCircleElement, any>()
          .on('start', dragStarted)
          .on('drag', dragged)
          .on('end', dragEnded)
      )
      .on('click', async (_, d) => {
        try {
          const res = await fetch(`http://localhost:3000/papers/${d.id}`);
          if (!res.ok) throw new Error('Failed to fetch paper details');
          const fullPaper = await res.json();
          onSelectPaper(fullPaper);
        } catch (err) {
          console.error('Error fetching paper details:', err);
        }
      })

    const label = g
      .append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text((d) => d.label)
      .attr('font-size', 10)
      .attr('dx', (d) => radiusScale(d.cited_by_count) + 4)
      .attr('dy', '.35em')
      .attr('fill', 'white')

    function ticked() {
      node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y)
      label.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y)
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)
    }

    function dragStarted(event: d3.D3DragEvent<SVGCircleElement, any, any>, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, any, any>, d: any) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragEnded(event: d3.D3DragEvent<SVGCircleElement, any, any>, d: any) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on('zoom', (event) => {
          g.attr('transform', event.transform)
        })
    )
  }, [data, onSelectPaper])

  if (!data.length && hasSearched) {
    return <div className="text-gray-400">No data to display. Try a different search term.</div>
  }

  return (
    <div className="graph-container">
      <svg
        ref={svgRef}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        viewBox="0 0 800 600"
      >
        <g ref={gRef} />
      </svg>
    </div>
  )

}
