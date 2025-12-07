import fs from 'fs';
import path from 'path';

export interface LedgerEntry {
    id?: string;
    timestamp: string;
    type: 'audit' | 'transaction' | 'job_completion';
    payload: any;
    hash?: string;
    ipfs_cid?: string;
    tx_signature?: string;
    anchored: boolean;
}

export class LedgerDB {
    private dataFile: string;
    private entries: LedgerEntry[] = [];

    constructor() {
        this.dataFile = path.resolve(process.cwd(), 'data', 'ledger.json');
        this.ensureDataDir();
        this.load();
    }

    private ensureDataDir() {
        const dir = path.dirname(this.dataFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    private load() {
        try {
            if (fs.existsSync(this.dataFile)) {
                const data = fs.readFileSync(this.dataFile, 'utf-8');
                this.entries = JSON.parse(data);
                console.log(`[LedgerDB] Loaded ${this.entries.length} entries.`);
            }
        } catch (e) {
            console.warn('[LedgerDB] Failed to load data, starting fresh.', e);
        }
    }

    private save() {
        try {
            fs.writeFileSync(this.dataFile, JSON.stringify(this.entries, null, 2), 'utf-8');
        } catch (e) {
            console.error('[LedgerDB] Failed to save data.', e);
        }
    }

    async insert(entry: LedgerEntry): Promise<LedgerEntry> {
        const newEntry = {
            ...entry,
            id: entry.id || `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: entry.timestamp || new Date().toISOString(),
            anchored: false
        };
        this.entries.push(newEntry);
        this.save();
        return newEntry;
    }

    async updateAnchorStatus(id: string, ipfsCid: string, txSignature?: string): Promise<boolean> {
        const entry = this.entries.find(e => e.id === id);
        if (entry) {
            entry.ipfs_cid = ipfsCid;
            entry.tx_signature = txSignature;
            entry.anchored = true;
            this.save();
            return true;
        }
        return false;
    }

    getAll(): LedgerEntry[] {
        return this.entries;
    }
}
