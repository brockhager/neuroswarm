import { useState, useEffect } from 'react'

function GovernanceTab() {
    const [metrics, setMetrics] = useState(null)
    const [config, setConfig] = useState(null)

    useEffect(() => {
        fetchMetrics()
        fetchConfig()
    }, [])

    const fetchMetrics = async () => {
        try {
            const res = await fetch('/api/metrics')
            const data = await res.json()
            setMetrics(data)
        } catch (err) {
            console.error('Failed to fetch metrics:', err)
        }
    }

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/config')
            const data = await res.json()
            setConfig(data)
        } catch (err) {
            console.error('Failed to fetch config:', err)
        }
    }

    return (
        <div className="fade-in">
            <div className="card">
                <h2>Governance Dashboard</h2>
                <p className="text-secondary text-sm mb-lg">
                    Monitor validation metrics and configure governance rules
                </p>

                {metrics && (
                    <div className="metrics-grid">
                        <div className="metric-card">
                            <div className="metric-value">{metrics.totalValidations}</div>
                            <div className="metric-label">Total Validations</div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-value text-success">{metrics.passed}</div>
                            <div className="metric-label">Passed</div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-value text-warning">{metrics.warned}</div>
                            <div className="metric-label">Warned</div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-value text-error">{metrics.rejected}</div>
                            <div className="metric-label">Rejected</div>
                        </div>
                    </div>
                )}

                {config && (
                    <div className="mt-lg">
                        <h3>Configuration</h3>
                        <div className="config-grid">
                            <div className="config-item">
                                <span className="text-muted">Min Tokens:</span>
                                <span>{config.minTokens}</span>
                            </div>
                            <div className="config-item">
                                <span className="text-muted">Max Tokens:</span>
                                <span>{config.maxTokens}</span>
                            </div>
                            <div className="config-item">
                                <span className="text-muted">Min Coherence:</span>
                                <span>{config.minCoherence}</span>
                            </div>
                            <div className="config-item">
                                <span className="text-muted">Strict Mode:</span>
                                <span>{config.strictMode ? 'Yes' : 'No'}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default GovernanceTab
