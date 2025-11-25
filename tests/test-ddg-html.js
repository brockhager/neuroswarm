import fetch from 'node-fetch';

const query = "when was peru independance";
const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

console.log(`Querying: ${url}`);

fetch(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
})
    .then(res => res.text())
    .then(html => {
        console.log("Response length:", html.length);

        // Check if result__body exists
        if (html.includes('class="result__body"')) {
            console.log("Found 'result__body' class");
        } else {
            console.log("DID NOT FIND 'result__body' class");
        }

        // Check for expected answer
        if (html.includes("1821") || html.includes("July 28")) {
            console.log("Found expected answer in HTML!");
        } else {
            console.log("Did not find expected answer.");
        }

        // Extract snippets
        const matches = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)];
        if (matches.length > 0) {
            console.log("Found snippets:", matches.length);
            console.log("First snippet:", matches[0][1].trim().substring(0, 100));
        } else {
            console.log("No snippets found with regex.");
        }
    })
    .catch(err => console.error(err));
