import { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType, CategoryChannel } from 'discord.js';
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

// Category definitions
const CATEGORIES = [
  { name: 'Governance', position: 0 },
  { name: 'Alerts & Monitoring', position: 1 },
  { name: 'Community & Support', position: 2 },
];

// Role definitions with permissions
const ROLES = [
  {
    name: 'Founder',
    color: 0xFF0000, // Red
    permissions: [
      PermissionFlagsBits.Administrator,
    ],
    hoist: true,
    mentionable: true,
  },
  {
    name: 'Admin',
    color: 0xFFA500, // Orange
    permissions: [
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ManageThreads,
      PermissionFlagsBits.MentionEveryone,
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
    ],
    hoist: true,
    mentionable: true,
  },
  {
    name: 'Contributor',
    color: 0x00FF00, // Green
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.CreatePublicThreads,
      PermissionFlagsBits.CreatePrivateThreads,
      PermissionFlagsBits.SendMessagesInThreads,
    ],
    hoist: false,
    mentionable: true,
  },
  {
    name: 'Observer',
    color: 0x808080, // Gray
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.ReadMessageHistory,
    ],
    hoist: false,
    mentionable: false,
  },
];

// Channel definitions with permission overrides
const CHANNELS = [
  // Governance
  {
    name: 'genesis-anchors',
    type: ChannelType.GuildText,
    topic: 'Genesis anchoring operations and transactions',
    category: 'Governance',
    permissions: {
      Founder: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      Admin: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      Contributor: ['ViewChannel', 'ReadMessageHistory'],
      Observer: ['ViewChannel', 'ReadMessageHistory'],
    },
  },
  {
    name: 'verification-results',
    type: ChannelType.GuildText,
    topic: 'Independent verification results from contributors',
    category: 'Governance',
    permissions: {
      Founder: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      Admin: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      Contributor: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'CreatePublicThreads'],
      Observer: ['ViewChannel', 'ReadMessageHistory'],
    },
  },
  {
    name: 'governance-logs',
    type: ChannelType.GuildText,
    topic: 'Automated governance action logs (bot-only)',
    category: 'Governance',
    permissions: {
      Founder: ['ViewChannel', 'ReadMessageHistory'],
      Admin: ['ViewChannel', 'ReadMessageHistory'],
      Contributor: ['ViewChannel', 'ReadMessageHistory'],
      Observer: ['ViewChannel', 'ReadMessageHistory'],
    },
  },
  {
    name: 'timeline-feed',
    type: ChannelType.GuildText,
    topic: 'Real-time governance timeline feed (bot-only)',
    category: 'Governance',
    permissions: {
      Founder: ['ViewChannel', 'ReadMessageHistory'],
      Admin: ['ViewChannel', 'ReadMessageHistory'],
      Contributor: ['ViewChannel', 'ReadMessageHistory'],
      Observer: ['ViewChannel', 'ReadMessageHistory'],
    },
  },
  {
    name: 'audit-trail',
    type: ChannelType.GuildText,
    topic: 'Complete audit trail of all governance actions',
    category: 'Governance',
    permissions: {
      Founder: ['ViewChannel', 'ReadMessageHistory'],
      Admin: ['ViewChannel', 'ReadMessageHistory'],
      Contributor: ['ViewChannel', 'ReadMessageHistory'],
      Observer: ['ViewChannel', 'ReadMessageHistory'],
    },
  },
  // Alerts & Monitoring
  {
    name: 'alerts-critical',
    type: ChannelType.GuildText,
    topic: 'Critical system alerts and security notifications',
    category: 'Alerts & Monitoring',
    permissions: {
      Founder: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'MentionEveryone'],
      Admin: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'MentionEveryone'],
      Contributor: ['ViewChannel', 'ReadMessageHistory'],
      Observer: ['ViewChannel', 'ReadMessageHistory'],
    },
  },
  {
    name: 'alerts-info',
    type: ChannelType.GuildText,
    topic: 'Informational alerts and system updates',
    category: 'Alerts & Monitoring',
    permissions: {
      Founder: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      Admin: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      Contributor: ['ViewChannel', 'ReadMessageHistory'],
      Observer: ['ViewChannel', 'ReadMessageHistory'],
    },
  },
  {
    name: 'system-health',
    type: ChannelType.GuildText,
    topic: 'System health monitoring and status updates',
    category: 'Alerts & Monitoring',
    permissions: {
      Founder: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      Admin: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      Contributor: ['ViewChannel', 'ReadMessageHistory'],
      Observer: ['ViewChannel', 'ReadMessageHistory'],
    },
  },
  // Community & Support
  {
    name: 'onboarding',
    type: ChannelType.GuildText,
    topic: 'New contributor onboarding and getting started',
    category: 'Community & Support',
    permissions: {
      Founder: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      Admin: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      Contributor: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      Observer: ['ViewChannel', 'ReadMessageHistory'],
    },
  },
  {
    name: 'faq',
    type: ChannelType.GuildText,
    topic: 'Frequently asked questions and documentation',
    category: 'Community & Support',
    permissions: {
      Founder: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      Admin: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      Contributor: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      Observer: ['ViewChannel', 'ReadMessageHistory'],
    },
  },
  {
    name: 'discussion',
    type: ChannelType.GuildText,
    topic: 'General governance and project discussion',
    category: 'Community & Support',
    permissions: {
      Founder: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      Admin: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      Contributor: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'CreatePublicThreads'],
      Observer: ['ViewChannel', 'ReadMessageHistory'],
    },
  },
];

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

