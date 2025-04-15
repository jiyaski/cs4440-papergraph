
require('dotenv').config();
const neo4j = require('neo4j-driver');

const NEO4J_URI = process.env.VITE_NEO4J_URI;
const NEO4J_USER = process.env.VITE_NEO4J_USER;
const NEO4J_PASSWORD = process.env.VITE_NEO4J_PASSWORD;

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);

module.exports = driver;