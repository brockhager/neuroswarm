import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import { config } from 'dotenv';

// Load environment variables
config();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

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

async function organizeDiscordChannels() {
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
      throw new Error(`Guild with ID ${GUILD_ID} not found. Make sure the bot is invited to the server.`);
    }

    console.log(`🎯 Organizing channels in: ${guild.name}`);

    // Get categories
    const governanceCategory = guild.channels.cache.find(c => c.name === 'Governance' && c.type === ChannelType.GuildCategory);
    const alertsCategory = guild.channels.cache.find(c => c.name === 'Alerts & Monitoring' && c.type === ChannelType.GuildCategory);
    const communityCategory = guild.channels.cache.find(c => c.name === 'Community & Support' && c.type === ChannelType.GuildCategory);

    if (!governanceCategory || !alertsCategory || !communityCategory) {
      console.error('❌ Missing required categories. Run setup-discord.ts first.');
      process.exit(1);
    }

    console.log('📁 Found categories:');
    console.log(`   Governance: ${governanceCategory.id}`);
    console.log(`   Alerts & Monitoring: ${alertsCategory.id}`);
    console.log(`   Community & Support: ${communityCategory.id}`);

    // Define channel organization
    const channelOrganization = {
      'Governance': [
        'genesis-anchors',
        'verification-results',
        'governance-logs',
        'timeline-feed',
        'audit-trail',
      ],
      'Alerts & Monitoring': [
        'alerts-critical',
        'alerts-info',
        'system-health',
      ],
      'Community & Support': [
        'onboarding',
        'faq',
        'discussion',
      ],
    };

    // Organize channels into categories
    for (const [categoryName, channelNames] of Object.entries(channelOrganization)) {
      const category = categoryName === 'Governance' ? governanceCategory :
                      categoryName === 'Alerts & Monitoring' ? alertsCategory :
                      communityCategory;

      console.log(`\n📂 Organizing ${categoryName} category...`);

      for (let i = 0; i < channelNames.length; i++) {
        const channelName = channelNames[i];
        const channel = guild.channels.cache.find(c => c.name === channelName);

        if (channel && channel.type === ChannelType.GuildText) {
          // Set parent category
          if (channel.parentId !== category.id) {
            await channel.setParent(category.id);
            console.log(`   ✅ Moved #${channelName} to ${categoryName}`);
          } else {
            console.log(`   ⏭️  #${channelName} already in ${categoryName}`);
          }

          // Set position within category
          if (channel.position !== i) {
            await channel.setPosition(i);
            console.log(`   📍 Set position of #${channelName} to ${i}`);
          }
        } else {
          console.log(`   ❌ Channel #${channelName} not found or not a text channel`);
        }
      }
    }

    console.log('\n🎉 Channel organization complete!');

  } catch (error) {
    console.error('❌ Organization failed:', error);
    process.exit(1);
  } finally {
    client.destroy();
  }
}

// Run the organization
organizeDiscordChannels();