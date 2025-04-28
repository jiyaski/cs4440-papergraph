const express = require('express');
const neo4j = require('./neo4j.js');

const router = express.Router();

router.get('/', async (req, res) => {
  const session = neo4j.session();
  
  try {
    const paperIdsParam = req.query.paperIds;
    const limitParam = req.query.limit || 50;

    if (!paperIdsParam) {
      return res.status(400).json({ error: 'paperIds query parameter is required.' });
    }

    const paperIds = paperIdsParam.split(',');

    const query = `MATCH (src:paper)-[:cites]->(dst:paper) WHERE dst.id IN $paperIds RETURN src.id AS citing, dst.id AS cited, src LIMIT toInteger($limit)`;

    const result = await session.run(query, {
      paperIds,
      limit: parseInt(limitParam)
    });

    const edges = [];
    const nodes = new Map();

    result.records.forEach(record => {
      const citingId = record.get('citing');
      const citedId = record.get('cited');
      const citedNode = record.get('src').properties;
      edges.push({ citing: citingId, cited: citedId });
      nodes.set(citedId, citedNode);
    });

    res.json({
      edges,
      nodes: Array.from(nodes.values())
    });
  } catch (error) {
    console.error('Error fetching cited papers:', error);
    res.status(500).json({ error: 'Failed to fetch cited papers.' });
  } finally {
    await session.close();
  }
});

module.exports = router;
