/**
 * Agent 9: Discord Integration Developer - NeuroSwarm Bi-Directional Chat
 *
 * This file provides the core Node.js boilerplate for a Discord bot,
 * demonstrating the bi-directional communication necessary for the Swarm Chat feature.
 *
 * It uses the 'discord.js' library (the standard for Node.js bots).
 *
 * NOTE: This code is a template. A real bot requires a valid Discord Bot Token
 * and must be run on a persistent server (e.g., AWS, Render, Heroku).
 */
const { Client, GatewayIntentBits } = require('discord.js');
const { submitGovernanceVote, ingestArtifactFromFile } = require('./lib/network_ingestion');
const { validateAttachment } = require('./lib/file_validation');
// In a real project, replace 'require' with 'import' if using ES Modules
// and ensure you install discord.js (npm install discord.js)

// --- CONFIGURATION ---

// CRITICAL: The Bot Token must be securely stored (e.g., in an environment variable).
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || 'YOUR_SECRET_BOT_TOKEN_HERE'; 

// Agent 9 Application ID and Public Key (for verification)
const AGENT9_APP_ID = process.env.AGENT9_APP_ID || '1445902568038334556';
const AGENT9_PUBLIC_KEY = process.env.AGENT9_PUBLIC_KEY || 'e417ce8b6f802cc2a776201c943a32bbe7cea6beac05a87c0081dd503dfc6ee3';

// NS-LLM Server Configuration
const NS_LLM_URL = process.env.NS_LLM_URL || 'http://localhost:3015';

// The channel name where the chat functionality is enabled.
const CHAT_CHANNEL_NAME = process.env.CHAT_CHANNEL_NAME || 'chat-with-agent-9';
// Artifact channel can be configured either by ID (preferred) or by name
const ARTIFACT_CHANNEL_ID = process.env.ARTIFACT_CHANNEL_ID || null;
const ARTIFACT_CHANNEL_NAME = process.env.ARTIFACT_CHANNEL_NAME || 'artifacts';

// --- INITIALIZATION ---

// Intents are crucial: they define what events the bot listens to.
// We need GUILDS (to join the server) and MESSAGE_CONTENT (to read messages).
const client = new Client({ 
    try {
        // Artifact channel: enforce strict validation (size/type) and sanitize filenames
        const isArtifactChannel = (ARTIFACT_CHANNEL_ID && message.channelId === ARTIFACT_CHANNEL_ID) || message.channel.name === ARTIFACT_CHANNEL_NAME;
        if (isArtifactChannel && message.attachments && message.attachments.size > 0) {
            const attachment = message.attachments.first();
            const rawFileName = attachment.name || 'upload.bin';
            const userId = message.author.id;

            // Validate using shared helper (this keeps the handler thin and testable)
            const validation = validateAttachment(attachment);
            if (!validation.valid) {
                if (validation.reason === 'size_exceeds_limit') {
                    const MAX_UPLOAD_BYTES = Number(process.env.MAX_FILE_UPLOAD_BYTES || 5 * 1024 * 1024);
                    await message.reply(`❌ File too large — max ${Math.round(MAX_UPLOAD_BYTES/1024/1024)} MB allowed. Please reduce the file size and try again.`);
                    return;
                }
                if (validation.reason === 'invalid_extension') {
                    const ALLOWED_EXT = (process.env.ALLOWED_FILE_EXTENSIONS || '.png,.jpg,.jpeg,.gif,.txt,.md,.pdf');
                    await message.reply(`❌ Unsupported file type. Allowed: ${ALLOWED_EXT}`);
                    return;
                }
                // generic
                await message.reply('❌ Invalid file upload.');
                return;
            }

            // Indicate we accepted the upload and will verify content
            await message.react('👀');
            try {
                const fileResponse = await fetch(attachment.url);
                if (!fileResponse.ok) throw new Error(`failed to download: ${fileResponse.status} ${fileResponse.statusText}`);

                // If server reports content-length and we didn't have reportedSize, check it
                const contentLength = fileResponse.headers && fileResponse.headers.get ? fileResponse.headers.get('content-length') : null;
                if (!reportedSize && contentLength && Number(contentLength) > MAX_UPLOAD_BYTES) {
                    await message.reply(`❌ File too large when downloaded — maximum ${Math.round(MAX_UPLOAD_BYTES/1024/1024)} MB.`);
                    return;
                }

                const buf = await fileResponse.buffer();
                if (buf.length > MAX_UPLOAD_BYTES) {
                    await message.reply(`❌ File too large after download — maximum ${Math.round(MAX_UPLOAD_BYTES/1024/1024)} MB.`);
                    return;
                }

                // Use sanitized filename from validator (or fallback)
                const safeName = validation.safeName || rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);

                // Ingest to Router/IPFS (ingestArtifactFromFile handles IPFS API config internally)
                const ingest = await ingestArtifactFromFile(buf, safeName, userId);
                const artifactCid = (ingest && ingest.result && ingest.result.artifact_cid) ? ingest.result.artifact_cid : ingest.cid;
                await message.reply({ content: `✅ **Artifact Anchored!** The Router API accepted your file \`${safeName}\`. Content CID: \`${artifactCid}\`` });
            } catch (ingestErr) {
                console.error('[A9-02] artifact ingestion failed', ingestErr && ingestErr.message);
                await message.reply(`❌ Artifact ingestion failed: ${ingestErr && ingestErr.message}`);
            }

            return; // don't fall through to LLM handling
        }
    } catch (ex) {
        console.warn('[A9-02] artifact channel check failed', ex && ex.message);
    }
            { name: 'proposal_id', type: 3, description: 'The ID of the proposal', required: true },
            { name: 'vote', type: 3, description: "Your vote: YEA, NAY, or ABSTAIN", required: true }
        ]
    }]).catch(e => console.warn('Failed to register slash commands', e && e.message));
});

