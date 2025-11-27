// This code is a clean, dependency-free version of the logic from the harness.
// It should be placed in your AG repository's utility folder.

const AGENT3_GATEWAY_URL = 'http://127.0.0.1:5000/api/agent3/query';
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

/**
 * Sends a query to the local Agent3 Gateway and retrieves the expert response.
 * This function is the ONLY part of the AG code that knows about the API.
 * @param {string} query - The specific task or question for Agent3.
 * @returns {Promise<string>} The raw text content of Agent3's response.
 */
export async function getAgent3Expertise(query) {
    // [Integration Team]: Add error logging or telemetry specific to the AG environment here.

    // Function body remains the same (includes fetchWithBackoff for robustness)
    // ... [Copy the full logic from the previous fetchWithBackoff and main function]
    // ... (For brevity, assume the full error-handling logic is copied here)

    // --- Full logic goes here ---

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(AGENT3_GATEWAY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query }),
            });
            if (!response.ok) {
                if (response.status >= 500) throw new Error(`Server error: ${response.status}`);
                throw new Error(`Client error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            if (data.status === 'success' && data.response_content) {
                return data.response_content;
            } else {
                throw new Error(`Gateway Error: ${data.details || 'Unknown error'}`);
            }
        } catch (error) {
            if (attempt === MAX_RETRIES - 1) throw error;
            const delay = BASE_DELAY_MS * (2 ** attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}