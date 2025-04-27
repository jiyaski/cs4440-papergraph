
require('dotenv').config();
const driver = require('../neo4j.js');
const { extractRelevantPaperInfo, importPapersBatch } = require('./shared');

const BATCH_FETCH_SIZE = 100;  // # of papers to retrieve in one OpenAlex API call. Can't exceed 100. 
const MAX_STUBS = 1000;        // # of stub papers to fill on one invocation of this script 
const OPENALEX_BASE = 'https://api.openalex.org/works';
const MAILTO = process.env.VITE_OPENALEX_MAILTO || process.env.OPENALEX_MAILTO;
if (!MAILTO) {
    console.error('Missing OPENALEX_MAILTO in your environment');
    process.exit(1);
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}


async function main() {
    const session = driver.session();
    let noMetadataBatch = false; 
    try {
        // find all stub paper nodes (i.e. ones with no info other than ID) 
        const result = await session.executeRead(tx =>
            tx.run(
                `MATCH (p:paper)
                 WHERE size(keys(p)) = 1  // stubs have only the 'id' key 
                 RETURN p.id AS id
                 LIMIT toInteger($max)`, 
                 { max: MAX_STUBS } 
            )
        );
        const ids = result.records.map(r => r.get('id'));
        console.log(`Found ${ids.length} stub papers.`);
        if (ids.length === 0) { process.exit(1); } 

        // separate into batches 
        const batches = chunkArray(ids, BATCH_FETCH_SIZE);
        for (const batch of batches) {
            // build query string for API call 
            const filterExpr = 'openalex:' + batch.join('|');
            const params = [
                `filter=${encodeURIComponent(filterExpr)}`,
                `per-page=${batch.length}`,
                `mailto=${MAILTO}`,
                `cursor=*`,
            ].join('&');
            const url = `${OPENALEX_BASE}?${params}`;

            let allResults = [];
            let cursor = '*';
            do {
                await sleep(100);  // to stay within OpenAlex's 10req/s API rate limit 
                const pagedUrl = url.replace(/cursor=[^&]*/, `cursor=${cursor}`);
                const res = await fetch(pagedUrl);
                if (!res.ok) {
                    console.error(`  Failed batch fetch (${res.status}): ${res.statusText}`);
                    break;
                }

                const data = await res.json();
                allResults = allResults.concat(data.results || []);
                cursor = data.meta?.next_cursor || null;
            } while (cursor && allResults.length < batch.length);

            if (allResults.length === 0) {
                console.warn(`  No metadata returned for this batch: [${batch.join(', ')}]`);
                // the batch consists solely of "stubborn stubs", which are papers whose IDs have changed so
                // OpenAlex doesn't recognize them in our above calls. It's easiest to just delete them all. 
                await session.executeWrite(tx =>
                    tx.run(
                        `MATCH (p:paper)
                         WHERE p.id IN $ids AND size(keys(p)) = 1
                         DETACH DELETE p`,
                        { ids: batch }
                    )
                );
                console.log(`  Deleted ${batch.length} stub-only nodes`);
                noMetadataBatch = true; 
                break; 
            }

            // delete any stub nodes that truly have no info other than an ID (as returned by OpenAlex) 
            // if we don't do this then they will also keep being recognized as stubs forever 
            const stubOnly = allResults.filter(p => Object.keys(p).length === 1 && p.id); 
            if (stubOnly.length > 0) {
                    const stubIds = stubOnly.map(p => p.id.split('/').pop());
                    await session.executeWrite(tx =>
                        tx.run(
                            `MATCH (p:paper)
                            WHERE p.id IN $ids AND size(keys(p)) = 1
                            DETACH DELETE p`,
                            { ids: stubIds }
                        )
                    );
                    console.log(`  Deleted ${stubIds.length} stub-only nodes`);
                }

            // fill metadata of any stub nodes that actually have metadata 
            const realResults = allResults.filter(p => Object.keys(p).length > 1) 
            if (realResults.length > 0) {
                const condensed = realResults.map(paperJson => extractRelevantPaperInfo(paperJson));
                await importPapersBatch(condensed, false);
                console.log(`  Updated ${condensed.length} papers`);
            }
        }
    } finally {
        await session.close();
        await driver.close();
        if (noMetadataBatch) { process.exitCode = 1; } 
    }
}


main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(2);
});
