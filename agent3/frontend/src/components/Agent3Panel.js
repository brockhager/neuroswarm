import React, { useState } from 'react'; // Assuming a React-like framework
import { getAgent3Expertise } from '../utils/agent3Service';

// This is the simplified component your AG team will build.
function Agent3Panel() {
    const [query, setQuery] = useState("");
    const [response, setResponse] = useState("Ask Agent3 a question...");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setResponse("..."); // Clear previous response

        try {
            const expertAdvice = await getAgent3Expertise(query);
            setResponse(expertAdvice);
        } catch (err) {
            setError("Failed to connect to Agent3 Gateway. Check your terminal.");
            setResponse(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="agent3-container">
            {/* Input Area */}
            <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask Agent3 about Neuroswarm design..."
            />

            {/* Button */}
            <button
                onClick={handleSubmit}
                disabled={isLoading}
            >
                {isLoading ? "Consulting Agent3..." : "Ask Neuroswarm Expert"}
            </button>

            {/* Response Display */}
            <div className="response-display">
                {/* [Integration Team]: Use a Markdown renderer here to show the output professionally */}
                <pre>{response}</pre>
                {error && <div className="error-message">{error}</div>}
            </div>
        </div>
    );
}
// export default Agent3Panel;