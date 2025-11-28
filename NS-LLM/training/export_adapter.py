import argparse
import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

def export_adapter(base_model_name, adapter_path, output_path):
    print(f"Merging adapter {adapter_path} into {base_model_name}...")
    
    # Load Base Model
    base_model = AutoModelForCausalLM.from_pretrained(base_model_name)
    tokenizer = AutoTokenizer.from_pretrained(base_model_name)
    
    # Load Adapter
    model = PeftModel.from_pretrained(base_model, adapter_path)
    
    # Merge Weights
    model = model.merge_and_unload()
    
    # Save Merged Model
    model.save_pretrained(output_path)
    tokenizer.save_pretrained(output_path)
    
    print(f"Merged model saved to {output_path}")
    print("You can now convert this merged model to ONNX using the standard export script.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Merge LoRA adapter into base model")
    parser.add_argument("--base", type=str, default="gpt2", help="Base model name")
    parser.add_argument("--adapter", type=str, required=True, help="Path to adapter directory")
    parser.add_argument("--out", type=str, required=True, help="Output directory for merged model")
    
    args = parser.parse_args()
    
    export_adapter(args.base, args.adapter, args.out)
