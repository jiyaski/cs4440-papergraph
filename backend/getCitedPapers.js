const express = require('express');
const driver  = require('./neo4j');
const router  = express.Router();

router.get('/', async (req, res) => {
  const rawIds = req.query.paperIds;
  if (!rawIds) {
    return res.status(400).json({ error: 'paperIds query parameter is required' });
  }
  const paperIds = rawIds.split(',').map(id => id.trim());
  const limit    = parseInt(req.query.limit, 10) || 20;
  const session  = driver.session();

  try {
    const result = await session.run(
      `
      CALL {
        MATCH (src:paper)-[:cites]->(dst:paper)
        WHERE src.id IN $paperIds
        RETURN src, dst
        UNION
        MATCH (src:paper)-[:cites]->(dst:paper)
        WHERE dst.id IN $paperIds
        RETURN src, dst
      }

      OPTIONAL MATCH (src)-[:has_author]->(a1:author)
      WITH src, dst, collect(DISTINCT a1.name) AS srcAuthors

      OPTIONAL MATCH (dst)-[:has_author]->(a2:author)
      WITH src, dst, srcAuthors, collect(DISTINCT a2.name) AS dstAuthors

      RETURN
        src {
          .id,
          .title,
          .doi,
          .type,
          .cited_by_count,
          authors: srcAuthors,
          keywords: src.keywords,
          referenced_works: src.referenced_works
        } AS citingNode,
        dst {
          .id,
          .title,
          .doi,
          .type,
          .cited_by_count,
          authors: dstAuthors,
          keywords: dst.keywords,
          referenced_works: dst.referenced_works
        } AS citedNode
      LIMIT toInteger($limit)
      `,
      { paperIds, limit }
    );

    const nodesMap = new Map();
    const edges    = [];

    result.records.forEach(rec => {
      const src = rec.get('citingNode');
      const dst = rec.get('citedNode');
      edges.push({ citing: src.id, cited: dst.id });
      nodesMap.set(src.id, src);
      nodesMap.set(dst.id, dst);
    });

    res.json({
      edges,
      nodes: Array.from(nodesMap.values())
    });
  } catch (err) {
    console.error('Error in /get-cited-papers:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await session.close();
  }
});

module.exports = router;
