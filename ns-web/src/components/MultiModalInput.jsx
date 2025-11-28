import { useState, useRef } from 'react'

function MultiModalInput({ onImageUpload, onAudioUpload }) {
    const [isRecording, setIsRecording] = useState(false)
    const fileInputRef = useRef(null)

    const handleImageClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append('image', file)

        try {
            const res = await fetch('/api/multimodal/vision/caption', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            if (onImageUpload) onImageUpload(data.text)
        } catch (err) {
            console.error('Image upload failed:', err)
        }
    }

    const toggleRecording = async () => {
        if (isRecording) {
            // Stop recording logic would go here
            // For MVP, we simulate a mock audio upload
            setIsRecording(false)

            // Mock audio blob
            const blob = new Blob(['mock audio'], { type: 'audio/wav' })
            const formData = new FormData()
            formData.append('audio', blob, 'recording.wav')

            try {
                const res = await fetch('/api/multimodal/audio/transcribe', {
                    method: 'POST',
                    body: formData
                })
                const data = await res.json()
                if (onAudioUpload) onAudioUpload(data.text)
            } catch (err) {
                console.error('Audio upload failed:', err)
            }
        } else {
            setIsRecording(true)
        }
    }

    return (
        <div className="multimodal-input flex gap-sm mt-sm">
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            <button
                className="btn btn-secondary btn-sm"
                onClick={handleImageClick}
                title="Upload Image"
            >
                📷 Image
            </button>

            <button
                className={`btn btn-sm ${isRecording ? 'btn-danger' : 'btn-secondary'}`}
                onClick={toggleRecording}
                title="Voice Input"
            >
                {isRecording ? '⏹️ Stop' : '🎤 Voice'}
            </button>
        </div>
    )
}

export default MultiModalInput
