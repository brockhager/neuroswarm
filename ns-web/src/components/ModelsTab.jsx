import { useState, useEffect } from 'react'

function ModelsTab() {
    const [models, setModels] = useState([])
    const [current, setCurrent] = useState(null)

    useEffect(() => {
        fetchModels()
    }, [])

    const fetchModels = async () => {
        try {
            const res = await fetch('/api/models')
            const data = await res.json()
            setModels(data.models || [])

            const currentModel = data.models?.find(m => m.current)
            setCurrent(currentModel)
        } catch (err) {
            console.error('Failed to fetch models:', err)
        }
    }

    const switchModel = async (modelKey) => {
        try {
            await fetch('/api/models/switch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: modelKey })
            })
            fetchModels()
        } catch (err) {
            console.error('Failed to switch model:', err)
        }
    }

    return (
        <div className="fade-in">
            <div className="card">
                <h2>Model Management</h2>
                <p className="text-secondary text-sm mb-lg">
                    View and switch between available models
                </p>

                {current && (
                    <div className="current-model mb-lg">
                        <h3>Current Model</h3>
                        <div className="model-info">
                            <div className="model-name">{current.key}</div>
                            <div className="model-details">
                                <span className="badge badge-success">{current.params}</span>
                                <span className="text-muted text-sm">
                                    Context: {current.contextLength} tokens
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <h3>Available Models</h3>
                <div className="models-list">
                    {models.map(model => (
                        <div key={model.key} className={`model-item ${model.current ? 'model-active' : ''}`}>
                            <div className="model-item-info">
                                <div className="model-item-name">{model.key}</div>
                                <div className="model-item-meta">
                                    <span className="badge badge-success">{model.params}</span>
                                    {model.quantized && <span className="badge">Quantized</span>}
                                </div>
                                <div className="text-sm text-muted">{model.description}</div>
                            </div>
                            {!model.current && (
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => switchModel(model.key)}
                                >
                                    Switch
                                </button>
                            )}
                            {model.current && (
                                <span className="badge badge-success">Active</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default ModelsTab
