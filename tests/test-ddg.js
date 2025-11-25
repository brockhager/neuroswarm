import fetch from 'node-fetch';

const query = "when was peru independant?";
const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

console.log(`Querying: ${url}`);

fetch(url, { headers: { 'User-Agent': 'NeuroSwarm/1.0' } })
    .then(res => res.json())
    .then(data => {
        console.log(JSON.stringify(data, null, 2));
    })
    .catch(err => console.error(err));
