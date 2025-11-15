import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';

// Load environment variables
config();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const ONBOARDING_CHANNEL_ID = process.env.ONBOARDING_CHANNEL_ID;
const GENESIS_ANCHORS_CHANNEL_ID = process.env.GENESIS_ANCHORS_CHANNEL_ID;

if (!DISCORD_BOT_TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN not found in environment variables');
  process.exit(1);
}

if (!ONBOARDING_CHANNEL_ID) {
  console.error('❌ ONBOARDING_CHANNEL_ID not found in environment variables');
  process.exit(1);
}

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

async function testDiscordMessage() {
  try {
    console.log('🤖 Connecting to Discord...');

    // Wait for client to be ready
    await new Promise<void>((resolve, reject) => {
      client.once('ready', () => {
        console.log(`✅ Connected as ${client.user?.tag}`);
        resolve();
      });

      client.once('error', reject);

      client.login(DISCORD_BOT_TOKEN);
    });

    console.log('📝 Testing message send to #genesis-anchors...');

    if (!GENESIS_ANCHORS_CHANNEL_ID) {
      throw new Error('GENESIS_ANCHORS_CHANNEL_ID is not set');
    }

    const channel = await client.channels.fetch(GENESIS_ANCHORS_CHANNEL_ID);
    if (!channel || channel.type !== 0) { // GuildText
      throw new Error('Could not find onboarding channel or it is not a text channel');
    }

    await channel.send('🤖 **Discord Integration Test**\n\nThis is a test message to verify the bot can send messages to the onboarding channel. If you can see this message, the basic permissions are working!');

    console.log('✅ Test message sent successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    client.destroy();
  }
}

// Run the test
testDiscordMessage();