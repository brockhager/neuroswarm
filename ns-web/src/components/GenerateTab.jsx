import { useState } from 'react'
import './GenerateTab.css'
import MultiModalInput from './MultiModalInput'

function GenerateTab() {
    const [prompt, setPrompt] = useState('')
    const [response, setResponse] = useState(null)
    const [loading, setLoading] = useState(false)
    const [maxTokens, setMaxTokens] = useState(50)

    const handleGenerate = async () => {
        if (!prompt.trim()) return

        setLoading(true)
        setResponse({ text: '', tokens_generated: 0 }) // Reset response

        try {
            const res = await fetch('/api/generate/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: prompt,
                    maxTokens
                })
            })

            if (!res.ok) {
                const data = await res.json()
                setResponse({ error: data.error, details: data.details })
                setLoading(false)
                return
            }

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })

                // Process buffer for SSE events
                let idx
                while ((idx = buffer.indexOf('\n\n')) >= 0) {
                    const eventBlock = buffer.slice(0, idx)
                    buffer = buffer.slice(idx + 2)

                    const lines = eventBlock.split('\n')
                    let eventType = 'message'
                    let data = ''

                    for (const line of lines) {
                        if (line.startsWith('event: ')) {
                            eventType = line.slice(7).trim()
                        } else if (line.startsWith('data: ')) {
                            data = line.slice(6)
                        }
                    }

                    if (eventType === 'done') {
                        setLoading(false)
                        return
                    } else if (eventType === 'error') {
                        const err = JSON.parse(data)
                        setResponse(prev => ({ ...prev, error: err.error, details: err.details }))
                        setLoading(false)
                        return
                    } else if (eventType === 'governance') {
                        const gov = JSON.parse(data)
                        setResponse(prev => ({ ...prev, governance: gov }))
                    } else if (data) {
                        try {
                            const tokenData = JSON.parse(data)
                            if (tokenData.stream_token) {
                                setResponse(prev => ({
                                    ...prev,
                                    text: (prev.text || '') + tokenData.stream_token,
                                    tokens_generated: (prev.tokens_generated || 0) + 1
                                }))
                            }
                        } catch (e) {
                            console.error('JSON parse error:', e)
                        }
                    }
                }
            }
        } catch (err) {
            setResponse({ error: 'request-failed', details: err.message })
        } finally {
            setLoading(false)
        }
    }

    const getGovernanceColor = (status) => {
        if (!status) return ''
        if (status === 'pass') return 'badge-success'
        if (status === 'warn') return 'badge-warning'
        return 'badge-error'
    }

    return (
        <div className="generate-tab fade-in">
            <div className="card">
                <h2>Text Generation</h2>
                <p className="text-secondary text-sm mb-lg">
                    Generate text using the NS-LLM backend with automatic governance validation.
                </p>

                {/* Input */}
                <div className="form-group">
                    <label className="label">Prompt</label>
                    <textarea
                        className="textarea"
                        placeholder="Enter your prompt here..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={4}
                    />
                    <MultiModalInput
                        onImageUpload={(text) => setPrompt(prev => prev + `\n[Image Context: ${text}]`)}
                        onAudioUpload={(text) => setPrompt(prev => prev + ` ${text}`)}
                    />
                </div>

                {/* Settings */}
                <div className="form-group">
                    <label className="label">
                        Max Tokens: <span className="text-secondary">{maxTokens}</span>
                    </label>
                    <input
                        type="range"
                        className="slider"
                        min="10"
                        max="200"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    />
                </div>

                {/* Generate Button */}
                <button
                    className="btn btn-primary"
                    onClick={handleGenerate}
                    disabled={loading || !prompt.trim()}
                >
                    {loading ? (
                        <>
                            <div className="spinner" />
                            Generating...
                        </>
                    ) : (
                        <>
                            ✨ Generate
                        </>
                    )}
                </button>
            </div>

            {/* Response */}
            {response && (
                <div className="card mt-lg fade-in">
                    <h3>Response</h3>

                    {response.error ? (
                        <div className="error-box">
                            <p className="text-error">❌ {response.error}</p>
                            {response.details && (
                                <p className="text-sm text-muted">{response.details}</p>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Generated Text */}
                            <div className="response-text">
                                <code>{response.text}</code>
                            </div>

                            {/* Metadata */}
                            <div className="response-meta">
                                <div className="meta-item">
                                    <span className="text-muted text-sm">Tokens Generated:</span>
                                    <span className="text-sm">{response.tokens_generated}</span>
                                </div>

                                {response.governance && (
                                    <>
                                        <div className="meta-item">
                                            <span className="text-muted text-sm">Governance:</span>
                                            <span className={`badge ${getGovernanceColor(response.governance.status)}`}>
                                                {response.governance.status}
                                            </span>
                                        </div>

                                        <div className="meta-item">
                                            <span className="text-muted text-sm">Quality Score:</span>
                                            <span className="text-sm">
                                                {(response.governance.score * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Violations */}
                            {response.governance?.violations?.length > 0 && (
                                <div className="violations mt-md">
                                    <h4 className="text-sm mb-sm">Violations:</h4>
                                    {response.governance.violations.map((v, i) => (
                                        <div key={i} className={`violation ${v.severity}`}>
                                            <span className="violation-type">{v.type}</span>
                                            <span className="violation-message">{v.message}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export default GenerateTab
