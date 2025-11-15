import { ChatService } from './chat-service';
import fs from 'fs';
import path from 'path';

describe('ChatService', () => {
  const chatPath = path.join(__dirname, 'test-chat.jsonl');
  let service: ChatService;

  beforeEach(() => {
    try { fs.unlinkSync(chatPath); } catch (e) { }
    service = new ChatService(console, chatPath);
  });

  afterEach(() => {
    try { fs.unlinkSync(chatPath); } catch (e) { }
  });

  it('saves and retrieves chat messages', () => {
    const id = service.sendMessage({ contributorId: 'alice', text: 'hello', channel: 'general' });
    expect(id).toBeDefined();

    const msg = service.getMessage(id);
    expect(msg).toBeDefined();
    expect(msg!.contributorId).toBe('alice');
    expect(msg!.text).toBe('hello');
  });

  it('parses submit command', () => {
    const r = service.parseCommand('/submit');
    expect(r.command).toBe('submit');
  });

  it('parses upload command', () => {
    const r = service.parseCommand('/upload Qm12345');
    expect(r.command).toBe('upload');
    expect(r.args.file).toBe('Qm12345');
  });

  it('computes message hash with attachments', () => {
    const id = service.sendMessage({ contributorId: 'alice', text: 'hello', channel: 'general', attachments: [{ filename: 'a.txt', sha256: 'a'.repeat(64)}]});
    const msg = service.getMessage(id)!;
    const h = service.computeMessageHash(msg);
    expect(h.length).toBe(64);
  });
});
