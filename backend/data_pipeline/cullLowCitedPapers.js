
const neo4j = require('neo4j-driver');
const driver = require('../neo4j');

const MIN_CITED_BY_COUNT = 5;  // delete papers with cited_by_count less than this value
const BATCH_SIZE = 500;         // max papers to delete per batch


async function deleteLowCitedPapers() {
    let totalDeleted = 0;
    let deletedInBatch;

    // using a fresh session on each batch to avoid neo4j timeout issues 
    do {
        const session = driver.session();
        try {
            const result = await session.executeWrite(tx =>
                tx.run(`
                    MATCH (p:paper)
                    WHERE p.cited_by_count < $minCount
                    WITH p
                    LIMIT $batchSize
                    DETACH DELETE p
                    RETURN count(p) AS deletedCount
                    `, {
                        minCount: neo4j.int(MIN_CITED_BY_COUNT),
                        batchSize: neo4j.int(BATCH_SIZE)
                    }
                )
            );

            deletedInBatch = result.records[0].get('deletedCount').toNumber();
            if (deletedInBatch > 0) {
                totalDeleted += deletedInBatch;
                console.log(
                    `Deleted ${deletedInBatch} papers in this batch ` +
                    `(running total: ${totalDeleted})`
                );
            }

        } catch (err) {
            console.error('Error deleting batch:', err);
            break;
        } finally {
            await session.close();
        }
    } while (deletedInBatch === BATCH_SIZE);


    if (totalDeleted > 0) {
        console.log(`Finished deleting low-cited papers. Total deleted: ${totalDeleted}`);
    } else {
        console.log(`No papers found with cited_by_count < ${MIN_CITED_BY_COUNT}`);
    }


    // count and delete orphaned authors 
    let totalDeletedAuthors = 0;
    let deletedAuthorsInBatch;

    do {
        const session = driver.session();
        try {
            const result = await session.executeWrite(tx =>
                tx.run(`
                    MATCH (a:author)
                    WHERE NOT (a)-[:has_author]-(:paper)
                    WITH a
                    LIMIT $batchSize
                    DETACH DELETE a
                    RETURN count(a) AS deletedCount
                    `,{ batchSize: neo4j.int(BATCH_SIZE) }
                )
            );
            deletedAuthorsInBatch = result.records[0].get('deletedCount').toNumber();
            if (deletedAuthorsInBatch > 0) {
                totalDeletedAuthors += deletedAuthorsInBatch;
                console.log(
                    `Deleted ${deletedAuthorsInBatch} authors in this batch ` +
                    `(running total: ${totalDeletedAuthors})`
                );
            }
        } catch (err) {
            console.error('Error deleting author batch:', err);
            break;
        } finally {
            await session.close();
        }
    } while (deletedAuthorsInBatch === BATCH_SIZE);

    console.log(`Finished deleting orphaned authors. Total deleted: ${totalDeletedAuthors}`);

    await driver.close();
}


deleteLowCitedPapers();