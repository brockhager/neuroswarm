import json
import argparse
import os

def format_dataset(input_file, output_file, format_type="alpaca"):
    print(f"Formatting {input_file} to {output_file} ({format_type})...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    with open(output_file, 'w', encoding='utf-8') as f:
        for item in data:
            if format_type == "alpaca":
                # Alpaca format: instruction, input, output
                instruction = item.get("instruction", "")
                input_text = item.get("input", "")
                output = item.get("output", "")
                
                text = f"Instruction: {instruction}\nInput: {input_text}\nOutput: {output}"
                f.write(json.dumps({"text": text}) + "\n")
                
            elif format_type == "plain":
                # Just text field
                text = item.get("text", "")
                f.write(json.dumps({"text": text}) + "\n")

    print("Done.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Format dataset for training")
    parser.add_argument("--input", type=str, required=True, help="Input JSON file")
    parser.add_argument("--output", type=str, required=True, help="Output JSONL file")
    parser.add_argument("--format", type=str, default="alpaca", choices=["alpaca", "plain"], help="Input format")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input):
        print(f"Error: Input file {args.input} not found.")
        exit(1)
        
    format_dataset(args.input, args.output, args.format)
