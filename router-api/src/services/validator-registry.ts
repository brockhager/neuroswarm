import { Validator } from './validator-selection';

// In-memory registry of active validators — simple singleton for Router runtime
class ValidatorRegistry {
    private validators: Validator[] = [];

    getAll(): Validator[] {
        return this.validators;
    }

    setAll(vals: Validator[]) {
        this.validators = vals.map(v => ({ ...v, last_active: v.last_active ? new Date(v.last_active) : new Date() }));
    }

    upsert(validator: Partial<Validator> & { id: string }) {
        const idx = this.validators.findIndex(v => v.id === validator.id);
        if (idx >= 0) {
            this.validators[idx] = { ...this.validators[idx], ...validator, last_active: new Date() } as Validator;
        } else {
            const entry = {
                id: validator.id,
                endpoint: validator.endpoint || '',
                wallet_address: validator.wallet_address || '',
                stake: validator.stake || 0,
                reputation: validator.reputation || 0,
                latency_ms: validator.latency_ms || 1000,
                capacity_used: validator.capacity_used || 0,
                max_capacity: validator.max_capacity || 1,
                last_active: new Date()
            } as Validator;
            this.validators.push(entry);
        }
    }

    getById(id: string): Validator | undefined {
        return this.validators.find(v => v.id === id);
    }
}

const registry = new ValidatorRegistry();
export default registry;
