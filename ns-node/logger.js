import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultDataDir = path.join(moduleDir, 'data');
const defaultLogPath = path.join(defaultDataDir, 'interactions.jsonl');

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    ensureDirExists(path.dirname(filePath));
    fs.writeFileSync(filePath, '', 'utf8');
  }
}

export function createInteractionLogger(options = {}) {
  const logPath = options.logPath || process.env.NS_INTERACTIONS_LOG || defaultLogPath;
  ensureFileExists(logPath);

  function append(event) {
    fs.appendFileSync(logPath, `${JSON.stringify(event)}\n`, 'utf8');
  }

  function recordInteraction(payload) {
    const event = {
      type: 'interaction',
      interaction_id: payload.interaction_id || uuidv4(),
      timestamp: payload.timestamp || new Date().toISOString(),
      user_message: payload.user_message,
      detected_intent: payload.detected_intent,
      adapters_queried: payload.adapters_queried || [],
      adapter_responses: payload.adapter_responses || {},
      final_reply: payload.final_reply,
      latency_ms: payload.latency_ms,
      feedback: payload.feedback ?? null
    };
    append(event);
    return event.interaction_id;
  }

  function recordFeedback(payload) {
    if (!payload.interaction_id) {
      throw new Error('interaction_id is required for feedback');
    }
    const event = {
      type: 'feedback',
      interaction_id: payload.interaction_id,
      timestamp: payload.timestamp || new Date().toISOString(),
      score: payload.score,
      correction: payload.correction || null
    };
    append(event);
    return event;
  }

  function loadEvents() {
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (err) {
        return null;
      }
    }).filter(Boolean);
  }

  function materializeInteractions() {
    const events = loadEvents();
    const map = new Map();
    for (const event of events) {
      if (event.type === 'interaction') {
        map.set(event.interaction_id, { ...event });
      } else if (event.type === 'feedback') {
        const existing = map.get(event.interaction_id);
        if (existing) {
          existing.feedback = {
            score: event.score,
            correction: event.correction,
            timestamp: event.timestamp
          };
        } else {
          map.set(event.interaction_id, {
            interaction_id: event.interaction_id,
            timestamp: event.timestamp,
            user_message: '',
            detected_intent: 'unknown',
            adapters_queried: [],
            adapter_responses: {},
            final_reply: '',
            latency_ms: 0,
            feedback: {
              score: event.score,
              correction: event.correction,
              timestamp: event.timestamp
            }
          });
        }
      }
    }
    return Array.from(map.values());
  }

  return {
    logPath,
    recordInteraction,
    recordFeedback,
    loadEvents,
    materializeInteractions
  };
}

export const defaultLogger = createInteractionLogger();
