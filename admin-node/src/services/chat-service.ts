import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../index';
import { governanceLogger } from './governance-logger';

export interface ChatMessage {
  id: string;
  timestamp: string;
  contributorId: string;
  text: string;
  channel?: string;
  threadId?: string;
  attachments?: Array<{ filename: string; sha256: string }>; // file references by sha
}

export class ChatService {
  private chatPath: string;
  private logger: any;

  constructor(logger?: any, chatPath?: string) {
    this.logger = logger || console;
    this.chatPath = chatPath || path.join(process.cwd(), '..', 'governance-chat.jsonl');
  }

  public sendMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): string {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const msg: ChatMessage = {
      id,
      timestamp,
      ...message,
    };

    try {
      fs.appendFileSync(this.chatPath, JSON.stringify(msg) + '\n');
      this.logger.info(`Chat message saved: ${msg.id} by ${msg.contributorId}`);
      governanceLogger.log('chat_message_received', {
        messageId: msg.id,
        contributorId: msg.contributorId,
        channel: msg.channel,
      }, msg.contributorId);
      return id;
    } catch (err) {
      this.logger.error('Failed to save chat message:', err);
      throw err;
    }
  }

  public getMessage(messageId: string): ChatMessage | null {
    try {
      if (!fs.existsSync(this.chatPath)) return null;
      const lines = fs.readFileSync(this.chatPath, 'utf8').split('\n').filter(l => l.trim());
      const entry = lines.map(l => JSON.parse(l)).find((m: ChatMessage) => m.id === messageId);
      return entry || null;
    } catch (err) {
      this.logger.error('Failed to read message:', err);
      return null;
    }
  }

  public computeMessageHash(message: ChatMessage): string {
    // Hash text + attachments sha256 list
    const hash = crypto.createHash('sha256');
    hash.update(message.text || '');
    if (message.attachments && message.attachments.length > 0) {
      for (const a of message.attachments) {
        hash.update(a.sha256);
      }
    }
    return hash.digest('hex');
  }

  public parseCommand(text: string): { command?: 'submit' | 'upload' | string; args?: any } {
    // simple parser: commands start with '/'
    if (!text || text.length === 0) return {};
    const trimmed = text.trim();
    if (!trimmed.startsWith('/')) return {};

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].substring(1);
    if (cmd === 'submit') return { command: 'submit', args: {} };
    if (cmd === 'upload') {
      const fileArg = parts[1] || '';
      return { command: 'upload', args: { file: fileArg } };
    }
    return { command: cmd, args: { raw: parts.slice(1).join(' ') } };
  }
}

export const chatService = new ChatService(logger);
