import { Client, GatewayIntentBits, TextChannel, EmbedBuilder, ChannelType } from 'discord.js';

// Simple logger for discord service
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[DISCORD] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[DISCORD ERROR] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[DISCORD WARN] ${message}`, ...args),
};

export interface AlertEntry {
  title: string;
  message: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  actor?: string;
  timestamp: string;
  relatedAnchorId?: string;
}

export interface AnchorTimelineEntry {
  action: string;
  actor: string;
  verificationStatus: 'verified' | 'failed' | 'pending' | 'error';
  timestamp: string;
  txSignature?: string;
  memoContent?: string;
  fingerprints?: Record<string, string>;
}

export class DiscordService {
  private client: Client;
  private channels: Map<string, string> = new Map();
  private isReady = false;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.setupEventHandlers();
    this.loadChannelConfiguration();
  }

  private setupEventHandlers() {
    this.client.on('ready', () => {
      logger.info(`Discord bot logged in as ${this.client.user?.tag}`);
      this.isReady = true;
    });

    this.client.on('error', (error) => {
      logger.error('Discord client error:', error);
    });

    this.client.on('disconnect', () => {
      logger.warn('Discord bot disconnected');
      this.isReady = false;
    });
  }

  private loadChannelConfiguration() {
    // Load channel mappings from environment variables
    this.channels.set('genesis-anchors', process.env.GENESIS_ANCHORS_CHANNEL_ID || '');
    this.channels.set('verification-results', process.env.VERIFICATION_RESULTS_CHANNEL_ID || '');
    this.channels.set('governance-logs', process.env.GOVERNANCE_LOGS_CHANNEL_ID || '');
    this.channels.set('alerts-critical', process.env.ALERTS_CRITICAL_CHANNEL_ID || '');
    this.channels.set('alerts-info', process.env.ALERTS_INFO_CHANNEL_ID || '');
    this.channels.set('system-health', process.env.SYSTEM_HEALTH_CHANNEL_ID || '');
    this.channels.set('onboarding', process.env.ONBOARDING_CHANNEL_ID || '');
    this.channels.set('faq', process.env.FAQ_CHANNEL_ID || '');
    this.channels.set('discussion', process.env.DISCUSSION_CHANNEL_ID || '');
    this.channels.set('timeline-feed', process.env.TIMELINE_FEED_CHANNEL_ID || '');
    this.channels.set('audit-trail', process.env.AUDIT_TRAIL_CHANNEL_ID || '');
  }

  async start() {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      logger.warn('DISCORD_BOT_TOKEN not set - Discord integration disabled');
      return;
    }

    try {
      await this.client.login(token);
    } catch (error) {
      logger.error('Failed to start Discord bot:', error);
    }
  }

  async stop() {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
    }
  }

  async sendMessage(channelKey: string, content: string, embed?: EmbedBuilder) {
    if (!this.isReady) {
      throw new Error(`Discord bot not ready, cannot send message to ${channelKey}`);
    }

    const channelId = this.channels.get(channelKey);
    if (!channelId) {
      throw new Error(`No channel configured for ${channelKey}`);
    }

    try {
      const channel = await this.client.channels.fetch(channelId) as TextChannel;
      if (!channel) {
        throw new Error(`Could not find channel ${channelId} for ${channelKey}`);
      }

      if (channel.type !== ChannelType.GuildText) {
        throw new Error(`Channel ${channelId} is not a text channel (type: ${channel.type})`);
      }

      await channel.send({ content, embeds: embed ? [embed] : [] });
      logger.info(`Sent Discord message to ${channelKey} channel`);
    } catch (error) {
      logger.error(`Failed to send Discord message to ${channelKey}:`, error);
      throw error; // Re-throw so the API call fails
    }
  }

  async sendAlert(alert: AlertEntry) {
    const channelKey = alert.severity === 'critical' ? 'alerts-critical' : 'alerts-info';

    const embed = new EmbedBuilder()
      .setTitle(`🚨 Governance Alert: ${alert.title}`)
      .setDescription(alert.message)
      .addFields(
        { name: 'Type', value: alert.type.replace(/_/g, ' ').toUpperCase(), inline: true },
        { name: 'Severity', value: alert.severity.toUpperCase(), inline: true },
        { name: 'Actor', value: alert.actor || 'System', inline: true },
        { name: 'Timestamp', value: new Date(alert.timestamp).toLocaleString(), inline: false }
      )
      .setColor(this.getSeverityColor(alert.severity))
      .setTimestamp();

    if (alert.relatedAnchorId) {
      embed.addFields({ name: 'Related Anchor ID', value: alert.relatedAnchorId, inline: false });
    }

    await this.sendMessage(channelKey, '', embed);
  }

  async sendAnchorEvent(entry: AnchorTimelineEntry) {
    const embed = new EmbedBuilder()
      .setTitle(`🏛️ Governance Anchor: ${entry.action.replace('-', ' ').toUpperCase()}`)
      .setDescription(`New governance action anchored to blockchain`)
      .addFields(
        { name: 'Action', value: entry.action.replace('-', ' ').toUpperCase(), inline: true },
        { name: 'Actor', value: entry.actor, inline: true },
        { name: 'Status', value: entry.verificationStatus.toUpperCase(), inline: true },
        { name: 'Timestamp', value: new Date(entry.timestamp).toLocaleString(), inline: false }
      )
      .setColor(this.getStatusColor(entry.verificationStatus))
      .setTimestamp();

    if (entry.txSignature) {
      const explorerUrl = `https://explorer.solana.com/tx/${entry.txSignature}`;
      embed.addFields({ name: 'Transaction', value: `[${entry.txSignature.substring(0, 8)}...](${explorerUrl})`, inline: false });
    }

    if (entry.memoContent) {
      embed.addFields({ name: 'Memo', value: entry.memoContent, inline: false });
    }

    // Add fingerprint summary
    const fingerprints = Object.entries(entry.fingerprints || {});
    if (fingerprints.length > 0) {
      const fingerprintText = fingerprints
        .slice(0, 3) // Show first 3 fingerprints
        .map(([key, value]) => `${key}: ${value.substring(0, 16)}...`)
        .join('\n');
      embed.addFields({ name: 'Fingerprints', value: `\`\`\`\n${fingerprintText}\n\`\`\``, inline: false });
    }

    await this.sendMessage('genesis-anchors', '', embed);
    await this.sendMessage('timeline-feed', '', embed);
  }

  async sendVerificationResult(result: {
    txSignature: string;
    action: string;
    result: 'verified' | 'failed' | 'error';
    details: string[];
    verifiedBy: string;
  }) {
    const statusEmoji = result.result === 'verified' ? '✅' : result.result === 'failed' ? '❌' : '⚠️';
    const explorerUrl = `https://explorer.solana.com/tx/${result.txSignature}`;

    const embed = new EmbedBuilder()
      .setTitle(`${statusEmoji} Verification Result: ${result.action.replace('-', ' ').toUpperCase()}`)
      .setDescription(`Independent verification completed`)
      .addFields(
        { name: 'Transaction', value: `[${result.txSignature}](${explorerUrl})`, inline: false },
        { name: 'Result', value: result.result.toUpperCase(), inline: true },
        { name: 'Verified By', value: result.verifiedBy, inline: true },
        { name: 'Timestamp', value: new Date().toLocaleString(), inline: true }
      )
      .setColor(result.result === 'verified' ? 0x00ff88 : result.result === 'failed' ? 0xff4444 : 0xffa500)
      .setTimestamp();

    if (result.details && result.details.length > 0) {
      embed.addFields({
        name: 'Details',
        value: result.details.map(detail => `• ${detail}`).join('\n'),
        inline: false
      });
    }

    await this.sendMessage('verification-results', '', embed);
  }

  async sendGovernanceLog(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '📝';

    const embed = new EmbedBuilder()
      .setTitle(`${emoji} Governance Log`)
      .setDescription(message)
      .setColor(level === 'error' ? 0xff4444 : level === 'warn' ? 0xffa500 : 0x00ff88)
      .setTimestamp();

    await this.sendMessage('governance-logs', '', embed);
    await this.sendMessage('audit-trail', '', embed);
  }

  async sendSystemHealth(status: {
    adminNode: boolean;
    governanceLogging: boolean;
    blockchainAnchor: boolean;
    alerts: number;
  }) {
    const embed = new EmbedBuilder()
      .setTitle('🏥 System Health Check')
      .setDescription('Automated health monitoring report')
      .addFields(
        { name: 'Admin Node', value: status.adminNode ? '✅ Operational' : '❌ Down', inline: true },
        { name: 'Governance Logging', value: status.governanceLogging ? '✅ Active' : '❌ Inactive', inline: true },
        { name: 'Blockchain Anchor', value: status.blockchainAnchor ? '✅ Verified' : '⚠️ Check Status', inline: true },
        { name: 'Active Alerts', value: status.alerts === 0 ? '✅ None' : `⚠️ ${status.alerts} active`, inline: false }
      )
      .setColor(status.adminNode && status.governanceLogging ? 0x00ff88 : 0xffa500)
      .setTimestamp();

    await this.sendMessage('system-health', '', embed);
  }

  async sendOnboardingGuide() {
    await this.sendMessage('onboarding', '🚀 **NeuroSwarm Contributor Onboarding Guide**\n\nWelcome to NeuroSwarm! Here\'s how to get started with governance verification:\n\n1. **Verify Genesis**: Run `npm run verify-governance <TX_SIG> genesis`\n2. **Check Timeline**: View at `/governance-timeline` in admin dashboard\n3. **Monitor Alerts**: Watch #alerts-critical and #alerts-info\n4. **Independent Verification**: Always verify with Solana Explorer\n\nAll governance actions are blockchain-verified for transparency.');

    // Send test messages to multiple channels to confirm visibility
    await this.sendMessage('system-health', '🤖 Discord integration test: If you can see this message, the bot is working correctly!');
    await this.sendMessage('alerts-info', '🤖 Discord integration test: Testing alerts-info channel visibility.');

    const embed = new EmbedBuilder()
      .setTitle('🚀 NeuroSwarm Contributor Onboarding')
      .setDescription('Welcome to NeuroSwarm! Here\'s how to get started with governance verification.')
      .addFields(
        {
          name: '1. Verify Genesis',
          value: 'Run `npm run verify-governance <TX_SIG> genesis` to verify the genesis anchor',
          inline: false
        },
        {
          name: '2. Check Timeline',
          value: 'View all governance actions at `/governance-timeline` in the admin dashboard',
          inline: false
        },
        {
          name: '3. Monitor Alerts',
          value: 'Watch for governance alerts in the #alerts-critical and #alerts-info channels',
          inline: false
        },
        {
          name: '4. Independent Verification',
          value: 'Always verify transactions independently using the Solana Explorer links',
          inline: false
        }
      )
      .setColor(0x00ff88)
      .setFooter({ text: 'All governance actions are blockchain-verified for transparency' });

    await this.sendMessage('onboarding', '', embed);
  }

  private getSeverityColor(severity: string): number {
    switch (severity) {
      case 'critical': return 0xff4444;
      case 'warning': return 0xffa500;
      case 'info': return 0x4444ff;
      default: return 0x666666;
    }
  }

  private getStatusColor(status: string): number {
    switch (status) {
      case 'verified': return 0x00ff88;
      case 'failed': return 0xff4444;
      case 'pending': return 0xffa500;
      case 'error': return 0xff4444;
      default: return 0x666666;
    }
  }

  isConnected(): boolean {
    return this.isReady;
  }
}

// Export singleton instance
export const discordService = new DiscordService();