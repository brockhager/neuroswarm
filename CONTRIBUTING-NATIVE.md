# Contributing to NS-LLM Native Backend

## Overview
The NS-LLM native backend provides high-performance inference for both **embedding** and **text generation** models using ONNX Runtime.

## Architecture

### Commands
The native binary accepts JSON commands via stdin:

**Embedding:**
```json
{"cmd": "embed", "text": "Hello world"}
```

**Text Generation:**
```json
{"cmd": "generate", "text": "The quick brown fox", "max_tokens": 20}
```

**Health Check:**
```json
{"cmd": "health"}
```

## Building Locally

### Prerequisites
- CMake 3.12+
- C++17 compiler (GCC 7+, Clang 5+, MSVC 2017+)
- ONNX Runtime 1.15.1+ (optional, for real inference)

### Build Steps

**Prototype Mode (No ONNX Runtime):**
```bash
cd NS-LLM/native
mkdir -p build && cd build
cmake .. -DPROTOTYPE_ONLY=ON
cmake --build . --config Release
```

**With ONNX Runtime:**
```bash
# Set ONNXRUNTIME_DIR to your ONNX Runtime installation
export ONNXRUNTIME_DIR=/path/to/onnxruntime

cd NS-LLM/native
mkdir -p build && cd build
cmake .. -DPROTOTYPE_ONLY=OFF -DONNXRUNTIME_DIR=$ONNXRUNTIME_DIR
cmake --build . --config Release
```

## Running Generative Inference

### 1. Export a Model
```bash
cd NS-LLM/model-pipeline
pip install -r requirements.txt
python export_generative.py --model gpt2 --out ../models/gpt2.onnx --quantize
```

This creates:
- `models/gpt2.onnx` (or `decoder_model.onnx`)
- `models/vocab.json`
- `models/merges.txt`
- `models/tokenizer_config.json`

### 2. Copy Models to Build Directory
```bash
mkdir -p NS-LLM/native/build/models
cp -r NS-LLM/models/* NS-LLM/native/build/models/
```

### 3. Run the Binary
```bash
cd NS-LLM/native/build
echo '{"cmd":"generate", "text":"Once upon a time"}' | ./ns-llm-native
```

**Expected Output:**
```json
{"text":" in a land far away...", "model":"gpt2", "tokens_generated":6}
```

## Testing

### Smoke Tests
```bash
# Stub mode (no ONNX)
echo '{"cmd":"generate", "text":"Hello"}' | ./ns-llm-native --stub

# Real inference
echo '{"cmd":"generate", "text":"The quick brown fox"}' | ./ns-llm-native
```

### Latency Benchmarking
```bash
# Warmup
echo '{"cmd":"generate", "text":"Test"}' | ./ns-llm-native > /dev/null

# Measure
time echo '{"cmd":"generate", "text":"Once upon a time"}' | ./ns-llm-native
```

**Target:** < 500ms for 20 tokens on modern CPUs.

## Implementation Details

### Tokenizer
The current implementation uses a **minimal BPE tokenizer** that loads GPT-2's `vocab.json` and `merges.txt`. 

**Limitations:**
- Simplified unicode handling
- Mock implementation for smoke tests (returns fixed tokens for "Hello")

**Future Improvements:**
- Full BPE implementation (~200 lines)
- Integration with [tokenizers-cpp](https://github.com/mlc-ai/tokenizers-cpp)
- pybind11 binding to HuggingFace tokenizers

### Greedy Search
The inference loop implements **greedy decoding**:
1. Tokenize input text
2. For each generation step:
   - Prepare `input_ids` and `attention_mask` tensors
   - Run `session.Run()`
   - Extract logits for the last position
   - Select token with highest probability (argmax)
   - Append to sequence
   - Check for EOS token (50256)
3. Detokenize and return

**Safeguards:**
- `max_new_tokens = 20` (hardcoded limit)
- EOS token detection
- Exception handling for ONNX errors

## Troubleshooting

### "failed to load tokenizer files"
Ensure `vocab.json` and `merges.txt` are in the `models/` directory relative to the binary.

### "generation-failed: ..."
Check that:
1. The ONNX model exists at `models/gpt2.onnx` or `models/gpt2_quantized.onnx`
2. The model was exported with `task="text-generation-with-past"`
3. ONNX Runtime is correctly linked (check `ldd ./ns-llm-native` on Linux)

### High Latency
- Use quantized models (`--quantize` flag in export script)
- Reduce `max_new_tokens`
- Enable ONNX Runtime optimizations (already enabled: `ORT_ENABLE_ALL`)

## CI Integration

The GitHub Actions workflow automatically:
1. Downloads ONNX Runtime for each platform
2. Exports GPT-2 model with quantization
3. Builds the native binary with ONNX support
4. Runs smoke tests with latency measurement
5. Uploads artifacts for release

**Workflow File:** `.github/workflows/phase-a-native-build.yml`

## Performance Targets

| Platform | Latency (20 tokens) | Memory |
|----------|---------------------|--------|
| Ubuntu   | < 500ms             | < 2GB  |
| macOS    | < 500ms             | < 2GB  |
| Windows  | < 500ms             | < 2GB  |

## Next Steps

1. **Full BPE Tokenizer**: Replace the mock implementation
2. **Sampling Strategies**: Add temperature, top-k, top-p
3. **KV Cache**: Optimize for multi-turn generation
4. **Larger Models**: Support TinyLlama, Llama-2-7B (quantized)
