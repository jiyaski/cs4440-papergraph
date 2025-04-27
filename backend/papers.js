// Returns a list of papers whose title/keywords and/or authors contain the respective search query.
// Defines GET /papers/search?q=keyword_query, /papers/search?author=author_query, or /papers/search?q=keyword_query&author=author_query

const express = require('express');
const router = express.Router();
const driver = require('./neo4j');

router.get('/search', async (req, res) => {
    const query = req.query.q?.toLowerCase();
    const author = req.query.author?.toLowerCase();

    if (!query && !author) {
        return res.status(400).json({ error: 'Provide at least one search query: "q" or "author"' });
    }

    const session = driver.session();
    try {
        const cypherParts = [];
        const params = {};

        let cypher = `MATCH (p:paper)`;

        if (author) {
            cypher += `-[:has_author]->(a:author)`;
            cypherParts.push(`toLower(a.name) CONTAINS $author`);
            params.author = author;
        }

        if (query) {
            cypherParts.push(`
                toLower(p.title) CONTAINS $query OR
                ANY(kw IN p.keywords WHERE toLower(kw) CONTAINS $query)
            `);
            params.query = query;
        }

        if (cypherParts.length > 0) {
            cypher += `\nWHERE ` + cypherParts.join(' AND ');
        }

        cypher += `\nOPTIONAL MATCH (p)-[:cites]->(cited:paper) RETURN DISTINCT p, collect(cited.id) AS referenced_works ORDER BY p.cited_by_count DESC LIMIT 15`;

        const result = await session.run(cypher, params);
        const papers = result.records.map(r => {
            const paper = r.get('p').properties;
            const refs = r.get('referenced_works');
            return {
                ...paper,
                referenced_works: refs.filter(id => id !== null)
            };
        })
        res.json(papers); //returns properties of the paper node as a json
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        await session.close();
    }
});


// GET /papers/:id — returns full metadata for a specific paper, including all paper properties + author names & venues
router.get('/:id', async (req, res) => {
    const session = driver.session();
    const id = req.params.id;

    try {
        const result = await session.run(`
            MATCH (p:paper {id: $id})
            OPTIONAL MATCH (p)-[:has_author]->(a:author)
            OPTIONAL MATCH (p)-[:published_in]->(v:venue)
            RETURN p, collect(a.name) AS authors, v.name AS venue
        `, { id });

        if (result.records.length === 0) {
            return res.status(404).json({ error: 'Paper not found' });
        }

        const paper = result.records[0].get('p').properties;
        paper.authors = result.records[0].get('authors');
        paper.venue = result.records[0].get('venue');
        res.json(paper);
    } catch (err) {
        console.error('Error fetching paper details:', err);
        res.status(500).json({ error: 'Failed to fetch paper' });
    } finally {
        await session.close();
    }
});


module.exports = router;