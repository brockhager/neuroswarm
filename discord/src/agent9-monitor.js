/**
 * Agent 9 Status Monitor - Discord Presence Service
 * 
 * This script monitors Discord for mentions of Agent 9 when the bot is offline
 * and posts a status message to let users know the bot is unavailable.
 * 
 * NOTE: This requires a separate monitoring bot or webhook integration.
 * For now, Discord's native "offline" status will indicate when Agent 9 is down.
 */

const { Client, GatewayIntentBits } = require('discord.js');

// This would be a separate monitoring bot token
const MONITOR_BOT_TOKEN = process.env.MONITOR_BOT_TOKEN || 'YOUR_MONITOR_BOT_TOKEN';
const AGENT9_USER_ID = process.env.AGENT9_APP_ID || '1445902568038334556';

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ] 
});

client.on('ready', () => {
    console.log(`[Agent 9 Monitor] Monitoring for offline mentions`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Check if Agent 9 was mentioned
    const mentionsAgent9 = message.content.includes(`<@${AGENT9_USER_ID}>`);
    
    if (mentionsAgent9) {
        // Check if Agent 9 is online by looking at guild members
        const guild = message.guild;
        const agent9Member = await guild.members.fetch(AGENT9_USER_ID).catch(() => null);
        
        if (!agent9Member || agent9Member.presence?.status === 'offline') {
            await message.reply(
                "⚠️ **Agent 9 is currently offline**\n\n" +
                "The Discord integration bot is not running. To bring Agent 9 online:\n" +
                "• Run `start-discord-bot.bat` from the NeuroSwarm `/start/` directory\n" +
                "• Ensure the bot token is configured in `.env`\n\n" +
                "Agent 9 will respond automatically once the service is started."
            );
        }
    }
});

// Note: This monitoring approach is optional and requires a separate bot
// Discord's built-in offline status is usually sufficient
console.log('[Agent 9 Monitor] This is an optional monitoring service.');
console.log('[Agent 9 Monitor] Discord\'s native offline status indicators are recommended instead.');

// Uncomment to enable monitoring:
// client.login(MONITOR_BOT_TOKEN);
