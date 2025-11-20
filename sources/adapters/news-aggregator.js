import fetch from 'node-fetch';

const ORIGIN = 'news-aggregator';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
let cache = {
    data: null,
    timestamp: 0
};

const FEEDS = [
    { name: 'BBC', url: 'http://feeds.bbci.co.uk/news/rss.xml' },
    { name: 'CNN', url: 'http://rss.cnn.com/rss/edition.rss' },
    { name: 'Reuters', url: 'https://www.reutersagency.com/feed/?best-topics=tech&post_type=best' }, // Using a reliable public feed
    { name: 'NYT', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' }
];

/**
 * Simple Regex-based RSS Parser
 * Note: Not a full XML parser, but sufficient for standard RSS feeds
 */
function parseRSS(xml, sourceName) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const itemContent = match[1];

        const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/.exec(itemContent);
        const linkMatch = /<link>(.*?)<\/link>/.exec(itemContent);
        const descMatch = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/.exec(itemContent);
        const dateMatch = /<pubDate>(.*?)<\/pubDate>/.exec(itemContent);

        const title = titleMatch ? (titleMatch[1] || titleMatch[2]) : 'No Title';
        const link = linkMatch ? linkMatch[1] : '#';
        const description = descMatch ? (descMatch[1] || descMatch[2]) : '';
        const pubDate = dateMatch ? dateMatch[1] : new Date().toISOString();

        // Clean up HTML in description
        const cleanDesc = description.replace(/<[^>]*>/g, '').trim();

        items.push({
            title: title.trim(),
            link: link.trim(),
            description: cleanDesc,
            pubDate,
            source: sourceName
        });
    }
    return items;
}

/**
 * Jaccard Similarity for Title Clustering
 */
function getSimilarity(str1, str2) {
    const set1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const set2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
}

/**
 * Cluster articles into stories
 */
function clusterArticles(articles) {
    const clusters = [];
    const processed = new Set();

    // Sort by date (newest first) to prioritize recent headlines
    articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    for (let i = 0; i < articles.length; i++) {
        if (processed.has(i)) continue;

        const current = articles[i];
        const cluster = {
            mainTitle: current.title,
            mainSource: current.source,
            articles: [current],
            keywords: current.title.split(' ').filter(w => w.length > 4)
        };
        processed.add(i);

        for (let j = i + 1; j < articles.length; j++) {
            if (processed.has(j)) continue;

            const other = articles[j];
            const similarity = getSimilarity(current.title, other.title);

            // Threshold for clustering (0.2 is a rough heuristic for headlines)
            if (similarity > 0.2) {
                cluster.articles.push(other);
                processed.add(j);
            }
        }

        // Only keep clusters with unique sources if possible, or just all clusters
        clusters.push(cluster);
    }

    return clusters;
}

export async function query(params) {
    try {
        // Check cache
        const now = Date.now();
        if (cache.data && (now - cache.timestamp < CACHE_TTL) && !params.force) {
            return {
                source: 'NewsAggregator',
                value: cache.data,
                verifiedAt: new Date(cache.timestamp).toISOString(),
                origin: ORIGIN,
                cached: true
            };
        }

        // Fetch all feeds in parallel
        const feedPromises = FEEDS.map(async (feed) => {
            try {
                const res = await fetch(feed.url, { timeout: 5000 });
                if (!res.ok) return [];
                const text = await res.text();
                return parseRSS(text, feed.name);
            } catch (e) {
                console.error(`Failed to fetch ${feed.name}:`, e.message);
                return [];
            }
        });

        const results = await Promise.all(feedPromises);
        const allArticles = results.flat();

        // Cluster stories
        const stories = clusterArticles(allArticles);

        // Sort clusters by "hotness" (number of articles + recency)
        stories.sort((a, b) => {
            const scoreA = a.articles.length * 10 + (new Date(a.articles[0].pubDate).getTime() / 1000000000);
            const scoreB = b.articles.length * 10 + (new Date(b.articles[0].pubDate).getTime() / 1000000000);
            return scoreB - scoreA;
        });

        // Take top 10 stories
        const topStories = stories.slice(0, 10).map(cluster => ({
            title: cluster.mainTitle,
            summary: cluster.articles[0].description,
            time: cluster.articles[0].pubDate,
            sources: cluster.articles.map(a => ({ name: a.source, url: a.link }))
        }));

        // Update cache
        cache = {
            data: topStories,
            timestamp: now
        };

        return {
            source: 'NewsAggregator',
            value: topStories,
            verifiedAt: new Date().toISOString(),
            origin: ORIGIN
        };

    } catch (e) {
        return {
            source: 'NewsAggregator',
            value: null,
            verifiedAt: new Date().toISOString(),
            origin: ORIGIN,
            raw: { error: e.message }
        };
    }
}

export async function status() {
    return { ok: true, message: 'Aggregator ready' };
}
