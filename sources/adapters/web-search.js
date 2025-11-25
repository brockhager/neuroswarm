import fetch from 'node-fetch';

const ORIGIN = 'web-search-scraper';

/**
 * Search the web via DuckDuckGo HTML scraping
 * @param {Object} params - Query parameters
 * @param {string} params.query - Search query
 * @param {number} params.maxResults - Maximum number of results (default 5)
 * @returns {Object} Normalized adapter response with search results
 */
export async function query(params) {
    try {
        const searchQuery = params.query || params.q;
        if (!searchQuery) {
            throw new Error('query parameter required');
        }

        const maxResults = params.maxResults || 5;
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`web-search-http-${response.status}`);
        }

        const html = await response.text();
        const results = [];

        // More robust regex approach - find all result blocks
        // DDG structure: <div class="result ..."> contains <a class="result__a"> and <a class="result__snippet">
        const resultRegex = /<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*result|<div[^>]*class="[^"]*footer|$)/g;

        let match;
        let count = 0;
        while ((match = resultRegex.exec(html)) !== null && count < maxResults) {
            const resultBlock = match[1];

            // Extract title and URL
            const titleMatch = resultBlock.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/);
            // Extract snippet
            const snippetMatch = resultBlock.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);

            if (titleMatch && snippetMatch) {
                let link = titleMatch[1];

                // DDG sometimes wraps links in /l/?kh=-1&uddg=...
                if (link.startsWith('/l/?')) {
                    try {
                        const urlObj = new URL('https://duckduckgo.com' + link);
                        const uddg = urlObj.searchParams.get('uddg');
                        if (uddg) link = decodeURIComponent(uddg);
                    } catch (e) {
                        // keep original if parse fails
                    }
                }

                results.push({
                    position: count + 1,
                    title: titleMatch[2].replace(/<b>|<\/b>/g, '').trim(),
                    url: link,
                    description: snippetMatch[1].replace(/<b>|<\/b>|<[^>]+>/g, '').trim()
                });
                count++;
            }
        }

        // Construct a summary answer from the top snippet if available
        let summary = '';
        if (results.length > 0) {
            summary = `Found ${results.length} web results.\n\nTop Result: ${results[0].title}\n${results[0].description}\nSource: ${results[0].url}`;
        }

        return {
            source: 'Web Search',
            value: {
                query: searchQuery,
                results: results,
                answer: { text: summary }, // Standardize for chat.js
                timestamp: new Date().toISOString()
            },
            verifiedAt: new Date().toISOString(),
            origin: ORIGIN,
            raw: { count: results.length }
        };

    } catch (e) {
        return {
            source: 'Web Search',
            value: null,
            error: e.message,
            verifiedAt: new Date().toISOString(),
            origin: ORIGIN,
            raw: { error: e.message }
        };
    }
}

export async function status() {
    return { ok: true, message: 'Web Search Scraper Ready' };
}
