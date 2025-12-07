import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const ROUTER_API_URL = process.env.ROUTER_API_URL || 'http://localhost:4001';
const JWT_SECRET = process.env.JWT_SECRET || 'neuroswarm_secret_key_123';

/**
 * Generate a mock JWT for the Gateway
 */
function generateGatewayToken() {
    const payload = {
        sub: 'gateway-node-001',
        role: 'internal_service', // Matches the 'authenticate' middleware check
        service: 'gateway'
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function runHarness() {
    console.log('🚀 Starting OPS-03 E2E Harness...');
    console.log(`Target: ${ROUTER_API_URL}`);

    const token = generateGatewayToken();
    const correlationId = uuidv4();

    console.log(`🔑 Generated Token: ${token.substring(0, 10)}...`);
    console.log(`🆔 Correlation ID: ${correlationId}`);

    const payload = {
        event_type: 'ARTIFACT_SUBMISSION',
        timestamp: new Date().toISOString(),
        details: 'E2E Harness Test Artifact',
        metadata: {
            origin: 'e2e-harness',
            test_run: correlationId
        }
    };

    try {
        console.log('📡 Sending Ledger Write Request...');
        const res = await axios.post(`${ROUTER_API_URL}/api/v1/ledger/write`, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-correlation-id': correlationId
            }
        });

        console.log(`✅ Response Status: ${res.status} ${res.statusText}`);
        console.log('📄 Response Data:', JSON.stringify(res.data, null, 2));

        if (res.status === 201 && res.data.status === 'recorded') {
            console.log('\n✨ SUCCESS: Router accepted the write request and triggered async anchoring.');
            console.log(`Snapshot ID: ${res.data.id}`);
            console.log(`Content Hash: ${res.data.hash}`);
            process.exit(0);
        } else {
            console.error('\n❌ FAILURE: Unexpected response format or status.');
            process.exit(1);
        }

    } catch (err: any) {
        console.error('\n❌ REQUEST FAILED');
        if (err.response) {
            console.error(`Status: ${err.response.status}`);
            console.error('Data:', err.response.data);
        } else {
            console.error(err.message);
        }
        process.exit(1);
    }
}

runHarness();
