
require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;



// middleware 
app.use(express.json());



// routes
app.get('/', (req, res) => {
  res.send('Hello, world!');
});



// start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});