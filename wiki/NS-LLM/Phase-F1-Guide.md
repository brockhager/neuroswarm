# Phase F1: Advanced Model Features Guide

## Overview
Phase F1 introduces advanced capabilities to the NS-LLM ecosystem, moving beyond standard text generation to include real-time streaming, multi-modal inputs (vision & audio), and model fine-tuning workflows.

## Features

### 1. Streaming Generation
Real-time token generation improves user experience by displaying text as it's produced.
- **Backend**: C++ `generate` command now supports `"stream": true`.
- **API**: `POST /api/generate/stream` uses Server-Sent Events (SSE).
- **UI**: `GenerateTab` updates in real-time.

### 2. Multi-Modal Support
Interact with models using images and voice.
- **Vision**: Image captioning via `vit-gpt2` (exported to ONNX).
- **Audio**: Speech-to-text via `whisper-tiny` (exported to ONNX).
- **Integration**: Uploaded media context is automatically appended to the prompt.

### 3. Fine-Tuning Workflows
Customize models for specific domains using LoRA (Low-Rank Adaptation).
- **Training**: `train_lora.py` script for efficient fine-tuning.
- **Data**: `format_dataset.py` to convert JSON to training format.
- **Export**: `export_adapter.py` to merge adapters for ONNX conversion.

## Usage

### Streaming API
```bash
curl -N -X POST http://localhost:3009/api/generate/stream \
  -H "Content-Type: application/json" \
  -d '{"text": "Tell me a story", "stream": true}'
```

### Multi-Modal API
**Vision:**
```bash
curl -X POST -F "image=@photo.jpg" http://localhost:3009/api/multimodal/vision/caption
```

**Audio:**
```bash
curl -X POST -F "audio=@voice.wav" http://localhost:3009/api/multimodal/audio/transcribe
```

### Fine-Tuning
1. **Prepare Data**:
   ```bash
   python NS-LLM/training/format_dataset.py --input data.json --output train.jsonl
   ```
2. **Train**:
   ```bash
   python NS-LLM/training/train_lora.py --dataset train.jsonl --out my_adapter
   ```
3. **Export**:
   ```bash
   python NS-LLM/training/export_adapter.py --adapter my_adapter --out merged_model
   ```

## Architecture
- **Streaming**: Uses Node.js `http` and `express` to proxy SSE events from the native binary to the client.
- **Multi-Modal**: Currently uses a service layer (`MultiModalService`) to handle file uploads and processing (mocked/script-based).
- **Fine-Tuning**: Python-based offline workflow using `peft` and `transformers`.

## Next Steps
- **Phase F2**: Optimization & Scaling (GPU acceleration, Batching, Federation).
