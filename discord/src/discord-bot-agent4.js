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

// The channel ID where the chat functionality is enabled.
// In a real application, you would check for a specific channel name or config.
const CHAT_CHANNEL_ID = process.env.CHAT_CHANNEL_ID || 'YOUR_TARGET_CHAT_CHANNEL_ID'; 

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
    const isInChatChannel = message.channel.id === CHAT_CHANNEL_ID;

    // For the MVP, let's strictly require the bot to be mentioned.
    if (!isMentioned) return;

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
        // 1. Send userQuery to AGENT 9 (Query Optimizer LLM)
        //    const optimizedQuery = await agent9LLM(userQuery); 
        
        // 2. Send optimizedQuery + AGENT 3 Persona to AGENT 3 (System Analyst LLM)
        //    const swarmResponse = await agent3LLM(optimizedQuery);
        //    (This is where the API logic from neuroswarm_chat_simulator.html goes)
        // ------------------------------------------------------------------

        // --- SIMULATION OF SWARM RESPONSE ---
        // Replace this entire section with the real API call to Gemini (Agent 3)
        // The real call must use Google Search grounding for fresh data.
        let responseText = "Agent 9 is currently simulating the response. In the live system, Agent 3 (System Analyst) would now use its optimized query to fetch real-time, grounded data via the Gemini API and deliver a concise summary.";
        let responseSources = "Simulation Source: The core logic is defined in the `neuroswarm_chat_simulator.html` file.";
        
        // Add a small artificial delay to simulate the API call latency
        await new Promise(resolve => setTimeout(resolve, 2000));
        // --- END SIMULATION ---
        
        const finalDiscordMessage = `**Swarm Report (Agent 3):**\n${responseText}\n\n---\n**Data Sources:**\n${responseSources}`;

        // 3. Send the final response back to Discord
        await message.reply(finalDiscordMessage);
        
        console.log(`[Agent 9] Response sent to channel: ${message.channel.name}`);

    } catch (error) {
        console.error('[Agent 9 ERROR] Failed to process message or send reply:', error);
        // Reply with a helpful error message without revealing internal details
        await message.reply("I'm sorry, an internal NeuroSwarm error occurred while processing your request. The system has logged the incident for review.");
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
