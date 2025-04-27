
require('dotenv').config();
const driver = require('../neo4j.js');


// input a JSON paper from OpenAlex API and output a condensed JSON representation with only relevant info 
function extractRelevantPaperInfo(paper) {
    return {
        id: paper.id.split('/').pop(),  // extract id from url
        title: paper.title,
        doi: paper.doi,
        type: paper.type,
        authors: (paper.authorships || []).map(auth => ({
            name: auth.author?.display_name,
            affiliation: auth.institutions?.map(inst => inst.display_name)
        })),
        full_text_url: paper.best_oa_location?.url || paper.primary_location?.pdf_url || null,
        publication: {
            date: paper.publication_date,
            journal: paper.primary_location?.source?.display_name || null,
            volume: paper.biblio?.volume || null,
            issue: paper.biblio?.issue || null,
            first_page: paper.biblio?.first_page || null,
            last_page: paper.biblio?.last_page || null
        },
        citations: {
            count: paper.cited_by_count,
            referenced_works: (paper.referenced_works || []).map(ref => ref.split('/').pop()) // id from url
        },
        keywords: (paper.keywords || []).map(k => k.display_name),
        primary_topic: paper.primary_topic ? {
            topic: paper.primary_topic.display_name, 
            subfield: paper.primary_topic.subfield?.display_name, 
            field: paper.primary_topic.field?.display_name, 
            domain: paper.primary_topic.domain?.display_name
        } : null, 
        abstract_inverted_index: paper.abstract_inverted_index 
            ? JSON.stringify(paper.abstract_inverted_index)
            : null
    };
}


// input papers in condensed JSON form and efficiently write them all to Neo4j 
async function importPapersBatch(papersBatch, includeCitations = true) {
    const session = driver.session();
    try {
        let query = `
            UNWIND $batch AS paper

            // create/update the paper node
            MERGE (p:paper {id: paper.id})
            SET p.doi                    = paper.doi,
                p.title                  = paper.title,
                p.type                   = paper.type,
                p.cited_by_count         = paper.cited_by_count,
                p.is_open_access         = paper.is_open_access,
                p.full_source            = paper.full_source,
                p.keywords               = paper.keywords,
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
                SET a.affiliations = aData.affiliation
                MERGE (p)-[:has_author]->(a)
            )

            // topic hierarchy
            FOREACH (_ IN CASE WHEN paper.primary_topic IS NOT NULL THEN [1] ELSE [] END |
                MERGE (d:domain   {name: paper.primary_topic.domain})
                MERGE (f:field    {name: paper.primary_topic.field})
                MERGE (s:subfield {name: paper.primary_topic.subfield})
                MERGE (tp:topic   {name: paper.primary_topic.topic})
                MERGE (f)-[:belongs_to]->(d)
                MERGE (s)-[:belongs_to]->(f)
                MERGE (tp)-[:belongs_to]->(s)
                MERGE (p)-[:has_topic]->(tp)
            )
        `;

        if (includeCitations) {
            query += `
            // citations edges
            FOREACH (refId IN paper.referenced_works |
                MERGE (citing:paper {id: paper.id})
                MERGE (cited:paper  {id: refId})
                MERGE (citing)-[:cites]->(cited)
            )
            `;
        }

        await session.executeWrite(tx =>
            tx.run(query, { batch: papersBatch })
        );
    } finally {
        await session.close();
    }
}


module.exports = {
    extractRelevantPaperInfo,
    importPapersBatch
};