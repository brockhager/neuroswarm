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
// In a real project, replace 'require' with 'import' if using ES Modules
// and ensure you install discord.js (npm install discord.js)

// --- CONFIGURATION ---

// CRITICAL: The Bot Token must be securely stored (e.g., in an environment variable).
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || 'YOUR_SECRET_BOT_TOKEN_HERE'; 

// Agent 9 Application ID and Public Key (for verification)
const AGENT9_APP_ID = process.env.AGENT9_APP_ID || '1445902568038334556';
const AGENT9_PUBLIC_KEY = process.env.AGENT9_PUBLIC_KEY || 'e417ce8b6f802cc2a776201c943a32bbe7cea6beac05a87c0081dd503dfc6ee3';

// NS-LLM Server Configuration
const NS_LLM_URL = process.env.NS_LLM_URL || 'http://localhost:8080';

// The channel name where the chat functionality is enabled.
const CHAT_CHANNEL_NAME = process.env.CHAT_CHANNEL_NAME || 'chat-with-agent-9';

// --- INITIALIZATION ---

// Intents are crucial: they define what events the bot listens to.
// We need GUILDS (to join the server) and MESSAGE_CONTENT (to read messages).
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ] 
});

// --- EVENT HANDLERS ---

/**
 * Event: Bot is ready and connected to Discord.
 */
client.on('ready', () => {
    console.log(`[Agent 9] Bot is logged in as ${client.user.tag}!`);
    console.log(`[Agent 9] Application ID: ${AGENT9_APP_ID}`);
    console.log(`Ready to listen for messages in configured channels.`);
    // Set an activity status to show the bot is live
    client.user.setActivity('Monitoring Swarm Data');
});

/**
 * Event: Handle incoming messages. This is the core of the bi-directional chat.
 * @param {Message} message The incoming message object.
 */
client.on('messageCreate', async message => {
    // 1. Ignore messages from bots (including itself) to prevent loops
    if (message.author.bot) return;

    // 2. Determine if the message is relevant for the NeuroSwarm chat
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
            const response = await fetch(`${NS_LLM_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `You are Agent 3, the NeuroSwarm System Analyst. Provide a concise, data-driven answer to this question: ${userQuery}`,
                    max_tokens: 500,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`NS-LLM returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            responseText = data.response || data.text || "I apologize, but I couldn't generate a response.";
        } catch (llmError) {
            console.error('[Agent 9] NS-LLM connection error:', llmError.message);
            errorOccurred = true;
            responseText = "⚠️ **NS-LLM is currently offline**\n\nThe NeuroSwarm local LLM service is not responding. Please ensure:\n• NS-LLM is running on port 8080\n• Ollama service is active\n• Run `start-ns-llm.bat` to start the service\n\nI'll be back online once NS-LLM is available!";
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
