
require('dotenv').config();
const express = require('express');
const driver = require('./neo4j'); 
const runOpenAlexFetch = require('./openalex'); // <- Import the fetch script
const app = express();
const PORT = process.env.PORT || 3000;


// middleware 
app.use(express.json());


// routes
app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.get('/fetch-openalex', async (req, res) => {
    try {
        await runOpenAlexFetch('forward');
        res.status(200).json({ message: 'Fetch complete' });
    } catch (error) {
        console.error('Error in fetch-openalex:', error);
        res.status(500).json({ error: 'Fetch failed', details: error.message });
    }
});


// start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
