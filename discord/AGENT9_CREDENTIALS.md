# Agent 9 Discord Bot Credentials

## Application Details

**Application ID**: `1445902568038334556`

**Public Key**: `e417ce8b6f802cc2a776201c943a32bbe7cea6beac05a87c0081dd503dfc6ee3`

## Setup Instructions

### 1. Environment Variables

Add these to your `.env` file or set as environment variables:

```bash
AGENT9_APP_ID=1445902568038334556
AGENT9_PUBLIC_KEY=e417ce8b6f802cc2a776201c943a32bbe7cea6beac05a87c0081dd503dfc6ee3
DISCORD_BOT_TOKEN=<your_bot_token_here>
CHAT_CHANNEL_NAME=chat-with-agent-9
```

### 2. Bot Permissions

Required Discord Bot Permissions:
- Read Messages/View Channels
- Send Messages
- Read Message History
- Mention Everyone (optional)
- Embed Links
- Attach Files
- Use External Emojis

**Permission Integer**: `412317248576`

### 3. Bot Invite URL

```
https://discord.com/api/oauth2/authorize?client_id=1445902568038334556&permissions=412317248576&scope=bot%20applications.commands
```

### 4. Required Intents

In Discord Developer Portal, enable these Privileged Gateway Intents:
- ✅ **MESSAGE CONTENT INTENT** (required to read message content)
- ✅ Presence Intent (optional)
- ✅ Server Members Intent (optional)

### 5. Starting the Bot

```powershell
# Using batch script
.\start\start-discord-bot.bat

# Or directly with Node.js
cd discord
node src/discord-bot-agent9.js
```

## OAuth2 URL Generator Settings

When generating the invite URL in Discord Developer Portal:

**Scopes**:
- `bot`
- `applications.commands`

**Bot Permissions**:
- Send Messages
- Read Messages/View Channels
- Read Message History
- Embed Links
- Attach Files

## Security Notes

⚠️ **Never commit the bot token to Git**
⚠️ Keep the public key secure but it's safe to share publicly
⚠️ The Application ID is public and used for bot invites
⚠️ Always use environment variables for sensitive credentials

## Verification

After bot joins your server:
1. Check that Agent 9 appears in the member list
2. Go to `#chat-with-agent-9` channel
3. Send a test message
4. Bot should respond automatically

## Troubleshooting

**Bot not responding?**
- Verify MESSAGE CONTENT INTENT is enabled in Discord Developer Portal
- Check that bot has permissions in the channel
- Verify DISCORD_BOT_TOKEN is correct
- Check console logs for errors

**"Invalid Token" error?**
- Regenerate token in Discord Developer Portal
- Update DISCORD_BOT_TOKEN environment variable
- Restart the bot

---

*Last Updated: December 3, 2025*
