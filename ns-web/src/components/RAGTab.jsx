import { useState } from 'react'

function RAGTab() {
    const [query, setQuery] = useState('')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleQuery = async () => {
        if (!query.trim()) return

        setLoading(true)
        try {
            const res = await fetch('/api/hybrid/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, topK: 3, maxTokens: 100 })
            })
            const data = await res.json()
            setResult(data)
        } catch (err) {
            setResult({ error: err.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fade-in">
            <div className="card">
                <h2>RAG Query</h2>
                <p className="text-secondary text-sm mb-lg">
                    Retrieval-Augmented Generation with semantic search
                </p>

                <div className="form-group">
                    <label className="label">Query</label>
                    <textarea
                        className="textarea"
                        placeholder="Ask a question..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        rows={3}
                    />
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleQuery}
                    disabled={loading || !query.trim()}
                >
                    {loading ? <><div className="spinner" /> Searching...</> : '🔍 Query'}
                </button>
            </div>

            {result && !result.error && (
                <div className="card mt-lg fade-in">
                    <h3>Response</h3>
                    <div className="response-text">
                        <code>{result.text}</code>
                    </div>

                    <div className="response-meta">
                        <div className="meta-item">
                            <span className="text-muted text-sm">Score:</span>
                            <span>{(result.score?.combined * 100).toFixed(1)}%</span>
                        </div>
                        <div className="meta-item">
                            <span className="text-muted text-sm">Sources:</span>
                            <span>{result.sources?.length || 0}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default RAGTab
