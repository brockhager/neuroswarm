import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { queryAdapter } from '../../../sources/index.js';
import { defaultLogger } from '../../logger.js';
import { logNs } from '../utils/logger.js';
import { publishToGateways } from '../services/gateway.js';
import { loadHistory, saveHistory } from '../services/history.js';
import { SERVICE_URLS } from '../../../shared/ports.js';
import { storeKnowledge } from '../services/knowledge-store.js';

// Try to import semantic function asynchronously
let semanticQueryKnowledge = null;
(async () => {
    try {
        const knowledgeStore = await import('../services/knowledge-store.js');
        semanticQueryKnowledge = knowledgeStore.semanticQueryKnowledge;
    } catch (e) {
        console.warn('Semantic cache import failed:', e.message);
    }
})();
import { calculateConfidence } from '../services/confidence-scorer.js';

// Import query history service
let queryHistoryService = null;
(async () => {
    try {
        const { default: QueryHistoryService } = await import('../services/query-history.js');
        queryHistoryService = new QueryHistoryService();
    } catch (e) {
        console.warn('Query history service import failed:', e.message);
    }
})();

const router = express.Router();
const interactionsLogger = defaultLogger;
const LEARNING_SERVICE_URL = process.env.LEARNING_SERVICE_URL || SERVICE_URLS.LEARNING_SERVICE;
const LEARNING_REQUEST_TIMEOUT = parseInt(process.env.LEARNING_SERVICE_TIMEOUT || '2500', 10);

function fakeProvenance() {
    return {
        cid: `Qm${Math.random().toString(36).substr(2, 9)}`,
        txSignature: `sig_${Math.random().toString(36).substr(2, 12)}`
    };
}

async function requestLearningSupport(query) {
    if (!LEARNING_SERVICE_URL) {
        return null;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), LEARNING_REQUEST_TIMEOUT);
        const response = await fetch(`${LEARNING_SERVICE_URL}/recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`learning service responded ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        logNs('WARN', 'Learning service unavailable', err.message);
        return null;
    }
}

