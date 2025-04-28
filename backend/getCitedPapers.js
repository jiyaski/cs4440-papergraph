
const express = require('express');
const router = express.Router();
const driver = require('./neo4j');


/**
 * GET /papers/graph?paperIds=ID1,ID2,...&limit=N
 * returns { edges: [{ citing, cited }], nodes: [{ id, title, doi, type, cited_by_count, authors }, …] }
 */
router.get('/', async (req, res) => {

    const raw = req.query.paperIds;
    const rawLimit = req.query.limit; 
    if (!raw) {
        return res.status(400).json({ error: 'paperIds query parameter is required' });
    }
    if (!rawLimit) {
        return res.status(400).json({ error: 'limit query parameter is required' });
    }

    const paperIds = raw.split(',') .map(id => id.trim()) .filter(id => id);
    const limit = parseInt(rawLimit, 10); 

    if (paperIds.length === 0) {
        return res.status(400).json({ error: 'must have at least one paperId' });
    }

    const session = driver.session();
    try {
        const cypher = `
            MATCH (src:paper)
            WHERE src.id IN $paperIds

            // find and group each cited paper with its authors
            MATCH (src)-[:cites]->(dst:paper)
            OPTIONAL MATCH (dst)-[:has_author]->(a:author)
            WITH src, dst, collect(DISTINCT a.name) AS authors

            // build list of references per source
            WITH src, collect({
                citing: src.id,
                cited: dst.id,
                node: dst {
                    .id,
                    .title,
                    .doi,
                    .type,
                    .cited_by_count,
                    authors: authors
                }
            }) AS refs

            // limit per source
            WITH refs[0..$limit] AS limitedRefs
            UNWIND limitedRefs AS r
            RETURN r.citing AS citing, r.cited AS cited, r.node AS node
        `;
        const result = await session.run(cypher, { paperIds, limit });

        const edges = [];
        const nodesMap = new Map();

        for (const record of result.records) {
            const citing = record.get('citing');
            const cited  = record.get('cited');
            const node   = record.get('node');

            edges.push({ citing, cited });
            if (!nodesMap.has(cited)) {
                nodesMap.set(cited, node);
            }
        }

        res.json({
            edges,
            nodes: Array.from(nodesMap.values())
        });

    } catch (err) {
        console.error('Error in /get-cited-papers endpoint: ', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        await session.close();
    }
});

module.exports = router;
