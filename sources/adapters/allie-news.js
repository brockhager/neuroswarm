import fetch from 'node-fetch';

const ORIGIN = 'hacker-news-api';

/**
 * Fetch top stories from Hacker News
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Number of stories to return (default 5)
 * @returns {Object} Normalized adapter response
 */
export async function query(params) {
  try {
    const limit = params.limit || 5;

    // 1. Get top story IDs
    const topStoriesRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    if (!topStoriesRes.ok) throw new Error(`hn-api-ids-${topStoriesRes.status}`);

    const storyIds = await topStoriesRes.json();
    const topIds = storyIds.slice(0, limit);

    // 2. Fetch details for each story
    const stories = await Promise.all(topIds.map(async (id) => {
      const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      return storyRes.json();
    }));

    return {
      source: 'HackerNews',
      value: {
        topic: 'Top Stories',
        stories: stories.map(s => ({
          id: s.id,
          title: s.title,
          url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
          score: s.score,
          by: s.by,
          time: s.time
        }))
      },
      verifiedAt: new Date().toISOString(),
      origin: ORIGIN,
      raw: stories
    };

  } catch (e) {
    return {
      source: 'HackerNews',
      value: null,
      verifiedAt: new Date().toISOString(),
      origin: ORIGIN,
      raw: { error: e.message }
    };
  }
}

export async function status() {
  try {
    const res = await fetch('https://hacker-news.firebaseio.com/v0/maxitem.json');
    return { ok: res.ok, message: res.ok ? 'Hacker News API reachable' : `http ${res.status}` };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}
