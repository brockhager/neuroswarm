# Phase F: Advanced Model Features

## Overview

Phase F focuses on extending the capabilities of NS-LLM beyond standard text generation. It introduces real-time streaming, multi-modal capabilities (vision and audio), and model customization through fine-tuning.

## Objectives

### F1: Streaming Generation
Implement Server-Sent Events (SSE) for real-time token generation.

**Features:**
- Token-by-token streaming response
- Client-side stream handling in `ns-llm-client.js`
- Web UI update for real-time display
- AbortController support for cancelling streams

**Deliverables:**
- Updated `NS-LLM` backend (C++) for streaming callback
- Updated `ns-node` `/api/generate/stream` endpoint
- Updated `ns-web` GenerateTab

### F2: Multi-Modal Support
Add support for vision and audio models.

**Features:**
- **Vision:** Image-to-Text (Captioning/VQA) using models like CLIP or ViT-GPT2.
- **Audio:** Speech-to-Text (Whisper) for transcribing queries.

**Deliverables:**
- `export_multimodal.py` script
- `MultiModalService` in `ns-node`
- UI components for image upload and voice input

### F3: Fine-Tuning Workflows
Create a pipeline for parameter-efficient fine-tuning (PEFT/LoRA).

**Features:**
- Dataset preparation tools (JSONL formatter)
- LoRA training script (Python)
- ONNX export of fine-tuned adapters
- Runtime adapter loading

**Deliverables:**
- `train_lora.py`
- `DatasetService`
- Documentation for fine-tuning

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    NS Web (React)                        │
│  • Stream Reader                                        │
│  • Image Uploader                                       │
│  • Audio Recorder                                       │
└─────────────────────────────────────────────────────────┘
                          ↓ SSE / Multipart
┌─────────────────────────────────────────────────────────┐
│                    NS Node (Node.js)                     │
│  • Stream Proxy                                         │
│  • MultiModalService                                    │
│  • Training Job Manager                                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    NS-LLM Backend                        │
│  • Streaming Callback                                   │
│  • Vision Encoder (ONNX)                                │
│  • Audio Encoder (ONNX)                                 │
│  • LoRA Adapters                                        │
└─────────────────────────────────────────────────────────┘
```

## Timeline Estimate

- **F1: Streaming**: 1-2 days
- **F2: Multi-Modal**: 2-3 days
- **F3: Fine-Tuning**: 2-3 days

**Total**: ~1 week

## Dependencies

- Phase E complete (✅)
- ONNX Runtime Extensions (for some multi-modal ops)
- Python training environment (PyTorch/PEFT)

## Risks & Mitigations

- **Risk**: Streaming latency in Node.js proxy
  - **Mitigation**: Use direct pipe or optimized buffering
- **Risk**: Multi-modal model size
  - **Mitigation**: Use quantized small variants (e.g., Tiny.en Whisper, ViT-Base)
- **Risk**: Training resource requirements
  - **Mitigation**: Focus on CPU-friendly LoRA or cloud-based training guides
