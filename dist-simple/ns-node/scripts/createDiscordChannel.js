#!/usr/bin/env node
"use strict";
// This script programmatically creates a channel in a Discord guild using a bot token.
// Requires: DISCORD_BOT_TOKEN and GUILD_ID environment variables.
// Use with caution - bot must have 'Manage Channels' permission.

import https from 'https';

function usageAndExit() { console.error('Usage: node createDiscordChannel.js --name channel-name --type text'); process.exit(1); }
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name') opts.name = args[++i];
    else if (args[i] === '--type') opts.type = args[++i];
    else usageAndExit();
  }
  if (!opts.name) usageAndExit();
  return opts;
}

async function createChannel(guildId, token, name, type = 'text') {
  const data = JSON.stringify({ name, type: 0 }); // 0 = GUILD_TEXT
  const options = {
    hostname: 'discord.com',
    path: `/api/v10/guilds/${guildId}/channels`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${token}`,
      'Content-Length': data.length,
    },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  const opts = parseArgs();
  const guild = process.env.GUILD_ID;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!guild || !token) {
    console.error('GUILD_ID and DISCORD_BOT_TOKEN are required environment variables.');
    process.exit(1);
  }
  const r = await createChannel(guild, token, opts.name, opts.type);
  console.log('create channel result', r);
})();
