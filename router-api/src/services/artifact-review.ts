import axios from 'axios';

// Use shared NS-LLM client for generating reviews
const nsLlmModulePath = '../../shared/ns-llm-client.js';

export async function fetchArtifactContent(artifactId: string) {
  // Candidate endpoints (in order): ARTIFACT_STORE_URL, NS_NODE_URL, IPFS gateway
  const candidates = [] as string[];
  if (process.env.ARTIFACT_STORE_URL) candidates.push(process.env.ARTIFACT_STORE_URL);
  if (process.env.NS_NODE_URL) candidates.push(process.env.NS_NODE_URL);
  // public ipfs gateway fallback
  candidates.push('https://ipfs.io');

  // Attempt a few common paths
  const paths = [
    (base: string) => `${base.replace(/\/$/, '')}/api/v1/artifact/${artifactId}`,
    (base: string) => `${base.replace(/\/$/, '')}/artifact/${artifactId}`,
    (base: string) => `${base.replace(/\/$/, '')}/ipfs/${artifactId}`,
    (base: string) => `${base.replace(/\/$/, '')}/ipfs/${artifactId}`
  ];

  for (const base of candidates) {
    for (const pfn of paths) {
      const url = pfn(base);
      try {
        const r = await axios.get(url, { timeout: 3000 });
        if (r && r.status === 200) return typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
      } catch (e) {
        // ignore and try next
      }
    }
  }

  // If nothing found, try ipfs gateway direct path
  try {
    const r = await axios.get(`https://ipfs.io/ipfs/${artifactId}`, { timeout: 3000 });
    if (r && r.status === 200) return typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
  } catch (e) {}

  return null;
}

function ensureStructured(obj: any) {
  if (!Array.isArray(obj)) return false;
  return obj.every(i => typeof i.comment === 'string' && typeof i.severity === 'string');
}

export async function reviewArtifactHandler(req: any, res: any) {
  try {
    const { artifactId, model } = req.body || {};
    if (!artifactId) return res.status(400).json({ error: 'artifactId required' });

    // fetch artifact content
    const content = await fetchArtifactContent(artifactId);
    if (!content) return res.status(404).json({ error: 'artifact_not_found' });

    // Build a review prompt for the NS-LLM. Keep it short and ask for strict JSON output
    const systemPrompt = `You are a world-class code and document reviewer. Given the artifact content below, produce a JSON array where each item is an object with: severity (info|minor|major|critical), optional line_number (integer), and comment (string). Return only the JSON array and nothing else.`;
    const userPrompt = `ARTIFACT_ID: ${artifactId}\n\nCONTENT:\n${content}`;

    // Import the shared client dynamically (so tests can mock it)
    const nsMod = await import(nsLlmModulePath);
    const nsClient = nsMod && nsMod.default ? nsMod.default : nsMod;

    const generation = await nsClient.generate(`${systemPrompt}\n\n${userPrompt}`, { maxTokens: 2048, timeout: 30000 });

    // generation might be an object or text string with JSON
    let parsed = null;
    if (typeof generation === 'string') {
      try { parsed = JSON.parse(generation); } catch (e) { parsed = null; }
    } else if (generation && typeof generation === 'object') {
      if (generation.text && typeof generation.text === 'string') {
        try { parsed = JSON.parse(generation.text); } catch (e) { parsed = null; }
      } else if (Array.isArray(generation)) parsed = generation;
      else if (generation.critique) parsed = generation.critique;
    }

    if (!parsed || !ensureStructured(parsed)) {
      return res.status(502).json({ error: 'invalid_llm_response', raw: generation });
    }

    return res.status(200).json({ artifactId, critique: parsed });

  } catch (err: any) {
    console.error('artifact review failed', err && err.message);
    return res.status(500).json({ error: 'internal_error', detail: err && err.message });
  }
}

export default { fetchArtifactContent, reviewArtifactHandler };