/**
 * Event: handle slash commands — particularly /vote for governance submissions
 */
client.on('interactionCreate', async interaction => {
    try {
        if (!interaction.isCommand()) return;
        if (interaction.commandName !== 'vote') return;

        await interaction.deferReply({ ephemeral: true });
        const proposalId = interaction.options.getString('proposal_id');
        const vote = interaction.options.getString('vote');
        const userId = interaction.user.id;

        console.log(`[A9-03] User ${userId} voting on ${proposalId} -> ${vote}`);

        try {
            const data = await submitGovernanceVote({ proposalId, vote, userId, context: `Discord vote by ${interaction.user.tag}` });
            await interaction.editReply({ content: `✅ Vote accepted and queued (tx: ${data.transaction_id})`, ephemeral: true });
        } catch (e) {
            console.error('[A9-03] submitGovernanceVote failed', e && e.message);
            await interaction.editReply({ content: `❌ Vote failed: ${e.message}`, ephemeral: true });
        }

    } catch (err) {
        console.error('[interactionCreate] handler error', err && err.message);
    }
});

/**
 * Event: Handle incoming messages. This is the core of the bi-directional chat.
 * @param {Message} message The incoming message object.
 */
client.on('messageCreate', async message => {
    // 1. Ignore messages from bots (including itself) to prevent loops
    if (message.author.bot) return;

    // 2. If this message is in the artifact channel, handle file ingestion (A9-02)
    try {
        const isArtifactChannel = (ARTIFACT_CHANNEL_ID && message.channelId === ARTIFACT_CHANNEL_ID) || message.channel.name === ARTIFACT_CHANNEL_NAME;
        if (isArtifactChannel && message.attachments && message.attachments.size > 0) {
            const attachment = message.attachments.first();
            const fileName = attachment.name || 'upload.bin';
            const userId = message.author.id;

            await message.react('👀');
            try {
                const fileResponse = await fetch(attachment.url);
                if (!fileResponse.ok) throw new Error(`failed to download: ${fileResponse.statusText}`);
                const buf = await fileResponse.buffer();
                const ingest = await ingestArtifactFromFile(buf, fileName, userId);
                const artifactCid = (ingest && ingest.result && ingest.result.artifact_cid) ? ingest.result.artifact_cid : ingest.cid;
                await message.reply({ content: `✅ **Artifact Anchored!** The Router API accepted your file \\`${fileName}\\`. Content CID: \\`${artifactCid}\\`` });
            } catch (ingestErr) {
                console.error('[A9-02] artifact ingestion failed', ingestErr && ingestErr.message);
                await message.reply(`❌ Artifact ingestion failed: ${ingestErr && ingestErr.message}`);
            }
            return; // don't fall through to LLM handling
        }
    } catch (ex) {
        console.warn('[A9-02] artifact channel check failed', ex && ex.message);
    }

    // 3. Determine if the message is relevant for the NeuroSwarm chat
    // We only respond if the bot is explicitly mentioned in the message OR
    // if the message is in the designated chat channel.
    const isMentioned = message.mentions.users.has(client.user.id);
    const isInChatChannel = message.channel.name === CHAT_CHANNEL_NAME;

    // Respond if mentioned OR if in the dedicated chat channel
    if (!isMentioned && !isInChatChannel) return;

    // Strip the mention from the content to get the clean query
    let userQuery = message.content.replace(`<@${client.user.id}>`, '').trim();

    if (!userQuery) {
        // If the user just mentioned the bot without a question
        message.reply("Hello! I am NeuroSwarm System Analyst (Agent 3). Ask me a specific, data-driven question, and I will find the latest insights for you.");
        return;
    }

    // Acknowledge the message immediately to show the bot is 'thinking'
    await message.channel.sendTyping(); 
    
    console.log(`[Agent 9] Processing Query from ${message.author.tag}: "${userQuery}"`);

    try {
        // ------------------------------------------------------------------
        // AGENT 9 Orchestration Layer:
        // Call NS-LLM to generate AI-powered response
        // ------------------------------------------------------------------

        let responseText;
        let errorOccurred = false;

        try {
            // Try streaming first for a faster UX; fallback to non-streaming if the service doesn't support it.
            const http = require('http');
            const https = require('https');
            const { URL } = require('url');

            const prompt = `You are Agent 3, the NeuroSwarm System Analyst. Provide a concise, data-driven answer to this question: ${userQuery}`;

            // Create an initial message so we can edit it while streaming tokens
            const initialMsg = await message.reply('Generating answer...');

            try {
                const u = new URL(`${NS_LLM_URL}/api/generate`);
                const payload = JSON.stringify({ text: prompt, max_tokens: 500, stream: true });
                const opts = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload)
                    }
                };

                const client = u.protocol === 'https:' ? https : http;

                const req = client.request(u, opts, res => {
                    if (res.statusCode !== 200) {
                        // fallback to non-stream pathway
                        throw new Error(`NS-LLM returned ${res.statusCode}`);
                    }

                    res.setEncoding('utf8');
                    let buffer = '';
                    let assembled = '';

                    res.on('data', chunk => {
                        buffer += chunk;

                        // Process complete SSE events
                        while (true) {
                            const idx = buffer.indexOf('\n\n');
                            if (idx === -1) break;
                            const raw = buffer.slice(0, idx).trim();
                            buffer = buffer.slice(idx + 2);

                            const lines = raw.split('\n');
                            let event = 'message';
                            let dataLines = [];
                            for (const l of lines) {
                                const m = l.match(/^event:\s*(.+)$/);
                                if (m) { event = m[1]; continue; }
                                const md = l.match(/^data:\s*(.*)$/);
                                if (md) dataLines.push(md[1]);
                            }

                            const dataStr = dataLines.join('\n');
                            let parsed = null;
                            try { parsed = JSON.parse(dataStr); } catch (e) { parsed = dataStr; }

                            if (event === 'token') {
                                const token = parsed && parsed.token ? parsed.token : (typeof parsed === 'string' ? parsed : '');
                                assembled += token;

                                // edit message with partial content (throttled by token arrival)
                                initialMsg.edit(`**Swarm Report (streaming):**\n\n${assembled}`)
                                    .catch(e => console.warn('edit failed', e && e.message));
                            }

                            if (event === 'meta') {
                                // can optionally log meta
                                console.debug('[NS-LLM meta]', parsed);
                            }

                            if (event === 'done') {
                                // finalize
                                responseText = assembled || parsed && parsed.text;
                                // once done, ensure final edited message contains final text
                                initialMsg.edit(`**Swarm Report (Agent 3 via NS-LLM):**\n\n${responseText}\n\n---\n**Powered by:** NeuroSwarm Local LLM (Ollama)`)
                                    .catch(e => console.warn('edit failed', e && e.message));
                            }
                        }
                    });

                    res.on('end', () => {
                        // If the stream closed without 'done', fallback if we didn't get tokens
                        if (!responseText && assembled) responseText = assembled;
                    });
                });

                req.on('error', (err) => { throw err; });
                req.write(payload);
                req.end();

                // Wait for a short fixed window to collect stream (give it time) and then continue
                // If streaming completes it will have edited the message above.
                // We'll wait up to 10 seconds for the stream to produce a result; otherwise fallback.
                await new Promise((resolve) => setTimeout(resolve, 1000));

                // If streaming produced nothing after timeout, attempt non-stream fallback
                if (!responseText) {
                    // fallback to a single request
                    const fallbackRes = await fetch(`${NS_LLM_URL}/api/generate`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: prompt, max_tokens: 500, stream: false })
                    });
                    if (fallbackRes.ok) {
                        const data = await fallbackRes.json();
                        responseText = data.response || data.text || "I couldn't generate a response.";
                        await initialMsg.edit(`**Swarm Report (Agent 3 via NS-LLM):**\n\n${responseText}\n\n---\n**Powered by:** NeuroSwarm Local LLM (Ollama)`);
                    }
                }

            } catch (streamErr) {
                console.warn('[Agent9] streaming attempt failed, falling back to synchronous call:', streamErr && streamErr.message);
                // fallback: regular request
                const response = await fetch(`${NS_LLM_URL}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: prompt, max_tokens: 500, stream: false }) });
                if (!response.ok) throw new Error(`NS-LLM returned ${response.status}`);
                const data = await response.json();
                responseText = data.response || data.text || "I couldn't generate a response.";
                await initialMsg.edit(`**Swarm Report (Agent 3 via NS-LLM):**\n\n${responseText}\n\n---\n**Powered by:** NeuroSwarm Local LLM (Ollama)`);
            }

        } catch (llmError) {
            console.error('[Agent 9] NS-LLM connection error:', llmError.message);
            errorOccurred = true;
            responseText = "⚠️ **NS-LLM is currently offline**\n\nThe NeuroSwarm local LLM service is not responding. Please ensure:\n• NS-LLM is running on port 3015\n• Ollama service is active\n• Run `start-ns-llm.bat` to start the service\n\nI'll be back online once NS-LLM is available!";
        }
        
        const finalDiscordMessage = errorOccurred 
            ? responseText 
            : `**Swarm Report (Agent 3 via NS-LLM):**\n${responseText}\n\n---\n**Powered by:** NeuroSwarm Local LLM (Ollama)`;

        // Send the final response back to Discord
        await message.reply(finalDiscordMessage);
        
        console.log(`[Agent 9] Response sent to channel: ${message.channel.name}`);

    } catch (error) {
        console.error('[Agent 9 ERROR] Failed to process message or send reply:', error);
        // Reply with a helpful error message without revealing internal details
        await message.reply("⚠️ I'm sorry, an internal NeuroSwarm error occurred while processing your request. The system has logged the incident for review.");
    }
});

/**
 * Event: Handle connection errors.
 */
client.on('error', error => {
    console.error('[CRITICAL DISCORD ERROR]:', error);
});


// --- LOGIN ---
client.login(DISCORD_BOT_TOKEN)
    .catch(err => {
        console.error(`[CRITICAL LOGIN FAILURE] Agent 9 could not connect to Discord. 
        Ensure the DISCORD_BOT_TOKEN is correct and the bot has necessary intents enabled. Error:`, err);
    });
