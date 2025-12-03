@echo off
echo Starting Discord Bot (Agent 9 Integration)...
echo.

cd /d "%~dp0..\discord"
if not exist "package.json" (
    echo ERROR: discord directory not found or package.json missing
    pause
    exit /b 1
)

echo Discord Bot will connect to configured channels
echo.
echo NOTE: Requires DISCORD_BOT_TOKEN and CHAT_CHANNEL_ID environment variables
echo.
echo Configuration:
echo   DISCORD_BOT_TOKEN: %DISCORD_BOT_TOKEN%
echo   CHAT_CHANNEL_NAME: %CHAT_CHANNEL_NAME% (default: chat-with-agent-9)
echo.

if "%DISCORD_BOT_TOKEN%"=="" (
    echo WARNING: DISCORD_BOT_TOKEN not set. Bot will not be able to connect.
    echo Please set the environment variable before running.
    echo.
    echo Example:
    echo   set DISCORD_BOT_TOKEN=your_token_here
    echo   set CHAT_CHANNEL_NAME=chat-with-agent-9
    echo.
    pause
)

node src/discord-bot-agent9.js
