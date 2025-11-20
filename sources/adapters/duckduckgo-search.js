import fetch from 'node-fetch';

const ORIGIN = 'duckduckgo-instant-answer';

/**
 * Search DuckDuckGo and return instant answers + web results
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

    // DuckDuckGo Instant Answer API (no auth required)
    const instantAnswerUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_html=1&skip_disambig=1`;
    
    const response = await fetch(instantAnswerUrl, {
      headers: {
        'User-Agent': 'NeuroSwarm/1.0 (AI Knowledge Network)'
      }
    });

    if (!response.ok) {
      throw new Error(`ddg-api-${response.status}`);
    }

    const data = await response.json();

    // Parse DuckDuckGo response
    const result = {
      query: searchQuery,
      timestamp: new Date().toISOString(),
      
      // Instant Answer (Abstract)
      instantAnswer: data.Abstract ? {
        text: data.Abstract,
        source: data.AbstractSource,
        url: data.AbstractURL,
        image: data.Image
      } : null,

      // Definition
      definition: data.Definition ? {
        text: data.Definition,
        source: data.DefinitionSource,
        url: data.DefinitionURL
      } : null,

      // Answer box (direct answer)
      answer: data.Answer ? {
        text: data.Answer,
        type: data.AnswerType
      } : null,

      // Related topics
      relatedTopics: (data.RelatedTopics || [])
        .filter(t => t.Text && t.FirstURL)
        .slice(0, maxResults)
        .map(topic => ({
          text: topic.Text,
          url: topic.FirstURL,
          icon: topic.Icon?.URL
        })),

      // Results (from RelatedTopics)
      results: (data.RelatedTopics || [])
        .filter(t => t.Text && t.FirstURL)
        .slice(0, maxResults)
        .map((topic, idx) => ({
          position: idx + 1,
          title: topic.Text.split(' - ')[0],
          description: topic.Text,
          url: topic.FirstURL
        })),

      // Metadata
      heading: data.Heading,
      entity: data.Entity,
      type: data.Type,
      
      // Summary for brain storage
      summary: generateSummary(data, searchQuery)
    };

    return {
      source: 'DuckDuckGo',
      value: result,
      verifiedAt: new Date().toISOString(),
      origin: ORIGIN,
      raw: data
    };

  } catch (e) {
    return {
      source: 'DuckDuckGo',
      value: null,
      error: e.message,
      verifiedAt: new Date().toISOString(),
      origin: ORIGIN,
      raw: { error: e.message }
    };
  }
}

/**
 * Generate a concise summary suitable for brain storage
 */
function generateSummary(data, query) {
  const parts = [];
  
  parts.push(`Search: "${query}"`);
  
  if (data.Abstract) {
    parts.push(`\nAnswer: ${data.Abstract}`);
  }
  
  if (data.Definition) {
    parts.push(`\nDefinition: ${data.Definition}`);
  }
  
  if (data.Answer) {
    parts.push(`\nDirect Answer: ${data.Answer}`);
  }
  
  if (data.RelatedTopics && data.RelatedTopics.length > 0) {
    const topics = data.RelatedTopics
      .filter(t => t.Text)
      .slice(0, 3)
      .map(t => `  • ${t.Text.substring(0, 100)}...`)
      .join('\n');
    parts.push(`\nRelated Topics:\n${topics}`);
  }

  return parts.join('\n');
}

/**
 * Check DuckDuckGo API availability
 */
export async function status() {
  try {
    const res = await fetch('https://api.duckduckgo.com/?q=test&format=json', {
      headers: {
        'User-Agent': 'NeuroSwarm/1.0 (AI Knowledge Network)'
      }
    });
    return { 
      ok: res.ok, 
      message: res.ok ? 'DuckDuckGo API reachable' : `http ${res.status}` 
    };
  } catch (e) {
    return { 
      ok: false, 
      message: e.message 
    };
  }
}
