#!/usr/bin/env python3
"""
Export a generative model (e.g. GPT-2, TinyLlama) to ONNX using Optimum.

Usage:
python export_generative.py --model gpt2 --out models/gpt2.onnx --quantize
"""

import argparse
import os
import sys
import shutil
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', default='gpt2', help='Hugging Face model identifier')
    parser.add_argument('--out', required=True, help='Output directory or filename base')
    parser.add_argument('--quantize', action='store_true', help='Apply int8 quantization')
    parser.add_argument('--cache-dir', default='~/.cache/hf', help='Hugging Face cache dir')
    args = parser.parse_args()

    # Create output directory
    out_path = Path(args.out)
    if out_path.suffix == '.onnx':
        out_dir = out_path.parent
    else:
        out_dir = out_path
    
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        from optimum.exporters.onnx import main_export
        from onnxruntime.quantization import quantize_dynamic, QuantType
    except ImportError as e:
        print(f"Error: Required packages not available: {e}")
        print("Install with:")
        print("pip install optimum optimum-exporters onnxruntime transformers")
        sys.exit(1)

    print(f"Exporting {args.model} to ONNX...")
    
    # Export using Optimum
    # This handles the complex task of exporting decoder-only models with past_key_values
    try:
        main_export(
            model_name_or_path=args.model,
            output=out_dir,
            task="text-generation-with-past",
            cache_dir=os.path.expanduser(args.cache_dir),
            no_post_process=False
        )
        print(f"Successfully exported model to {out_dir}")
        
        # Save tokenizer files
        from transformers import AutoTokenizer
        tokenizer = AutoTokenizer.from_pretrained(args.model, cache_dir=os.path.expanduser(args.cache_dir))
        tokenizer.save_pretrained(out_dir)
        print(f"Saved tokenizer files to {out_dir}")

    except Exception as e:
        print(f"Export failed: {e}")
        sys.exit(1)

    # Quantization
    if args.quantize:
        print("Quantizing model...")
        model_onnx = out_dir / "decoder_model.onnx"
        model_quant = out_dir / "decoder_model_quantized.onnx"
        
        if not model_onnx.exists():
            # Some models might export as model.onnx
            model_onnx = out_dir / "model.onnx"
            model_quant = out_dir / "model_quantized.onnx"

        if model_onnx.exists():
            quantize_dynamic(
                model_input=model_onnx,
                model_output=model_quant,
                weight_type=QuantType.QUInt8
            )
            print(f"Quantized model saved to {model_quant}")
            
            # Optionally replace original with quantized to save space
            # shutil.move(model_quant, model_onnx)
        else:
            print(f"Warning: Could not find ONNX file at {model_onnx} to quantize")

if __name__ == '__main__':
    main()
