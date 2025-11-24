import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { logNs } from '../utils/logger.js';
import { SERVICE_URLS } from '../../../shared/ports.js';

let GATEWAY_CONFIG = [];

export function loadGatewayConfig() {
    try {
        // Priority: full JSON config in env var GATEWAY_CONFIG (JSON array), else GATEWAY_URLS comma-separated, else default local gateway
        const cfgEnv = process.env.GATEWAY_CONFIG;
        if (cfgEnv) {
            const arr = JSON.parse(cfgEnv);
            GATEWAY_CONFIG = arr.map((item) => ({ url: item.url, auth: item.auth || null, reachable: false, lastError: null }));
        } else {
            const urls = (process.env.GATEWAY_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
            GATEWAY_CONFIG = urls.length > 0 ? urls.map(u => ({ url: u, auth: null, reachable: false, lastError: null })) : [{ url: SERVICE_URLS.GATEWAY_DEFAULT, auth: null, reachable: false, lastError: null }];
        }
        return GATEWAY_CONFIG;
    } catch (e) {
        GATEWAY_CONFIG = [{ url: SERVICE_URLS.GATEWAY_DEFAULT, auth: null, reachable: false, lastError: String(e) }];
        return GATEWAY_CONFIG;
    }
}

function maskAuth(header) {
    if (!header) return '';
    const parts = (header || '').split(' ');
    if (parts.length === 2) return `${parts[0]} ***`;
    return '***';
}

export function getGatewayConfig() {
    return GATEWAY_CONFIG;
}

export async function publishToGateways(message, headers = {}) {
    const correlationId = headers['x-correlation-id'] || uuidv4();
    let lastError = null;

    // Ensure config is loaded
    if (GATEWAY_CONFIG.length === 0) loadGatewayConfig();

    for (const gw of GATEWAY_CONFIG) {
        const url = gw.url.replace(/\/$/, '') + '/v1/chat';
        try {
            const forwardHeaders = { 'Content-Type': 'application/json', 'X-Correlation-ID': correlationId };
            if (headers.authorization) forwardHeaders['Authorization'] = headers.authorization;
            if (headers['x-forwarded-for']) forwardHeaders['X-Forwarded-For'] = headers['x-forwarded-for'];
            if (headers['x-forwarded-user']) forwardHeaders['X-Forwarded-User'] = headers['x-forwarded-user'];
            if (gw.auth) {
                if (gw.auth.type === 'jwt') forwardHeaders['Authorization'] = `Bearer ${gw.auth.token}`;
                if (gw.auth.type === 'apiKey') forwardHeaders['X-API-Key'] = gw.auth.key;
            }
            const maskedAuth = maskAuth(forwardHeaders['Authorization']);
            logNs(`Publishing message ${message.id} to gateway ${gw.url} correlation=${correlationId} auth=${maskedAuth}`);
            const controller = new AbortController();
            const timeoutMs = Number(process.env.GATEWAY_REQUEST_TIMEOUT_MS || 5000);
            const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
            const res = await fetch(url, { method: 'POST', headers: forwardHeaders, body: JSON.stringify(message), signal: controller.signal });
            clearTimeout(timeoutHandle);
            if (res.ok) {
                const prev = gw.reachable;
                gw.reachable = true;
                gw.lastError = null;
                if (!prev) logNs(`Connected to gateway ${gw.url}`);
                else logNs(`Gateway ${gw.url} remains reachable`);
                logNs(`Successfully published message ${message.id} to gateway ${gw.url} correlation=${correlationId}`);
                return { gateway: gw.url, status: 'ok' };
            } else {
                gw.reachable = false;
                gw.lastError = `HTTP ${res.status}`;
                lastError = gw.lastError;
            }
        } catch (err) {
            gw.reachable = false;
            gw.lastError = String(err);
            lastError = gw.lastError;

            // Silence gateway errors for desktop users who likely don't have a gateway running
            if (err.message.includes('fetch failed')) {
                logNs(`Gateway ${gw.url} unreachable (skipping)`);
            } else {
                logNs('ERROR', `Gateway ${gw.url} failed: ${err.message}`);
            }
        }
    }

    if (lastError) {
        logNs(`Failed to publish to gateways (expected if running standalone): ${lastError}`);
    }
    // Don't throw, just return failure
    return { success: false, lastError };
}