async function setupDiscordServer() {
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

    console.log(`🎯 Setting up server: ${guild.name}`);

    // Get the bot role
    if (!SWARMBOT_ROLE_ID) {
      console.error('❌ SWARMBOT_ROLE_ID not found in environment variables');
      console.error('Please set SWARMBOT_ROLE_ID to the ID of the role assigned to the bot');
      process.exit(1);
    }

    const botRole = guild.roles.cache.get(SWARMBOT_ROLE_ID);
    if (!botRole) {
      console.error(`❌ Bot role with ID ${SWARMBOT_ROLE_ID} not found in server`);
      console.error('Make sure the bot has been assigned the SwarmBot role in Discord');
      process.exit(1);
    }
    console.log(`🤖 Bot role: ${botRole.name} (${botRole.id})`);

    // Create categories
    console.log('\n📁 Creating categories...');
    const createdCategories: Record<string, CategoryChannel> = {};

    for (const categoryDef of CATEGORIES) {
      try {
        // Check if category already exists
        let category = guild.channels.cache.find(c => c.name === categoryDef.name && c.type === ChannelType.GuildCategory) as CategoryChannel;

        if (!category) {
          category = await guild.channels.create({
            name: categoryDef.name,
            type: ChannelType.GuildCategory,
          });
          console.log(`✅ Created category: ${categoryDef.name} (${category.id})`);
        } else {
          console.log(`⏭️  Category already exists: ${categoryDef.name} (${category.id})`);
        }

        // Set position
        if (category.position !== categoryDef.position) {
          await category.setPosition(categoryDef.position);
          console.log(`📍 Set position for ${categoryDef.name} to ${categoryDef.position}`);
        }

        createdCategories[categoryDef.name] = category;
      } catch (error) {
        console.error(`❌ Failed to create category ${categoryDef.name}:`, error);
      }
    }

    // Create roles
    console.log('\n👥 Creating roles...');
    const createdRoles: Record<string, any> = {};

    for (const roleDef of ROLES) {
      try {
        // Check if role already exists
        let role = guild.roles.cache.find(r => r.name === roleDef.name);

        if (!role) {
          role = await guild.roles.create({
            name: roleDef.name,
            color: roleDef.color,
            permissions: roleDef.permissions,
            hoist: roleDef.hoist,
            mentionable: roleDef.mentionable,
          });
          console.log(`✅ Created role: ${roleDef.name} (${role.id})`);
        } else {
          console.log(`⏭️  Role already exists: ${roleDef.name} (${role.id})`);
        }

        createdRoles[roleDef.name] = role;
      } catch (error) {
        console.error(`❌ Failed to create role ${roleDef.name}:`, error);
      }
    }

    // Create or update channels
    console.log('\n📺 Creating/updating channels...');

    for (const channelDef of CHANNELS) {
      try {
        // Check if channel already exists
        let channel = guild.channels.cache.find(c => c.name === channelDef.name);

        if (!channel) {
          channel = await guild.channels.create({
            name: channelDef.name,
            type: ChannelType.GuildText,
            topic: channelDef.topic,
            parent: createdCategories[channelDef.category]?.id,
          });
          console.log(`✅ Created channel: #${channelDef.name} (${channel.id})`);
        } else {
          console.log(`⏭️  Channel already exists: #${channelDef.name} (${channel.id})`);
        }

        // Always update permissions for the channel
        if (channel && channel.type === ChannelType.GuildText) {
          await setChannelPermissions(channel as any, createdRoles, channelDef.permissions, botRole);
          console.log(`🔧 Updated permissions for #${channelDef.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create/update channel #${channelDef.name}:`, error);
      }
    }

    console.log('\n🎉 Discord server setup complete!');
    console.log('\n📋 Role IDs (add to .env):');
    Object.entries(createdRoles).forEach(([name, role]) => {
      console.log(`${name.toUpperCase()}_ROLE_ID=${role.id}`);
    });

    console.log('\n📋 Channel IDs (add to .env):');
    CHANNELS.forEach(channelDef => {
      const channel = guild.channels.cache.find(c => c.name === channelDef.name);
      if (channel) {
        const envKey = channelDef.name.replace(/-/g, '_').toUpperCase() + '_CHANNEL_ID';
        console.log(`${envKey}=${channel.id}`);
      }
    });

    console.log('\n📖 Next steps:');
    console.log('1. Copy the role and channel IDs above to your .env file');
    console.log('2. Manually assign roles to server members');
    console.log('3. Test the bot with: npm run discord-status');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    client.destroy();
  }
}

async function setChannelPermissions(
  channel: any,
  roles: Record<string, any>,
  permissions: Record<string, string[]>,
  botRole: any
) {
  const permissionOverwrites = [];

  // Set permissions for each role
  for (const [roleName, rolePerms] of Object.entries(permissions)) {
    const role = roles[roleName];
    if (!role) continue;

    const allowPerms = rolePerms.map((perm: string) => PermissionFlagsBits[perm as keyof typeof PermissionFlagsBits]).filter(Boolean);
    const denyPerms = Object.values(PermissionFlagsBits).filter(perm =>
      !allowPerms.includes(perm) &&
      [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.CreatePublicThreads,
        PermissionFlagsBits.CreatePrivateThreads,
        PermissionFlagsBits.SendMessagesInThreads,
        PermissionFlagsBits.MentionEveryone,
      ].includes(perm)
    );

    permissionOverwrites.push({
      id: role.id,
      allow: allowPerms,
      deny: denyPerms,
    });
  }

  // Set permissions for the bot role
  permissionOverwrites.push({
    id: botRole.id,
    allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.EmbedLinks,
    ],
    deny: [],
  });

  // Set permissions for @everyone (deny all by default)
  permissionOverwrites.push({
    id: channel.guild.roles.everyone.id,
    allow: [],
    deny: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
    ],
  });

  await channel.edit({
    permissionOverwrites,
  });
}

// Run the setup
setupDiscordServer();