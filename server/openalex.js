// fetch.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'openalex_config.json');
const OUTPUT_PATH = path.join(__dirname, 'data', 'papers.jsonl');

function addDays(dateStr, numDays) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + numDays);
  return date.toISOString().slice(0, 10);
}

async function fetchPapersForDay({ conceptId, fromDate, toDate, cursor, pageSize, mailto }) {
  const baseUrl = 'https://api.openalex.org/works';

  const params = new URLSearchParams({
    filter: `concepts.id:${conceptId},from_publication_date:${fromDate},to_publication_date:${toDate}`,
    sort: 'publication_date:asc',
    'per-page': pageSize.toString(),
    mailto: mailto,
    cursor: cursor || '*'
  });

  const url = `${baseUrl}?${params.toString()}`;
  console.log(`Fetching: ${url}`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch for concept ${conceptId}: ${res.status}`);
  }

  const data = await res.json();
  return {
    results: data.results || [],
    nextCursor: data.meta?.next_cursor || null
  };
}

async function runOpenAlexFetch() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH));
  const {
    concepts,
    earliest_fetched_date,
    latest_fetched_date,
    start_date,
    direction,
    page_size,
    cursors = {}
  } = config;

  const mailto = process.env.VITE_OPENALEX_MAILTO;
  if (!mailto) throw new Error('Missing VITE_OPENALEX_MAILTO in .env');

  let totalFetched = 0;

  for (const [conceptName, conceptId] of Object.entries(concepts)) {
    console.log(`Fetching for "${conceptName}" (${conceptId})`);

    let fromDate, toDate;

    if (direction === 'forward') {
      fromDate = addDays(latest_fetched_date, 1);
      toDate = fromDate;
    } else if (direction === 'backward') {
      if (earliest_fetched_date <= start_date) {
        console.log(`Already reached start_date for "${conceptName}". Skipping.`);
        continue;
      }
      toDate = addDays(earliest_fetched_date, -1);
      fromDate = toDate;
      if (toDate < start_date) {
        console.log(`toDate before start_date. Skipping "${conceptName}".`);
        continue;
      }
    } else {
      throw new Error('Invalid direction in config. Use "forward" or "backward".');
    }

    const conceptCursorKey = `${conceptId}_${fromDate}`;
    const cursor = cursors[conceptCursorKey] || null;

    const { results, nextCursor } = await fetchPapersForDay({
      conceptId,
      fromDate,
      toDate,
      cursor,
      pageSize: page_size,
      mailto
    });

    if (results.length > 0) {
      const output = results.map(paper => JSON.stringify(paper)).join('\n');
      fs.appendFileSync(OUTPUT_PATH, output + '\n');
      totalFetched += results.length;
      console.log(`Fetched ${results.length} papers for "${conceptName}" on ${fromDate}`);
    } else {
      console.log(`No results for "${conceptName}" on ${fromDate}`);
    }

    if (nextCursor) {
      // Save progress for this date
      config.cursors[conceptCursorKey] = nextCursor;
    } else {
      // Finished this day, update range
      delete config.cursors[conceptCursorKey];
      if (direction === 'forward') {
        config.latest_fetched_date = fromDate;
      } else {
        config.earliest_fetched_date = fromDate;
      }
    }
  }

  if (totalFetched > 0) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(`Updated config after fetching ${totalFetched} papers.`);
  } else {
    console.log('No new papers fetched for any concept.');
  }
}

module.exports = runOpenAlexFetch;
