// fetch.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'openalex_config.json');
const OUTPUT_PATH = path.join(__dirname, 'data', 'papers.jsonl');


async function fetchPapersForConcept(conceptId, lastDate, perPage, mailto) {
    const baseUrl = 'https://api.openalex.org/works';
    const params = new URLSearchParams({
        filter: `concepts.id:${conceptId},from_updated_date:${lastDate}`,
        sort: 'updated_date:asc',
        'per-page': perPage.toString(),
        mailto: mailto
    });
    const url = `${baseUrl}?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch for concept ${conceptId}: ${res.status}`);
    }

    const data = await res.json();
    return data.results || [];
}


async function runOpenAlexFetch() {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH));
    const { page_size, last_date, concepts } = config;
    const mailto = process.env.VITE_OPENALEX_MAILTO;

    if (!mailto) {
        throw new Error('Missing VITE_OPENALEX_MAILTO in .env');
    }
    let latestDateSeen = last_date;
    let totalPapers = 0;

    for (const [conceptName, conceptId] of Object.entries(concepts)) {
        console.log(`Fetching papers for concept "${conceptName}" (ID: ${conceptId}) since ${last_date}`);

        const papers = await fetchPapersForConcept(conceptId, last_date, page_size, mailto);

        if (papers.length === 0) {
            console.log(`No new papers found for concept "${conceptName}".`);
            continue;
        }

        const output = papers.map(paper => JSON.stringify(paper)).join('\n');
        fs.appendFileSync(OUTPUT_PATH, output + '\n');

        const conceptLastDate = papers[papers.length - 1].updated_date;
        if (conceptLastDate > latestDateSeen) {
            latestDateSeen = conceptLastDate;
        }

        totalPapers += papers.length;
        console.log(`Fetched ${papers.length} papers for "${conceptName}".`);
    }

    if (totalPapers > 0) {
        config.last_date = latestDateSeen;
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4));
        console.log(`Updated config with new last_date: ${latestDateSeen}`);
    } else {
        console.log("No new papers fetched for any concept.");
    }
}

module.exports = runOpenAlexFetch;
