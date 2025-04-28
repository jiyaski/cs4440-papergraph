require('dotenv').config();
const express = require('express');
const driver = require('./neo4j');
const cors = require('cors');

const runOpenAlexFetch = require('./data_pipeline/fetchPapers'); // <- Import the fetch script
const papersRouter = require('./papers'); // <- Import the papers route (searching feature)
const getCitedPapersRouter = require('./getCitedPapers'); 
const app = express();
const PORT = process.env.PORT || 3000;

require('./scheduler');

// middleware
app.use(cors());
app.use(express.json());
app.use('/papers', papersRouter); // Enables /papers/search and /papers/:id
app.use('/get-cited-papers', getCitedPapersRouter); 

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
