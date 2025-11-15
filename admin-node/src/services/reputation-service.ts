import fs from 'fs';
import path from 'path';
import { logger } from '../index';

export class ReputationService {
  private path: string;
  private data: Record<string, number> = {};

  constructor(storePath?: string) {
    this.path = storePath || path.join(process.cwd(), '..', 'governance-reputation.json');
    try {
      if (fs.existsSync(this.path)) {
        const raw = fs.readFileSync(this.path, 'utf8');
        this.data = JSON.parse(raw) || {};
      } else {
        this.data = {};
      }
    } catch (error) {
      (logger as any).error('Failed to load reputation store:', error);
      this.data = {};
    }
  }

  public addReputation(contributorId: string, delta = 1, reason?: string) {
    if (!contributorId) return;
    this.data[contributorId] = (this.data[contributorId] || 0) + delta;
    this.save();
  }

  public getReputation(contributorId: string) {
    return this.data[contributorId] || 0;
  }

  private save() {
    try {
      fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2));
    } catch (error) {
      (logger as any).error('Failed to persist reputation store:', error);
    }
  }
}

export const reputationService = new ReputationService();
