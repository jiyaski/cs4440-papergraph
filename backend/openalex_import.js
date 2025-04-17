
require('dotenv').config();
const fs = require('fs');
const driver = require('./neo4j.js'); 

async function importPaper(paper, session) {
    const {
        id, doi, title, type, citations, authors, keywords,
        abstract_inverted_index, full_text_url, publication, topics
    } = paper;

    const full_source = full_text_url || null;
    const is_open_access = full_text_url !== null;
    const keywordStr = keywords.join(', ');
    const cited_by_count = citations.count;

    await session.run(`
        MERGE (p:paper {id: $id})
        SET p.doi = $doi,
            p.title = $title,
            p.type = $type,
            p.cited_by_count = $cited_by_count,
            p.is_open_access = $is_open_access,
            p.full_source = $full_source,
            p.keywords = $keywords,
            p.abstract_inverted_index = $abstract_inverted_index
    `, {
        id, doi, title, type,
        cited_by_count,
        is_open_access,
        full_source,
        keywords: keywordStr,
        abstract_inverted_index
    });

    if (publication && publication.journal) {
        await session.run(`
            MERGE (v:venue {name: $venue})
            MERGE (p:paper {id: $id})
            MERGE (p)-[r:published_in]->(v)
            SET r.date = $date,
                r.volume = $volume,
                r.issue = $issue, 
                r.first_page = $first_page,
                r.last_page = $last_page
        `, {
            id,
            venue: publication.journal,
            date: publication.date,
            volume: publication.volume || null,
            issue: publication.issue || null,
            first_page: publication.first_page || null,
            last_page: publication.last_page || null
        });
    }

    for (const author of authors) {
        await session.run(`
            MERGE (a:author {name: $name})
            MERGE (p:paper {id: $paperId})
            MERGE (p)-[:has_author]->(a)
        `, { name: author.name, paperId: id });

        for (const affiliation of author.affiliation || []) {
            await session.run(`
                MERGE (i:institution {name: $affiliation})
                MERGE (a:author {name: $author})
                MERGE (a)-[:affiliated_with]->(i)
            `, { author: author.name, affiliation });
        }
    }

    for (const t of topics || []) {
        await session.run(`
            MERGE (d:domain {name: $domain})
            MERGE (f:field {name: $field})
                MERGE (f)-[:belongs_to]->(d)
            MERGE (s:subfield {name: $subfield})
                MERGE (s)-[:belongs_to]->(f)
            MERGE (t:topic {name: $topic})
                MERGE (t)-[:belongs_to]->(s)
            MERGE (p:paper {id: $paperId})
                MERGE (p)-[:has_topic]->(t)
        `, {
            paperId: id,
            topic: t.topic,
            subfield: t.subfield,
            field: t.field,
            domain: t.domain
        });
    }

    for (const refId of citations.referenced_works || []) {
        await session.run(`
            MERGE (p1:paper {id: $from})
            MERGE (p2:paper {id: $to})
            MERGE (p1)-[:cites]->(p2)
        `, { from: id, to: refId });
    }
}

async function main() {
    const inputFile = 'data/papers.jsonl';
    const failedFile = 'data/failed_papers.jsonl'; // papers that couldn't be processed are written here

    if (!fs.existsSync(inputFile)) {
        console.log('No input file found.');
        return;
    }

    const lines = fs.readFileSync(inputFile, 'utf-8').split('\n').filter(Boolean);
    const failedLines = [];
    const session = driver.session();
    try {
        for (const line of lines) {
            try {
                const paper = JSON.parse(line);
                await importPaper(paper, session);
                console.log(`Imported paper: ${paper.id}`);
            } catch (err) {
                console.error('Error importing paper:', err.message);
                failedLines.push(line);
            }
        }
    } finally {
        await session.close();
        await driver.close();
    }

    if (failedLines.length > 0) {
        fs.appendFileSync(failedFile, failedLines.join('\n') + '\n', 'utf-8');
        console.log(`Failed papers appended to ${failedFile}`);
    }

    fs.writeFileSync(inputFile, '', 'utf-8');
    console.log('Input file cleared. Import complete.');
}

main();
