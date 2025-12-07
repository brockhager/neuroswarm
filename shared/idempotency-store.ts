import fs from 'fs';
import path from 'path';

export class IdempotencyStore {
  private store = new Set<string>();
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), 'neuroswarm', 'tmp', 'idempotency.json');
    this.ensureDir();
    this.loadFromFile();
  }

  private ensureDir() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  private loadFromFile() {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const arr = JSON.parse(raw) as string[];
      for (const k of arr) this.store.add(k);
    } catch (e) {
      console.warn('[Idempotency] failed to load store', e instanceof Error ? e.message : String(e));
    }
  }

  private persist() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify([...this.store]), 'utf8');
    } catch (e) {
      console.warn('[Idempotency] failed to persist store', e instanceof Error ? e.message : String(e));
    }
  }

  public async isProcessed(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  /**
   * Atomically mark a key as processed if it hasn't been processed before.
   * Returns true if key was not present and now marked, false if it already existed.
   */
  public async tryMarkProcessed(key: string): Promise<boolean> {
    if (this.store.has(key)) return false;
    this.store.add(key);
    this.persist();
    return true;
  }
}

export default IdempotencyStore;
