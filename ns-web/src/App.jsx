import { useState, useEffect } from 'react'
import './App.css'
import GenerateTab from './components/GenerateTab'
import RAGTab from './components/RAGTab'
import GovernanceTab from './components/GovernanceTab'
import PerformanceTab from './components/PerformanceTab'
import PluginDashboard from './components/PluginDashboard'
import ModelsTab from './components/ModelsTab'
import NS_LLM_Dashboard from './Dashboard'

function App() {
    const [activeTab, setActiveTab] = useState('dashboard')
    const [health, setHealth] = useState(null)

    useEffect(() => {
        // Check backend health on mount
        fetch('/health')
            .then(res => res.json())
            .then(data => setHealth(data))
            .catch(err => console.error('Health check failed:', err))
    }, [])

    const tabs = [
        { id: 'dashboard', label: 'System', icon: '🖥️' },
        { id: 'generate', label: 'Generate', icon: '✨' },
        { id: 'rag', label: 'RAG Query', icon: '🔍' },
        { id: 'models', label: 'Models', icon: '🤖' }
    ]

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header-content">
                    <div className="logo">
                        <h1>NS-LLM</h1>
                        <span className="text-muted text-sm">Neural Swarm Language Model</span>
                    </div>

                    <div className="header-status">
                        {health && (
                            <div className="flex items-center gap-sm">
                                <div className={`status-dot ${health.status === 'ok' ? 'status-ok' : 'status-error'}`} />
                                <span className="text-sm text-secondary">
                                    {health.nsLlm?.available ? 'Backend Online' : 'Backend Offline'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav className="nav">
                <div className="nav-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`nav-tab ${activeTab === tab.id ? 'nav-tab-active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="nav-tab-icon">{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* Main Content */}
            <main className="main">
                <div className="container">
                    {activeTab === 'dashboard' && <NS_LLM_Dashboard />}
                    {activeTab === 'generate' && <GenerateTab />}
                    {activeTab === 'rag' && <RAGTab />}
                    {activeTab === 'models' && <ModelsTab />}
                </div>
            </main>

            {/* Footer */}
            <footer className="footer">
                <div className="container">
                    <p className="text-xs text-muted">
                        NS-LLM v{health?.version || '0.1.0'} •
                        Uptime: {health ? Math.floor(health.uptime / 60) : 0}m
                    </p>
                </div>
            </footer>
        </div>
    )
}

export default App
