require('dotenv').config();
const path = require('path'); 
const fs = require('fs');
const driver = require('../neo4j.js');
const { importPapersBatch } = require('./shared'); 


async function main() {
    const inputFile = path.join(__dirname, '..', 'data', 'papers.jsonl');
    const failedFile = path.join(__dirname, '..', 'data', 'failed_papers.jsonl'); 
    const BATCH_SIZE = 25;
    const failed = [];

    if (!fs.existsSync(inputFile)) {
        console.log('No input file found.');
        return;
    }

    const lines = fs.readFileSync(inputFile, 'utf-8').split('\n').filter(Boolean);
    const papers = lines.map(line => {
        const p = JSON.parse(line);
        return {
            id: p.id,
            doi: p.doi,
            title: p.title,
            type: p.type,
            cited_by_count: p.cited_by_count,
            is_open_access: p.full_text_url !== null,
            full_source:     p.full_text_url,
            keywords:        p.keywords.join(', '),
            abstract_inverted_index: p.abstract_inverted_index, 
            publication:     p.publication || {},
            authors:         p.authors || [],
            primary_topic:   p.primary_topic || null,
            referenced_works: p.referenced_works || []
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
