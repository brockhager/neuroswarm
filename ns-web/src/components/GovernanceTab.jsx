import { useState, useEffect } from 'react'

function GovernanceTab() {
    const [activeSection, setActiveSection] = useState('metrics')
    const [metrics, setMetrics] = useState(null)
    const [governanceState, setGovernanceState] = useState(null)
    const [auditLog, setAuditLog] = useState([])
    const [chainStatus, setChainStatus] = useState(null)
    const [proposals, setProposals] = useState([])
    const [newProposal, setNewProposal] = useState({
        parameterKey: 'minTokens',
        proposedValue: '',
        reason: ''
    })
    const [voterId, setVoterId] = useState('')

    useEffect(() => {
        fetchAll()
        const interval = setInterval(fetchAll, 5000) // Refresh every 5s
        return () => clearInterval(interval)
    }, [])

    const fetchAll = async () => {
        await Promise.all([
            fetchMetrics(),
            fetchGovernanceState(),
            fetchAuditLog(),
            fetchChainStatus()
        ])
    }

    const fetchMetrics = async () => {
        try {
            const res = await fetch('/api/generative/metrics')
            const data = await res.json()
            setMetrics(data)
        } catch (err) {
            console.error('Failed to fetch metrics:', err)
        }
    }

    const fetchGovernanceState = async () => {
        try {
            const res = await fetch('/api/governance/state')
            const data = await res.json()
            setGovernanceState(data)
            setProposals(data.activeProposals || [])
        } catch (err) {
            console.error('Failed to fetch governance state:', err)
        }
    }

    const fetchAuditLog = async () => {
        try {
            const res = await fetch('/api/generative/audit')
            const data = await res.json()
            const logs = Array.isArray(data) ? data : data.entries || []
            setAuditLog(logs.slice(-10).reverse())
        } catch (err) {
            console.error('Failed to fetch audit log:', err)
        }
    }

    const fetchChainStatus = async () => {
        try {
            const res = await fetch('/api/generative/chain')
            const data = await res.json()
            setChainStatus(data)
        } catch (err) {
            console.error('Failed to fetch chain status:', err)
        }
    }

    const handleCreateProposal = async (e) => {
        e.preventDefault()
        try {
            const res = await fetch('/api/governance/proposals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newProposal,
                    proposedValue: parseFloat(newProposal.proposedValue) || newProposal.proposedValue,
                    proposerId: voterId || `user-${Date.now()}`
                })
            })
            if (res.ok) {
                setNewProposal({ parameterKey: 'minTokens', proposedValue: '', reason: '' })
                fetchGovernanceState()
            }
        } catch (err) {
            console.error('Failed to create proposal:', err)
        }
    }

    const handleVote = async (proposalId, vote) => {
        if (!voterId) {
            alert('Please enter your Voter ID first')
            return
        }
        try {
            const res = await fetch(`/api/governance/proposals/${proposalId}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voterId, vote })
            })
            if (res.ok) {
                fetchGovernanceState()
            } else {
                const error = await res.json()
                alert(error.error)
            }
        } catch (err) {
            console.error('Failed to vote:', err)
        }
    }

    const sections = [
        { id: 'metrics', label: 'Metrics', icon: '📊' },
        { id: 'voting', label: 'Voting', icon: '🗳️' },
        { id: 'audit', label: 'Audit Log', icon: '📝' },
        { id: 'blockchain', label: 'Blockchain', icon: '⛓️' }
    ]

    return (
        <div className="fade-in">
            {/* Section Navigation */}
            <div className="mb-lg">
                <div className="flex gap-sm">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            className={`btn ${activeSection === section.id ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveSection(section.id)}
                        >
                            <span>{section.icon}</span>
                            <span>{section.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Metrics Section */}
            {activeSection === 'metrics' && (
                <div className="card">
                    <h2>Governance Metrics</h2>
                    <p className="text-secondary text-sm mb-lg">
                        Real-time validation and quality metrics
                    </p>

                    {metrics && (
                        <>
                            <div className="metrics-grid mb-lg">
                                <div className="metric-card">
                                    <div className="metric-value">{metrics.totalValidations || 0}</div>
                                    <div className="metric-label">Total Validations</div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-value text-success">{metrics.passRate || 0}%</div>
                                    <div className="metric-label">Pass Rate</div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-value text-warning">{metrics.warnRate || 0}%</div>
                                    <div className="metric-label">Warn Rate</div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-value text-error">{metrics.rejectRate || 0}%</div>
                                    <div className="metric-label">Reject Rate</div>
                                </div>
                            </div>

                            <h3 className="mb-md">Violation Breakdown</h3>
                            <div className="metrics-grid">
                                <div className="metric-card">
                                    <div className="metric-value">{metrics.lengthViolations || 0}</div>
                                    <div className="metric-label">Length</div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-value">{metrics.toxicityViolations || 0}</div>
                                    <div className="metric-label">Toxicity</div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-value">{metrics.coherenceViolations || 0}</div>
                                    <div className="metric-label">Coherence</div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-value">{metrics.customViolations || 0}</div>
                                    <div className="metric-label">Custom</div>
                                </div>
                            </div>
                        </>
                    )}

                    {governanceState && (
                        <div className="mt-lg">
                            <h3 className="mb-md">Current Parameters</h3>
                            <div className="config-grid">
                                {Object.entries(governanceState.parameters || {}).map(([key, param]) => (
                                    <div key={key} className="config-item">
                                        <span className="text-muted">{param.name}:</span>
                                        <span className="font-bold">{param.current} {param.unit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Voting Section */}
            {activeSection === 'voting' && (
                <div className="space-y-md">
                    <div className="card">
                        <h2>Contributor Voting</h2>
                        <p className="text-secondary text-sm mb-lg">
                            Propose and vote on governance parameter changes
                        </p>

                        {/* Voter ID Input */}
                        <div className="mb-lg">
                            <label className="label">Your Voter ID</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Enter your voter ID"
                                value={voterId}
                                onChange={(e) => setVoterId(e.target.value)}
                            />
                            <p className="text-xs text-muted mt-xs">
                                Use a consistent ID to track your votes
                            </p>
                        </div>

                        {/* Create Proposal Form */}
                        <form onSubmit={handleCreateProposal} className="mb-lg">
                            <h3 className="mb-md">Create New Proposal</h3>
                            <div className="form-grid">
                                <div>
                                    <label className="label">Parameter</label>
                                    <select
                                        className="input"
                                        value={newProposal.parameterKey}
                                        onChange={(e) => setNewProposal({ ...newProposal, parameterKey: e.target.value })}
                                    >
                                        {governanceState && Object.entries(governanceState.parameters || {}).map(([key, param]) => (
                                            <option key={key} value={key}>{param.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Proposed Value</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Enter new value"
                                        value={newProposal.proposedValue}
                                        onChange={(e) => setNewProposal({ ...newProposal, proposedValue: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="mt-md">
                                <label className="label">Reason</label>
                                <textarea
                                    className="input"
                                    rows="3"
                                    placeholder="Explain why this change is needed"
                                    value={newProposal.reason}
                                    onChange={(e) => setNewProposal({ ...newProposal, reason: e.target.value })}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary mt-md">
                                Create Proposal
                            </button>
                        </form>
                    </div>

                    {/* Active Proposals */}
                    <div className="card">
                        <h3 className="mb-md">Active Proposals ({proposals.length})</h3>
                        {proposals.length === 0 ? (
                            <p className="text-muted text-center py-lg">No active proposals</p>
                        ) : (
                            <div className="space-y-md">
                                {proposals.map(proposal => (
                                    <div key={proposal.id} className="proposal-card">
                                        <div className="flex justify-between items-start mb-sm">
                                            <div>
                                                <h4 className="font-bold">{governanceState?.parameters[proposal.parameterKey]?.name}</h4>
                                                <p className="text-sm text-muted">
                                                    {proposal.currentValue} → {proposal.proposedValue}
                                                </p>
                                            </div>
                                            <span className={`badge badge-${proposal.status}`}>
                                                {proposal.status}
                                            </span>
                                        </div>
                                        <p className="text-sm mb-md">{proposal.reason}</p>
                                        <div className="flex justify-between items-center">
                                            <div className="flex gap-md text-sm">
                                                <span className="text-success">✓ {proposal.votes.yes} Yes</span>
                                                <span className="text-error">✗ {proposal.votes.no} No</span>
                                            </div>
                                            <div className="flex gap-sm">
                                                <button
                                                    className="btn btn-sm btn-success"
                                                    onClick={() => handleVote(proposal.id, 'yes')}
                                                >
                                                    Vote Yes
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-error"
                                                    onClick={() => handleVote(proposal.id, 'no')}
                                                >
                                                    Vote No
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Audit Log Section */}
            {activeSection === 'audit' && (
                <div className="card">
                    <h2>Audit Log</h2>
                    <p className="text-secondary text-sm mb-lg">
                        Recent validation events (last 10)
                    </p>

                    {auditLog.length === 0 ? (
                        <p className="text-muted text-center py-lg">No audit entries yet</p>
                    ) : (
                        <div className="audit-log">
                            {auditLog.map((entry, idx) => (
                                <div key={idx} className="audit-entry">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-sm mb-xs">
                                                <span className={`status-badge status-${entry.status}`}>
                                                    {entry.status}
                                                </span>
                                                <span className="text-xs text-muted">
                                                    {new Date(entry.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-truncate">{entry.text}</p>
                                            {entry.violations && entry.violations.length > 0 && (
                                                <div className="mt-xs">
                                                    {entry.violations.map((v, i) => (
                                                        <span key={i} className="badge badge-sm mr-xs">
                                                            {v.type}: {v.message}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold">Score: {(entry.score * 100).toFixed(0)}%</div>
                                            <div className="text-xs text-muted">{entry.tokenCount} tokens</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Blockchain Section */}
            {activeSection === 'blockchain' && (
                <div className="card">
                    <h2>Blockchain Anchor</h2>
                    <p className="text-secondary text-sm mb-lg">
                        Immutable audit trail verification
                    </p>

                    {chainStatus && (
                        <>
                            <div className="metrics-grid mb-lg">
                                <div className="metric-card">
                                    <div className="metric-value">{chainStatus.height}</div>
                                    <div className="metric-label">Chain Height</div>
                                </div>
                                <div className="metric-card">
                                    <div className={`metric-value ${chainStatus.verified ? 'text-success' : 'text-error'}`}>
                                        {chainStatus.verified ? '✓ Verified' : '✗ Invalid'}
                                    </div>
                                    <div className="metric-label">Chain Status</div>
                                </div>
                            </div>

                            <h3 className="mb-md">Recent Blocks</h3>
                            <div className="blockchain-blocks">
                                {chainStatus.latestBlocks?.map(block => (
                                    <div key={block.index} className="block-card">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold">Block #{block.index}</div>
                                                <div className="text-xs text-muted">
                                                    {new Date(block.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-mono">
                                                    {block.hash.substring(0, 16)}...
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export default GovernanceTab
