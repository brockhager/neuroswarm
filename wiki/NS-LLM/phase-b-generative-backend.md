# Phase B: Generative Backend Integration

## Goals

### Backend Integration
- **Generative Support**: Add support for generative ONNX/quantized models (decoder-style LLMs).
- **API**: Expose a new API route `/api/generate` for text generation.
- **Coexistence**: Ensure embeddings and generation coexist without conflicts.

### CI Extensions
- **Build Matrix**: Extend build matrix to include generative binaries for Ubuntu/macOS/Windows.
- **Smoke Tests**: Validate text generation (length, token distribution, non-empty output).
- **Latency**: Enforce latency thresholds for generation requests.

### Contributor Experience
- **Documentation**: Update `CONTRIBUTING-NATIVE.md` with instructions for running generative binaries.
- **Validation**: Provide sample prompts + expected outputs.
- **Dashboard**: Add dashboard card showing "NS-LLM Generative Backend vX.Y.Z".

### Docs & Governance
- **Scope**: Define scope, guarantees, and contributor guide.
- **Release Notes**: Add template for Phase B milestones.
- **Production Criteria**: Reproducible outputs, latency < threshold, artifact signing.

## Architecture

The native binary (`ns-llm-native`) will be extended to handle a new command: `generate`.

### JSON Protocol
Request:
```json
{
  "cmd": "generate",
  "text": "The quick brown fox",
  "max_tokens": 50,
  "temperature": 0.7
}
```

Response:
```json
{
  "text": " jumps over the lazy dog.",
  "tokens_generated": 6,
  "model": "gpt2-quantized"
}
```

### Model Pipeline
- Models will be exported to ONNX format.
- Quantization (int8/uint8) will be applied to reduce size and improve inference speed on CPU.
