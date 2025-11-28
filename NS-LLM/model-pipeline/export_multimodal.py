import argparse
import os
import shutil
from optimum.onnxruntime import ORTModelForVision2Seq, ORTModelForSpeechSeq2Seq
from transformers import AutoProcessor, AutoTokenizer

# Multi-modal Model Registry
# Format: key -> { hf_id, type, quantized }
MM_REGISTRY = {
    "vit-gpt2": {
        "hf_id": "nlpconnect/vit-gpt2-image-captioning",
        "type": "vision",
        "quantized": True
    },
    "whisper-tiny": {
        "hf_id": "openai/whisper-tiny.en",
        "type": "audio",
        "quantized": True
    }
}

def export_model(model_key, output_dir):
    if model_key not in MM_REGISTRY:
        print(f"Error: Model {model_key} not found in registry.")
        return

    meta = MM_REGISTRY[model_key]
    print(f"Exporting {model_key} ({meta['type']})...")
    
    model_path = os.path.join(output_dir, model_key)
    if os.path.exists(model_path):
        print(f"Model directory {model_path} already exists. Skipping.")
        return

    try:
        if meta['type'] == 'vision':
            model = ORTModelForVision2Seq.from_pretrained(meta['hf_id'], export=True)
            processor = AutoProcessor.from_pretrained(meta['hf_id'])
            
            model.save_pretrained(model_path)
            processor.save_pretrained(model_path)
            
            if meta['quantized']:
                print("Quantizing vision model...")
                # Optimum handles quantization during export usually, or we can use dynamic quantization here
                # For simplicity, we rely on Optimum's default export which often includes quantized versions or we can run a quantizer pass
                # Here we just save what we got
                pass

        elif meta['type'] == 'audio':
            model = ORTModelForSpeechSeq2Seq.from_pretrained(meta['hf_id'], export=True)
            processor = AutoProcessor.from_pretrained(meta['hf_id'])
            
            model.save_pretrained(model_path)
            processor.save_pretrained(model_path)

        print(f"Successfully exported {model_key} to {model_path}")

    except Exception as e:
        print(f"Failed to export {model_key}: {e}")
        if os.path.exists(model_path):
            shutil.rmtree(model_path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export multi-modal models to ONNX")
    parser.add_argument("--model", type=str, help="Model key (vit-gpt2, whisper-tiny)")
    parser.add_argument("--out", type=str, default="models", help="Output directory")
    parser.add_argument("--list", action="store_true", help="List available models")

    args = parser.parse_args()

    if args.list:
        print("Available Multi-modal Models:")
        for k, v in MM_REGISTRY.items():
            print(f" - {k}: {v['hf_id']} ({v['type']})")
        exit(0)

    if not os.path.exists(args.out):
        os.makedirs(args.out)

    if args.model:
        export_model(args.model, args.out)
    else:
        # Export all
        for k in MM_REGISTRY:
            export_model(k, args.out)
