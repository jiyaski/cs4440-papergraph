## Overview: 
This project is an academic citation graph meant to help researchers find relevant papers and get an overview of academic literature in a field. We are using Neo4j as the database - specifically, the free tier of AuraDB, which is Neo4j's managed cloud version. 

## Setup: 
The code can be found here: https://github.com/jiyaski/cs4440-papergraph. Clone the repository, then install dependencies as follows: 
- navigate to `frontend/` and run `npm install` 
- navigate to `backend/` and run `npm install` 
There is a separate `package.json` file in the frontend and backend which lists the dependencies. Major dependencies were D3.js for the frontend, and the Neo4j driver and Express.js for the backend. 

You'll also need to put credentials into an `.env` file to access AuraDB and the OpenAlex API. Follow the instructions in `backend/.env.template`. Any email will work for the `MAILTO` field; the OpenAlex API requires an email but it's not verified or attached to an account. 

## Running the application: 
- navigate to `backend/` and run `npm run dev` to start a local server at `localhost:3000`. 
- navigate to `frontend/` and run `npm run dev` to start a local server at `localhost:5173`. Navigate here in a browser to see the frontend. 

## Importing data: 
The database should already be populated with data, so there is no need to do anything to get started. The data was acquired using the various ETL pipeline scripts located in `backend/data_pipeline/`. Most of them have been given NPM aliases in `backend/package.json`, and they can be run as follows: 
- `npm run consume <forward|backward>` -- a meta-script that automates most of the pipeline by running the other scripts. It fetches papers, imports them, and fills any stubs that were created. 
- `node ./neo4j_schema.js` --  this was used to set up uniqueness constraints for nodes, which also causes AuraDB to create indexes. This was run once before any of the other pipeline scripts, as the indexes drastically speed up the process of querying and importing data. There is no need to run it again. 
- `npm run fetchpapers <forward|backward>` -- fetch papers from OpenAlex API and temporarily store them in `data/papers.jsonl` as a staging area before importing. Any papers that fail to fetch will go into `data/failed_papers.jsonl`. This script also removes any extraneous fields that aren't needed by our application. It can be configured by editing `backend/openalex_config.json`. Running `npm run fetchpapers forward` will fetch forward in time, starting from the *latest_fetched_date*, and `npm run fetchpapers backward` will fetch backward in time, starting from *earliest_fetched_date*. 
- `npm run importpapers` -- take the items from `data/papers.json` and import them into Neo4j. Note that any papers *cited* by these papers will also be given nodes in the database, but these nodes won't have any metadata attached to them, so we call them *stubs*. 
- `npm run fillstubs` -- searches for stub nodes in the database, fetches their metadata from OpenAlex, and merges it into the database. It does not create any new nodes for cited papers, as that would create a recursive stub node problem. 
- `npm run cullpapers` -- this removes any papers from the database that have a *cited_by_count* less than some threshold (change the threshold by modifying the constant at the top of the script). This is an optional part of the pipeline that was used to make room to include papers over a longer time range without running into AuraDB's node/edge limits. 

