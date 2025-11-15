import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';

// Load environment variables
config();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const SWARMBOT_ROLE_ID = process.env.SWARMBOT_ROLE_ID;

if (!DISCORD_BOT_TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN not found in environment variables');
  process.exit(1);
}

if (!GUILD_ID) {
  console.error('❌ DISCORD_GUILD_ID not found in environment variables');
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

async function checkDiscordStatus() {
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

    const guild = client.guilds.cache.get(GUILD_ID!);
    if (!guild) {
      console.error(`❌ Guild with ID ${GUILD_ID} not found. Make sure the bot is invited to the server.`);
      process.exit(1);
    }

    console.log(`🎯 Connected to server: ${guild.name} (${guild.id})`);
    console.log(`👥 Server member count: ${guild.memberCount}`);

    // Get the bot role
    if (!SWARMBOT_ROLE_ID) {
      console.error('❌ SWARMBOT_ROLE_ID not found in environment variables');
      process.exit(1);
    }

    const botRole = guild.roles.cache.get(SWARMBOT_ROLE_ID);
    if (!botRole) {
      console.error(`❌ Bot role with ID ${SWARMBOT_ROLE_ID} not found in server`);
      process.exit(1);
    }
    console.log(`🤖 Bot role: ${botRole.name} (${botRole.id})`);

    // Check channels
    console.log('\n📺 Checking channels...');
    const expectedChannels = [
      'genesis-anchors',
      'verification-results',
      'governance-logs',
      'timeline-feed',
      'audit-trail',
      'alerts-critical',
      'alerts-info',
      'system-health',
      'onboarding',
      'faq',
      'discussion',
    ];

    let allChannelsFound = true;
    for (const channelName of expectedChannels) {
      const channel = guild.channels.cache.find(c => c.name === channelName);
      if (channel) {
        console.log(`✅ Found channel: #${channelName} (${channel.id})`);

        // Check if bot can send messages to this channel
        if (channel.type === 0) { // GuildText
          const permissions = channel.permissionsFor(client.user!);
          if (permissions?.has('SendMessages')) {
            console.log(`   📝 Bot can send messages to #${channelName}`);
          } else {
            console.log(`   ❌ Bot cannot send messages to #${channelName}`);
            allChannelsFound = false;
          }
        }
      } else {
        console.log(`❌ Missing channel: #${channelName}`);
        allChannelsFound = false;
      }
    }

    // Check roles
    console.log('\n👥 Checking roles...');
    const expectedRoles = ['Founder', 'Admin', 'Contributor', 'Observer'];

    for (const roleName of expectedRoles) {
      const role = guild.roles.cache.find(r => r.name === roleName);
      if (role) {
        console.log(`✅ Found role: ${roleName} (${role.id})`);
      } else {
        console.log(`❌ Missing role: ${roleName}`);
        allChannelsFound = false;
      }
    }

    if (allChannelsFound) {
      console.log('\n🎉 Discord setup is complete and functional!');
    } else {
      console.log('\n⚠️  Some channels or roles are missing. Run setup-discord.ts to fix.');
    }

  } catch (error) {
    console.error('❌ Status check failed:', error);
    process.exit(1);
  } finally {
    client.destroy();
  }
}

// Run the status check
checkDiscordStatus();