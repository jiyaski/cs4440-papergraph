require('dotenv').config();
const fs = require('fs');
const driver = require('./neo4j.js');

async function importPapersBatch(papersBatch) {
  const session = driver.session();
  try {
    await session.executeWrite(tx =>
      tx.run(
        `
        UNWIND $batch AS paper

        // create/update the paper node
        MERGE (p:paper {id: paper.id})
        SET p.doi                  = paper.doi,
            p.title                = paper.title,
            p.type                 = paper.type,
            p.cited_by_count       = paper.cited_by_count,
            p.is_open_access       = paper.is_open_access,
            p.full_source          = paper.full_source,
            p.keywords             = paper.keywords,
            p.abstract_inverted_index = paper.abstract_inverted_index

        // publication/venue relationship
        FOREACH (_ IN CASE WHEN paper.publication.journal IS NOT NULL THEN [1] ELSE [] END |
          MERGE (v:venue {name: paper.publication.journal})
          MERGE (p)-[r:published_in]->(v)
          SET r.date       = paper.publication.date,
              r.volume     = paper.publication.volume,
              r.issue      = paper.publication.issue,
              r.first_page = paper.publication.first_page,
              r.last_page  = paper.publication.last_page
        )

        // authors + affiliations
        FOREACH (aData IN paper.authors |
          MERGE (a:author {name: aData.name})
          MERGE (p)-[:has_author]->(a)
          FOREACH (aff IN aData.affiliation | 
            MERGE (i:institution {name: aff})
            MERGE (a)-[:affiliated_with]->(i)
          )
        )

        // topic hierarchy
        FOREACH (_ IN CASE WHEN paper.primary_topic IS NOT NULL THEN [1] ELSE [] END |
          MERGE (d:domain {name: paper.primary_topic.domain})
          MERGE (f:field {name: paper.primary_topic.field})-[:belongs_to]->(d)
          MERGE (s:subfield {name: paper.primary_topic.subfield})-[:belongs_to]->(f)
          MERGE (tp:topic {name: paper.primary_topic.topic})-[:belongs_to]->(s)
          MERGE (p)-[:has_topic]->(tp)
        )

        // citations edges
        FOREACH (refId IN paper.referenced_works |
          MERGE (citing:paper {id: paper.id})
          MERGE (cited:paper  {id: refId})
          MERGE (citing)-[:cites]->(cited)
        )
        `,
        { batch: papersBatch }
      )
    );
  } finally {
    await session.close();
  }
}

async function main() {
  const inputFile  = 'data/papers.jsonl';
  const failedFile = 'data/failed_papers.jsonl';
  const BATCH_SIZE = 20;
  const failed = [];

  if (!fs.existsSync(inputFile)) {
    console.log('No input file found.');
    return;
  }

  const lines = fs.readFileSync(inputFile, 'utf-8').split('\n').filter(Boolean);

  // parse and prepare in-memory
  const papers = lines.map(line => {
    const p = JSON.parse(line);
    return {
      id: p.id,
      doi: p.doi,
      title: p.title,
      type: p.type,
      cited_by_count: p.citations.count,
      is_open_access: p.full_text_url !== null,
      full_source:     p.full_text_url,
      keywords:        p.keywords.join(', '),
      abstract_inverted_index: p.abstract_inverted_index
                                 ? JSON.stringify(p.abstract_inverted_index)
                                 : null,
      publication:     p.publication || {},
      authors:         p.authors || [],
      primary_topic:   primary_topic || null, 
      referenced_works:p.citations.referenced_works || []
    };
  });


  for (let i = 0; i < papers.length; i += BATCH_SIZE) {
    const batch = papers.slice(i, i + BATCH_SIZE);
    try {
      await importPapersBatch(batch);
      console.log(`Imported batch ${i}-${i + batch.length - 1}`);
    } catch (err) {
      console.error(`Batch ${i}-${i + batch.length - 1} failed:`, err);
      failed.push(...lines.slice(i, i + batch.length));
    }
  }

  if (failed.length) {
    fs.appendFileSync(failedFile, failed.join('\n') + '\n', 'utf-8');
    console.log(`Appended ${failed.length} failed papers to ${failedFile}`);
  }

  fs.writeFileSync(inputFile, '', 'utf-8');
  console.log('Input file cleared. Import complete.');
  await driver.close();
}

main();
