
/**
 * This file is meant to be run only once. It creates uniqueness constraints for various node names, 
 * which also causes Neo4j to build indexes on those names. This makes the `MERGE` statements in the 
 * `openalex_import.js` script run significantly faster. 
 */



const driver = require('./neo4j.js');

async function createConstraints() {
  const session = driver.session();
  const statements = [
    `CREATE CONSTRAINT IF NOT EXISTS FOR (p:paper)    REQUIRE p.id   IS UNIQUE`,
    `CREATE CONSTRAINT IF NOT EXISTS FOR (a:author)   REQUIRE a.name IS UNIQUE`,
    `CREATE CONSTRAINT IF NOT EXISTS FOR (i:institution) REQUIRE i.name IS UNIQUE`,
    `CREATE CONSTRAINT IF NOT EXISTS FOR (v:venue)    REQUIRE v.name IS UNIQUE`,
    `CREATE CONSTRAINT IF NOT EXISTS FOR (d:domain)   REQUIRE d.name IS UNIQUE`,
    `CREATE CONSTRAINT IF NOT EXISTS FOR (f:field)    REQUIRE f.name IS UNIQUE`,
    `CREATE CONSTRAINT IF NOT EXISTS FOR (s:subfield) REQUIRE s.name IS UNIQUE`,
    `CREATE CONSTRAINT IF NOT EXISTS FOR (t:topic)    REQUIRE t.name IS UNIQUE`
  ];

  try {
    for (const stmt of statements) {
      await session.executeWrite(tx => tx.run(stmt));
    }
    console.log('All constraints are now in place (or already existed).');
  } catch (err) {
    console.error('Failed to create constraints:', err);
  } finally {
    await session.close();
    await driver.close();
  }
}

createConstraints().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});