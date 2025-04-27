const driver = require('../neo4j');

const MIN_CITED_BY_COUNT = 5;  // delete papers with cited_by_count less than this value


async function deleteLowCitedPapers() {
    const session = driver.session();
    try {

        // Count and delete low-cited papers
        const countResult = await session.run(
            'MATCH (p:paper) WHERE p.cited_by_count < $minCount RETURN count(p) AS toDelete',
            { minCount: MIN_CITED_BY_COUNT }
        );
        const papersToDelete = countResult.records[0].get('toDelete').toNumber();

        if (papersToDelete > 0) {
            await session.run(
                'MATCH (p:paper) WHERE p.cited_by_count < $minCount DETACH DELETE p',
                { minCount: MIN_CITED_BY_COUNT }
            );
            console.log(`Deleted ${papersToDelete} papers with cited_by_count < ${MIN_CITED_BY_COUNT}`);
        } else {
            console.log(`No papers found with cited_by_count < ${MIN_CITED_BY_COUNT}`);
        }


        // Count and delete orphaned authors
        const orphanResult = await session.run(
            'MATCH (a:author) WHERE NOT (a)-[:AUTHORED]->(:paper) RETURN count(a) AS toDelete'
        );
        const authorsToDelete = orphanResult.records[0].get('toDelete').toNumber();

        if (authorsToDelete > 0) {
            await session.run(
                'MATCH (a:author) WHERE NOT (a)-[:AUTHORED]->(:paper) DETACH DELETE a'
            );
            console.log(`Deleted ${authorsToDelete} orphaned authors`);
        } else {
            console.log('No orphaned authors found.');
        }


    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await session.close();
        await driver.close();
    }
}

deleteLowCitedPapers();
