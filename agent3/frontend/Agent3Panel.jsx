import React, { useState, useCallback } from 'react';

// --- Configuration ---
const AGENT3_GATEWAY_URL = 'http://127.0.0.1:5000/api/agent3/query';
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

// --- Utility Functions (Integrated into Component Scope) ---

/**
 * Executes a fetch request with exponential backoff for resilience against
 * temporary connection issues with the local Python Gateway.
 */
async function fetchWithBackoff(url, options, setStatus) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;

            // Handle server/connection errors
            if (response.status >= 500 || response.status === 0) {
                throw new Error(`Server or connection error. Status: ${response.status || 'N/A'}`);
            }
            throw new Error(`Client error: ${response.status} ${response.statusText}`);
        } catch (error) {
            if (attempt === MAX_RETRIES - 1) throw error;

            const delay = BASE_DELAY_MS * (2 ** attempt);
            setStatus(`Gateway unreachable. Retrying (${attempt + 1}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// --- Agent3 Panel Component ---

export default function App() {
    const [query, setQuery] = useState("Propose the final, production-ready TypeScript interface for the Neuroswarm PeerStatus object, including fields for Merkle-DAG divergence tracking and conflict status.");
    const [response, setResponse] = useState("Ask Agent3 a question to get expert Neuroswarm design advice.");
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");

    const getAgent3Expertise = async (currentQuery) => {
        try {
            const payload = { query: currentQuery };

            // Use the integrated backoff logic
            const response = await fetchWithBackoff(AGENT3_GATEWAY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload),
            }, setStatusMessage);

            const data = await response.json();

            if (data.status === 'success' && data.response_content) {
                return data.response_content;
            } else if (data.error) {
                throw new Error(`Gateway Error: ${data.details || data.error}`);
            } else {
                throw new Error('Received malformed response from Gateway.');
            }
        } catch (error) {
            // Re-throw with more context for the UI
            throw new Error(`Fatal error connecting to Agent3 Gateway. Is the Python server running on 5000? Details: ${error.message}`);
        }
    };


    const handleSubmit = useCallback(async () => {
        if (!query.trim()) {
            setStatusMessage("Please enter a query before asking Agent3.");
            return;
        }

        setIsLoading(true);
        setStatusMessage("Sending query to Agent3 via local Gateway...");
        setResponse(""); // Clear previous response

        try {
            const expertAdvice = await getAgent3Expertise(query);

            // Success State
            setResponse(expertAdvice);
            setStatusMessage("Agent3 successfully responded.");

        } catch (error) {
            // Error State
            setResponse(error.message);
            setStatusMessage("Operation failed. Check your terminal for server logs.");
        } finally {
            setIsLoading(false);
        }
    }, [query]);

    // Simple Spinner Component
    const Spinner = () => (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    );

    return (
        <div className="flex flex-col h-screen bg-gray-50 p-4 sm:p-8">
            <header className="mb-6 pb-4 border-b border-gray-200">
                <h1 className="text-3xl font-extrabold text-indigo-700">Agent3: Neuroswarm Expert Console</h1>
                <p className="text-sm text-gray-500">Consult your specialist agent via the local Flask Gateway.</p>
            </header>

            <div className="flex-grow flex flex-col space-y-4">
                {/* Query Input */}
                <div className="flex flex-col">
                    <label htmlFor="queryInput" className="text-sm font-medium text-gray-700 mb-2">Query:</label>
                    <textarea
                        id="queryInput"
                        rows="4"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ask Agent3 about Neuroswarm design..."
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition resize-none font-mono text-sm"
                    />
                </div>

                {/* Status and Button */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="flex items-center justify-center px-6 py-3 text-base font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition duration-150 shadow-md disabled:bg-gray-400 disabled:cursor-wait"
                    >
                        {isLoading && <Spinner />}
                        {isLoading ? "Consulting Agent3..." : "Ask Neuroswarm Expert"}
                    </button>

                    <p className={`text-sm font-semibold ${statusMessage.includes('unreachable') || statusMessage.includes('failed') ? 'text-red-600' : 'text-green-600'}`}>
                        {statusMessage}
                    </p>
                </div>

                {/* Response Display */}
                <div className="flex-grow flex flex-col min-h-0">
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">Agent3 Response:</h2>
                    <div className="flex-grow bg-gray-900 p-4 rounded-xl shadow-inner overflow-auto">
                        <pre className="text-white whitespace-pre-wrap font-mono text-xs leading-relaxed">
                            {response}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}