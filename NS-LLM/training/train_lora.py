import argparse
import os
import json
import torch
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer, DataCollatorForLanguageModeling
from peft import LoraConfig, get_peft_model, TaskType

def train_lora(model_name, dataset_path, output_dir, epochs=3, batch_size=4, learning_rate=2e-4):
    print(f"Starting LoRA training for {model_name}...")
    
    # Load Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.pad_token = tokenizer.eos_token

    # Load Dataset
    # Assumes JSONL format: {"text": "..."}
    data_files = {"train": dataset_path}
    dataset = load_dataset("json", data_files=data_files)
    
    def tokenize_function(examples):
        return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=128)

    tokenized_datasets = dataset.map(tokenize_function, batched=True)

    # Load Model
    model = AutoModelForCausalLM.from_pretrained(model_name)
    
    # Configure LoRA
    peft_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM, 
        inference_mode=False, 
        r=8, 
        lora_alpha=32, 
        lora_dropout=0.1
    )
    
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # Training Arguments
    training_args = TrainingArguments(
        output_dir=output_dir,
        per_device_train_batch_size=batch_size,
        num_train_epochs=epochs,
        learning_rate=learning_rate,
        logging_steps=10,
        save_steps=100,
        save_total_limit=2,
        fp16=False, # Set to True if GPU available
        use_cpu=True # Force CPU for compatibility in this env
    )

    # Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_datasets["train"],
        data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False),
    )

    # Train
    trainer.train()

    # Save Adapter
    model.save_pretrained(output_dir)
    print(f"LoRA adapter saved to {output_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train LoRA adapter")
    parser.add_argument("--model", type=str, default="gpt2", help="Base model name")
    parser.add_argument("--dataset", type=str, required=True, help="Path to JSONL dataset")
    parser.add_argument("--out", type=str, default="lora_adapter", help="Output directory")
    parser.add_argument("--epochs", type=int, default=3, help="Number of epochs")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.dataset):
        print(f"Error: Dataset {args.dataset} not found.")
        exit(1)
        
    train_lora(args.model, args.dataset, args.out, args.epochs)