router.post('/', async (req, res) => {
    const body = req.body || {};
    const sender = body.sender || 'user';
    const content = body.content || '';
    const auth = req.header('authorization') || '';
    const forwardedFor = req.header('x-forwarded-for') || req.socket.remoteAddress || '';
    const forwardedUser = req.header('x-forwarded-user') || '';

    if (!content) return res.status(400).json({ error: 'content is required' });

    const startTime = Date.now();
    const interactionId = uuidv4();
    const adaptersQueried = [];
    const adapterResponses = {};

    const now = new Date().toISOString();
    const inMsg = { id: uuidv4(), sender, content, timestamp: now };

    let responseContent = '';
    let searchData = null;

    // Enhanced question detection with implicit query patterns
    const isQuestion = content.trim().endsWith('?') ||
        content.toLowerCase().startsWith('what ') ||
        content.toLowerCase().startsWith('how ') ||
        content.toLowerCase().startsWith('why ') ||
        content.toLowerCase().startsWith('when ') ||
        content.toLowerCase().startsWith('where ') ||
        content.toLowerCase().startsWith('who ') ||
        content.toLowerCase().startsWith('tell me ') ||
        content.toLowerCase().startsWith('explain ') ||
        // Implicit query patterns
        /\b(scores?|game|match)\b/i.test(content) ||  // Sports queries
        /\b(news|headlines?|latest|breaking)\b/i.test(content) ||  // News queries
        /\b(weather|temperature|forecast)\b/i.test(content) ||  // Weather queries
        /\b(price|value|worth)\b/i.test(content);  // Price queries

    logNs(`Incoming chat: "${content}" | isQuestion: ${isQuestion}`);

    const detectedIntent = isQuestion ? 'question' : 'statement';

    const learningSupport = isQuestion ? await requestLearningSupport(content) : null;
    const recommendedAdapters = Array.isArray(learningSupport?.adapters) ? learningSupport.adapters : [];
    const exemplars = Array.isArray(learningSupport?.exemplars) ? learningSupport.exemplars : [];

    // STEP 1: Intelligent adapter selection based on query content
    // Following Knowledge Retrieval Pipeline design
    const intelligentAdapters = [];
    let contextForLLM = []; // Collect context from adapters for LLM synthesis

    // Math queries (HIGHEST PRIORITY - deterministic, instant)
    if (/\d+\s*[+\-*/×÷]\s*\d+|what\s+is\s+[\d\s+\-*/().]+|calculate/i.test(content)) {
        intelligentAdapters.push('math-calculator');
    }

    // Crypto/Price queries with entity extraction
    if (/\b(price|value|worth|cost)\b.*\b(btc|bitcoin|eth|ethereum|crypto|coin)/i.test(content)) {
        // Extract crypto symbol/name and map to CoinGecko ID
        const cryptoMap = {
            'btc': 'bitcoin',
            'bitcoin': 'bitcoin',
            'eth': 'ethereum',
            'ethereum': 'ethereum',
            'sol': 'solana',
            'solana': 'solana',
            'ada': 'cardano',
            'cardano': 'cardano',
            'dot': 'polkadot',
            'polkadot': 'polkadot',
            'matic': 'matic-network',
            'polygon': 'matic-network',
            'avax': 'avalanche-2',
            'avalanche': 'avalanche-2'
        };

        // Extract coin from query
        let coinId = 'bitcoin'; // default
        const lowerContent = content.toLowerCase();
        for (const [symbol, id] of Object.entries(cryptoMap)) {
            if (lowerContent.includes(symbol)) {
                coinId = id;
                break;
            }
        }

        intelligentAdapters.push({ name: 'coingecko', params: { coin: coinId } });
    }

    // NBA/Sports queries
    if (/\b(nba|basketball|scores?|lakers|warriors|celtics|nets|knicks|heat)\b/i.test(content)) {
        intelligentAdapters.push('nba-scores');
    }

    // News queries
    if (/\b(news|headlines?|latest|breaking)\b/i.test(content)) {
        intelligentAdapters.push('news-aggregator');
    }

    // STEP 2: IPFS Knowledge Cache (check for stored answers)
    // Always check cache for all questions
    if (isQuestion) {
        intelligentAdapters.push('ipfs-knowledge');
    }

    const adapterCandidates = Array.from(new Set([
        ...recommendedAdapters,
        ...intelligentAdapters
    ]));

    // STEP 1.5: Semantic Cache Lookup (before adapters)
    // Check for semantically similar cached answers
    if (isQuestion && !responseContent && semanticQueryKnowledge) {
        try {
            // Dynamic threshold based on query type
            const isDeterministic = /\d+\s*[+\-*/×÷]\s*\d+|what\s+is\s+[\d\s+\-*/().]+|calculate/i.test(content) ||
                /\b(price|value|worth|cost)\b.*\b(btc|bitcoin|eth|ethereum|crypto|coin)/i.test(content) ||
                /\b(nba|basketball|scores?|lakers|warriors|celtics|nets|knicks|heat)\b/i.test(content) ||
                /\b(news|headlines?|latest|breaking)\b/i.test(content);
            const semanticThreshold = isDeterministic ? 0.9 : 0.7; // higher for deterministic, lower for fuzzy
            const semanticCacheResult = await semanticQueryKnowledge(content, semanticThreshold);
            if (semanticCacheResult) {
                logNs(`Semantic cache hit: similarity ${semanticCacheResult.similarity.toFixed(3)}, threshold ${semanticThreshold} for "${content}"`);
                responseContent = semanticCacheResult.answer;
                searchData = { cached: true, similarity: semanticCacheResult.similarity, confidence: semanticCacheResult.confidence, threshold: semanticThreshold, source: semanticCacheResult.source };
                // Skip adapters and go to response
            }
        } catch (e) {
            logNs(`Semantic cache lookup failed: ${e.message}`);
            // Continue to adapters
        }
    }

    if (isQuestion) {
        for (const adapterCandidate of adapterCandidates) {
            // Handle both string adapter names and objects with parameters
            const adapterName = typeof adapterCandidate === 'string' ? adapterCandidate : adapterCandidate.name;
            const adapterParams = typeof adapterCandidate === 'object' ? adapterCandidate.params : {};

            adaptersQueried.push(adapterName);
            try {
                logNs(`Question detected, querying adapter ${adapterName} for: "${content}"`);

                // Merge query with any adapter-specific parameters
                const queryParams = { query: content, maxResults: 3, ...adapterParams };
                const searchResult = await queryAdapter(adapterName, queryParams);
                adapterResponses[adapterName] = searchResult;

                // Debug log for adapter result
                logNs(`Adapter ${adapterName} result: ${JSON.stringify(searchResult?.value ? 'found-value' : 'no-value')}`);
                if (searchResult?.value) {
                    logNs(`Adapter ${adapterName} value keys: ${Object.keys(searchResult.value).join(',')}`);
                }

                if (searchResult && searchResult.value) {
                    searchData = searchResult.value;

                    // Collect context for LLM synthesis (even if we don't use it immediately)
                    contextForLLM.push({
                        source: adapterName,
                        data: searchData
                    });

                    // CoinGecko price formatting
                    if (adapterName === 'coingecko') {
                        if (typeof searchData === 'number') {
                            // searchData is the price directly
                            const coinName = adapterParams.coin || 'Bitcoin';
                            const coinDisplay = coinName.charAt(0).toUpperCase() + coinName.slice(1);
                            responseContent = `💰 ${coinDisplay} Price: $${searchData.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n📊 Source: CoinGecko`;
                        }
                    }
                    // NBA scores formatting
                    if (adapterName === 'nba-scores') {
                        if (searchData.games && searchData.games.length > 0) {
                            responseContent = `🏀 NBA Scores (${searchData.date}):\n\n`;
                            searchData.games.forEach(g => {
                                const status = g.state === 'post' ? 'Final' : g.state === 'in' ? `${g.clock} ${g.period}Q` : g.status;
                                responseContent += `${g.away} ${g.awayScore} @ ${g.home} ${g.homeScore} - ${status}\n`;
                            });
                            responseContent += `\n📊 Source: ESPN`;
                        } else if (searchData.home) {
                            const status = searchData.state === 'post' ? 'Final' : searchData.state === 'in' ? `${searchData.clock} ${searchData.period}Q` : searchData.status;
                            responseContent = `🏀 ${searchData.away} ${searchData.awayScore} @ ${searchData.home} ${searchData.homeScore}\n`;
                            responseContent += `Status: ${status}\n📊 Source: ESPN`;
                        }
                    }
                    // News formatting
                    else if (adapterName === 'news-aggregator') {
                        // Handle array response directly (it returns array of stories)
                        const stories = Array.isArray(searchData) ? searchData : (searchData.stories || []);

                        if (stories.length > 0) {
                            responseContent = `📰 Top News Headlines:\n\n`;
                            stories.slice(0, 5).forEach((story, idx) => {
                                responseContent += `${idx + 1}. ${story.title}${story.sources?.[0]?.name ? ` (${story.sources[0].name})` : ''}\n`;
                            });
                            responseContent += `\n📡 Updated: ${new Date().toLocaleTimeString()}`;
                        }
                    }
                    // Weather formatting
                    else if (adapterName === 'allie-weather') {
                        if (searchData.current) {
                            responseContent = `🌤️ Current Weather:\n`;
                            responseContent += `Temperature: ${searchData.current.temp}°F\n`;
                            responseContent += `Conditions: ${searchData.current.conditions}\n`;
                            if (searchData.location) responseContent += `Location: ${searchData.location}\n`;
                            responseContent += `\n📍 Source: Weather API`;
                        }
                    }
                    // Web Search formatting
                    else if (adapterName === 'web-search') {
                        if (searchData.answer && searchData.answer.text) {
                            responseContent = searchData.answer.text;
                        } else if (searchData.results && searchData.results.length > 0) {
                            responseContent = `I found some web results:\n\n`;
                            searchData.results.slice(0, 3).forEach((result, idx) => {
                                responseContent += `${idx + 1}. [${result.title}](${result.url})\n   ${result.description}\n\n`;
                            });
                            responseContent += `🔍 Source: Web Search`;
                        }
                    }
                    // DuckDuckGo and other adapters
                    else if (searchData.instantAnswer?.text || searchData.AbstractText) {
                        responseContent = searchData.instantAnswer?.text || searchData.AbstractText;
                        const source = searchData.instantAnswer?.source || searchData.AbstractSource;
                        if (source) {
                            responseContent += `\n\n📚 Source: ${source}`;
                        }
                    } else if (searchData.definition?.text) {
                        responseContent = searchData.definition.text;
                        if (searchData.definition.source) {
                            responseContent += `\n\n📚 Source: ${searchData.definition.source}`;
                        }
                    } else if (searchData.answer?.text) {
                        responseContent = searchData.answer.text;
                    } else if (Array.isArray(searchData.results) && searchData.results.length > 0) {
                        responseContent = `I found some information about that:\n\n`;
                        searchData.results.slice(0, 3).forEach((result, idx) => {
                            responseContent += `${idx + 1}. ${result.description}\n`;
                        });
                        responseContent += `\n🔍 Search performed via ${adapterName}`;
                    }

                    if (responseContent) {
                        logNs(`${adapterName} search successful, found answer: ${responseContent.substring(0, 100)}...`);

                        // Store high-confidence answers to IPFS for future retrieval
                        // This builds the knowledge base over time
                        const confidence = searchResult.confidence || 0.85;
                        if (confidence >= 0.8) {
                            storeKnowledge({
                                question: content,
                                answer: responseContent,
                                source: adapterName,
                                confidence: confidence,
                                nodeId: process.env.NODE_ID || 'ns-node'
                            }).catch(err => {
                                logNs(`IPFS storage failed: ${err.message}`);
                            });
                        }

                        break;
                    }
                }
            } catch (err) {
                adapterResponses[adapterName] = { error: err.message };
                logNs(`Adapter ${adapterName} failed: ${err.message}`);
            }
        }

    }

    // STEP 3: Local LLM with context (if no direct answer found)
    // The LLM synthesizes information from adapters and IPFS
    if (!responseContent && isQuestion) {
        logNs(`No direct answer found. Invoking Local LLM with context for: "${content}"`);

        // Build context string from collected adapter data
        let contextString = '';
        if (contextForLLM.length > 0) {
            contextString = '\n\nContext from data sources:\n' + contextForLLM.map((ctx, idx) =>
                `${idx + 1}. [${ctx.source}]: ${JSON.stringify(ctx.data).substring(0, 200)}`
            ).join('\n');
        }

        const llmPrompt = content + contextString;

        try {
            const localRes = await queryAdapter('local-llm', { query: llmPrompt });
            if (localRes && localRes.value) {
                const llmAnswer = typeof localRes.value === 'string' ? localRes.value : localRes.value.answer;

                // Filter out uncertain responses
                if (llmAnswer && !llmAnswer.match(/I don't know|I cannot answer|I am not sure/i)) {
                    responseContent = llmAnswer;
                    logNs(`Local LLM synthesized answer: ${responseContent.substring(0, 50)}...`);
                } else {
                    logNs(`Local LLM returned uncertain response`);
                }
            } else if (localRes && localRes.error) {
                logNs(`Local LLM failed: ${localRes.error}`);
            }
        } catch (e) {
            logNs(`Local LLM exception: ${e.message}`);
        }

        // Fallback to OpenAI if Local LLM failed
        if (!responseContent) {
            try {
                const aiRes = await queryAdapter('openai-chat', { query: llmPrompt });
                if (aiRes && aiRes.value && aiRes.value.answer) {
                    responseContent = aiRes.value.answer;
                    logNs(`OpenAI synthesized answer: ${responseContent.substring(0, 50)}...`);
                } else if (aiRes && aiRes.error) {
                    logNs(`OpenAI failed: ${aiRes.error}`);
                }
            } catch (e) {
                logNs(`OpenAI exception: ${e.message}`);
            }
        }
    }

    // Final fallback if no LLM available
    if (!responseContent) {
        // Final Fallback if no LLM available
        if (content.match(/^(hi|hello|hey|greetings)/i)) {
            responseContent = "Hello! I'm NeuroSwarm. I can help you with:\n\n🏀 NBA Scores\n📰 Latest News\n🌤️ Weather\n🔍 General Search\n\nTo chat with me, please configure an OpenAI Key or run a Local LLM (Ollama).";
        } else if (isQuestion) {
            responseContent = `I searched for information about "${content}" but couldn't find a clear answer, and I'm not connected to a brain (LLM) to help further.\n\nTo enable chat:\n1. Set OPENAI_API_KEY environment variable\n2. OR run Ollama locally (http://localhost:11434)`;
        } else {
            responseContent = `I'm currently configured as a Search Node. I tried to chat but couldn't connect to a brain (LLM).\n\nTo enable chat:\n1. Set OPENAI_API_KEY environment variable\n2. OR run Ollama locally (http://localhost:11434)`;
        }
    }

    if (exemplars.length > 0) {
        const exemplarText = exemplars.slice(0, 2).map(ex => `• ${ex.user_message} → ${ex.final_reply}`).join('\n');
        responseContent += `\n\n🧠 Related context:\n${exemplarText}`;
    }

    // Calculate confidence score for the answer
    let confidenceResult = null;
    if (responseContent && isQuestion) {
        confidenceResult = calculateConfidence(responseContent, {
            source: adaptersQueried[adaptersQueried.length - 1] || 'unknown', // Last adapter used
            query: content,
            contextUsed: contextForLLM.length > 0,
            contextAvailable: contextForLLM,
            sources: adaptersQueried,
            hasSourceCitation: /source:|from:|via:|📊|📡|📚/i.test(responseContent),
            isFormatted: /[🏀💰📰🌤️📊💡🔍]/.test(responseContent)
        });

        logNs(`Confidence score: ${confidenceResult.score} (${confidenceResult.shouldStore ? 'WILL STORE' : 'will not store'})`);
        logNs(`Breakdown: ${JSON.stringify(confidenceResult.breakdown)}`);

        // Only store to IPFS if confidence is high enough
        if (confidenceResult.shouldStore) {
            try {
                await storeKnowledge({
                    question: content,
                    answer: responseContent,
                    source: adaptersQueried[adaptersQueried.length - 1],
                    confidence: confidenceResult.score,
                    confidenceBreakdown: confidenceResult.breakdown,
                    nodeId: process.env.NODE_ID || 'ns-node',
                    timestamp: new Date().toISOString()
                });
                logNs(`Stored to IPFS with confidence ${confidenceResult.score}`);
            } catch (err) {
                logNs(`Failed to store to IPFS: ${err.message}`);
            }
        } else {
            logNs(`Not storing to IPFS - confidence ${confidenceResult.score} below threshold ${confidenceResult.threshold}`);
        }
    }

    const response = {
        id: uuidv4(),
        sender: 'agent',
        content: responseContent,
        timestamp: new Date().toISOString(),
        searchData,
        interactionId,
        confidence: confidenceResult?.score,
        confidenceBreakdown: confidenceResult?.breakdown,
        ...fakeProvenance()
    };

    const history = loadHistory();
    const msgHeaders = { authorization: auth, 'x-forwarded-for': forwardedFor, 'x-forwarded-user': forwardedUser };
    history.push({ direction: 'in', ...inMsg, headers: msgHeaders });
    history.push({ direction: 'out', ...response, headers: msgHeaders });
    saveHistory(history);

    interactionsLogger.recordInteraction({
        interaction_id: interactionId,
        timestamp: response.timestamp,
        user_message: content,
        detected_intent: detectedIntent,
        adapters_queried: adaptersQueried,
        adapter_responses: adapterResponses,
        final_reply: responseContent,
        latency_ms: Date.now() - startTime,
        feedback: null
    });

    // Try to publish message to configured gateways in order (primary first)
    const incomingCorrelation = req.header('x-correlation-id') || uuidv4();
    const forwardedHeaders = { authorization: auth, 'x-forwarded-for': forwardedFor, 'x-forwarded-user': forwardedUser, 'x-correlation-id': incomingCorrelation };
    publishToGateways({ id: response.id, sender: response.sender, content: response.content, timestamp: response.timestamp }, forwardedHeaders)
        .catch((err) => {
            logNs('Failed to publish to gateways:', err);
        });

    // Log query to history service
    if (queryHistoryService) {
        try {
            const responseTime = Date.now() - startTime;
            const isCacheHit = searchData && searchData.cached;
            const adapterUsed = adaptersQueried.length > 0 ? adaptersQueried[adaptersQueried.length - 1] : null;

            queryHistoryService.addQuery(content, responseContent, {
                responseTime,
                cacheHit: isCacheHit,
                confidence: confidenceResult?.score || 0,
                adapterUsed,
                ipfsHash: response.cid || null,
                intent: detectedIntent,
                adaptersQueried: adaptersQueried.length
            });
        } catch (error) {
            logNs('Failed to log query to history:', error.message);
        }
    }

    res.json(response);
});

export default router;
