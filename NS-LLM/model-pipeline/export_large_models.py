"""
Model Registry and Export Script for Larger Models

Supports:
- GPT-2 (124M) - baseline
- TinyLlama-1.1B (1.1B parameters)
- Llama-2-7B (7B parameters, quantized)

Mistral models have been removed from the repository due to project policy.
If you require a replacement model, add it to the MODEL_REGISTRY with an
appropriate huggingface ID and metadata.
"""

import argparse
import json
import os
from pathlib import Path
from optimum.onnxruntime import ORTModelForCausalLM
from transformers import AutoTokenizer
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

# Model registry with metadata
MODEL_REGISTRY = {
    "gpt2": {
        "hf_id": "gpt2",
        "params": "124M",
        "context_length": 1024,
        "quantize": True,
        "description": "GPT-2 baseline model"
    },
    "tinyllama": {
        "hf_id": "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        "params": "1.1B",
        "context_length": 2048,
        "quantize": True,
        "description": "TinyLlama 1.1B chat model"
    },
    "llama2-7b": {
        "hf_id": "meta-llama/Llama-2-7b-chat-hf",
        "params": "7B",
        "context_length": 4096,
        "quantize": True,
        "description": "Llama 2 7B chat model (requires HF token)"
    },
    # Mistral entries intentionally removed
}

def export_model(model_key, output_dir, quantize=True, force=False):
    """
    Export a model from the registry to ONNX format
    
    Args:
        model_key: Key from MODEL_REGISTRY
        output_dir: Output directory for ONNX model
        quantize: Whether to apply dynamic quantization
        force: Force re-export even if file exists
    """
    if model_key not in MODEL_REGISTRY:
        raise ValueError(f"Unknown model: {model_key}. Available: {list(MODEL_REGISTRY.keys())}")
    
    model_info = MODEL_REGISTRY[model_key]
    hf_id = model_info["hf_id"]
    
    print(f"\n{'='*60}")
    print(f"Exporting: {model_key}")
    print(f"HuggingFace ID: {hf_id}")
    print(f"Parameters: {model_info['params']}")
    print(f"Context Length: {model_info['context_length']}")
    print(f"{'='*60}\n")
    
    # Create output directory
    output_path = Path(output_dir) / model_key
    output_path.mkdir(parents=True, exist_ok=True)
    
    onnx_path = output_path / "model.onnx"
    quantized_path = output_path / "model_quantized.onnx"
    
    # Check if already exists
    if not force and quantized_path.exists():
        print(f"✓ Model already exists: {quantized_path}")
        print("  Use --force to re-export")
        return str(quantized_path)
    
    try:
        # Export to ONNX
        print("1. Loading model from HuggingFace...")
        model = ORTModelForCausalLM.from_pretrained(
            hf_id,
            export=True,
            provider="CPUExecutionProvider"
        )
        
        print("2. Saving ONNX model...")
        model.save_pretrained(str(output_path))
        
        # Export tokenizer
        print("3. Exporting tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(hf_id)
        tokenizer.save_pretrained(str(output_path))
        
        # Quantize if requested
        if quantize and model_info["quantize"]:
            print("4. Applying dynamic quantization...")
            
            # Default to QInt8 (closest to Q4_K_M in spirit for ONNX)
            # ONNX Runtime mainly supports QInt8/QUInt8 for dynamic quantization
            # For more advanced types (Q4, Q5), we'd need OQT or specific block quantization
            # Here we expose a few standard ONNX types
            
            q_type = QuantType.QInt8
            if os.environ.get("QUANT_TYPE") == "QUInt8":
                q_type = QuantType.QUInt8
            
            quantize_dynamic(
                str(onnx_path),
                str(quantized_path),
                weight_type=q_type
            )
            print(f"✓ Quantized model saved: {quantized_path} (Type: {q_type})")
            
            # Remove unquantized version to save space
            if onnx_path.exists():
                onnx_path.unlink()
                print("  Removed unquantized version")
        
        # Save model metadata
        metadata = {
            "model_key": model_key,
            "hf_id": hf_id,
            "params": model_info["params"],
            "context_length": model_info["context_length"],
            "quantized": quantize,
            "description": model_info["description"]
        }
        
        metadata_path = output_path / "metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"\n✓ Export complete!")
        print(f"  Model: {quantized_path if quantize else onnx_path}")
        print(f"  Tokenizer: {output_path}")
        print(f"  Metadata: {metadata_path}")
        
        return str(quantized_path if quantize else onnx_path)
        
    except Exception as e:
        print(f"\n✗ Export failed: {e}")
        raise

def list_models():
    """List all available models in the registry"""
    print("\nAvailable Models:")
    print("=" * 80)
    for key, info in MODEL_REGISTRY.items():
        print(f"\n{key}:")
        print(f"  HuggingFace ID: {info['hf_id']}")
        print(f"  Parameters: {info['params']}")
        print(f"  Context Length: {info['context_length']}")
        print(f"  Description: {info['description']}")
    print("\n" + "=" * 80)

def main():
    parser = argparse.ArgumentParser(description="Export generative models to ONNX")
    parser.add_argument("--model", type=str, help="Model key from registry")
    parser.add_argument("--list", action="store_true", help="List available models")
    parser.add_argument("--out", type=str, default="../models", help="Output directory")
    parser.add_argument("--quantize", action="store_true", default=True, help="Apply quantization")
    parser.add_argument("--no-quantize", dest="quantize", action="store_false", help="Skip quantization")
    parser.add_argument("--force", action="store_true", help="Force re-export")
    
    args = parser.parse_args()
    
    if args.list:
        list_models()
        return
    
    if not args.model:
        print("Error: --model required (or use --list to see available models)")
        return
    
    export_model(args.model, args.out, args.quantize, args.force)

if __name__ == "__main__":
    main()
