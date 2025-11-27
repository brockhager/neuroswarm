/**
 * AG Frontend Client for Neuroswarm Agent3 API Gateway.
 *
 * This module demonstrates how a component within the Google Antigravity (AG) 
 * development environment would securely call the locally running Agent3 Gateway
 * (located at http://127.0.0.1:5000) to fetch expert advice.
 *
 * NOTE: This is pure JavaScript and assumes an environment capable of running fetch.
 */

// --- 1. CONFIGURATION ---
const AGENT3_GATEWAY_URL = 'http://127.0.0.1:5000/api/agent3/query';
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

// --- 2. CORE UTILITY FUNCTIONS (Error Handling & Backoff) ---

/**
 * Executes a fetch request with exponential backoff for resilience against
 * temporary network or service start-up issues.
 * @param {string} url - The URL to fetch.
 * @param {object} options - Fetch options (method, headers, body, etc.).
 * @returns {Promise<Response>} The successful response object.
 */
async function fetchWithBackoff(url, options) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                return response;
            }
            // For recoverable HTTP errors (like 5xx), attempt retry
            if (response.status >= 500) {
                throw new Error(`Server error: ${response.status}`);
            }
            // For client errors (4xx), throw immediately
            throw new Error(`Client error: ${response.status} ${response.statusText}`);
        } catch (error) {
            if (attempt === MAX_RETRIES - 1) {
                console.error(`Fetch failed permanently after ${MAX_RETRIES} attempts.`, error);
                throw error;
            }

            const delay = BASE_DELAY_MS * (2 ** attempt);
            console.warn(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}


// --- 3. MAIN INTEGRATION FUNCTION ---

/**
 * Sends a query to the local Agent3 Gateway and retrieves the expert response.
 * @param {string} query - The specific task or question for Agent3.
 * @returns {Promise<string>} The raw text content of Agent3's response.
 */
export async function getAgent3Expertise(query) {
    console.log(`[AG Client] Sending request to Agent3 Gateway for query: "${query.substring(0, 40)}..."`);

    try {
        const payload = { query };

        const response = await fetchWithBackoff(AGENT3_GATEWAY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.status === 'success' && data.response_content) {
            console.log('[AG Client] Successfully received response from Agent3.');
            return data.response_content;
        } else if (data.error) {
            throw new Error(`Agent3 Gateway Error: ${data.details || data.error}`);
        } else {
            throw new Error('Received malformed response from Agent3 Gateway.');
        }

    } catch (error) {
        console.error('[AG Client] Fatal communication error with Agent3 Gateway:', error);
        // This error would be displayed to the user in the AG environment
        return `ERROR: Could not connect to Neuroswarm Agent3. Ensure 'agent3_gateway.py' is running locally on port 5000. Details: ${error.message}`;
    }
}


// --- 4. EXAMPLE USAGE (For Demonstration) ---

async function runExample() {
    // A typical design query for Agent3 in the AG environment
    const designQuery = "We are modifying the AG environment's code editor. Provide a design for a decentralized, real-time presence cursor model using P2P topics for efficiency. Focus on the data structure and topic naming convention.";

    const output = await getAgent3Expertise(designQuery);

    console.log('\n=================================================');
    console.log('AGENT3 RESPONSE (Ready for Insertion into AG Code)');
    console.log('=================================================');
    console.log(output);
    console.log('=================================================\n');
}

// runExample(); // Uncomment to test in a Node.js or browser environment