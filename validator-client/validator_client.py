# NeuroSwarm Validator Client V0.2.0 (Consumer Hardware Adaption)
# This client simulates the primary functions of a Validator node: 
# 1. Polling the Router API for assigned jobs.
# 2. Simulating LLM inference on the consumer GPU.
# 3. Reporting completion to the Router to trigger the Solana NSD Fee Split.

import time
import json
import random
import requests
from typing import Dict, Any, Optional

# --- Configuration ---
# NOTE: Replace with your actual Validator ID for testing the full flow.
VALIDATOR_ID = "Brock-Node-A" 
ROUTER_API_URL = "http://localhost:3000/api/v1" # Router API (Task 3) address
POLL_INTERVAL_SECONDS = 5
MAX_CAPACITY = 10 # Total processing slots available on this hardware

# --- State ---
current_gpu_load = 0 # Simulate current number of jobs being processed
is_throttled = False

def poll_for_jobs() -> Optional[Dict[str, Any]]:
    """
    Simulates checking the Router API for jobs assigned to this validator.
    In a real system, this would be a secure long-poll connection.
    """
    print(f"\n[{time.strftime('%H:%M:%S')}] Polling Router for new jobs assigned to {VALIDATOR_ID}...")
    
    # MOCK ROUTER ENDPOINT: We assume a /validator/poll endpoint exists in the router
    # that returns a job assigned to this ID if one is available.
    try:
        # We also send our current capacity/health status to the router
        health_data = {
            "capacity": MAX_CAPACITY - current_gpu_load,
            "gpu_temp_c": random.randint(50, 80),
            "is_throttled": is_throttled,
        }
        
        # Mock API Call - Replace with actual authenticated request
        # response = requests.post(f"{ROUTER_API_URL}/validator/poll/{VALIDATOR_ID}", json=health_data, timeout=3)
        # response.raise_for_status()
        
        # --- Mock Response Logic (since we don't have the real router running) ---
        if random.random() < 0.2: # 20% chance of receiving a job
             mock_job = {
                "jobId": f"job-{random.randint(1000, 9999)}",
                "prompt": "Write a 5-sentence summary of the NeuroSwarm economic model.",
                "feeAmount": 0.5, # NSD
                "assignedValidator": VALIDATOR_ID,
                "userWallet": "AABBCCDD...",
                "model": "NS-LLM-70B"
            }
             return mock_job
        # --- End Mock Response Logic ---

    except requests.exceptions.RequestException as e:
        print(f"ERROR: Could not connect to Router API. Check router status. Details: {e}")
        return None
    
    return None

def simulate_inference(prompt: str) -> str:
    """
    Placeholder for the actual LLM workload on the consumer GPU.
    Simulates processing time based on prompt length and hardware load.
    """
    global is_throttled
    
    # Mock inference time between 2 to 10 seconds
    inference_time = max(2, min(10, len(prompt) / 10 + current_gpu_load * 0.5)) 
    
    print(f"   [INFERENCE] Starting workload for {prompt[:30]}... (Estimated: {inference_time:.2f}s)")
    
    start_time = time.time()
    time.sleep(inference_time)
    
    # Simulate thermal throttling if inference was long (simple check)
    if inference_time > 8:
        is_throttled = True
        print("   [WARNING] High inference time detected. Throttling initiated.")
    
    # Mock LLM Response
    mock_result = f"Result for prompt: '{prompt}'. The inference was successfully completed by {VALIDATOR_ID} in {time.time() - start_time:.2f} seconds. The quality score is excellent, securing the 70% NSD reward."
    return mock_result

def report_completion(job_data: Dict[str, Any], result: str):
    """
    Reports the completed job back to the Router, which triggers the 
    Solana 'complete_request' instruction and the 70/20/10 fee split.
    """
    job_id = job_data['jobId']
    
    completion_payload = {
        "jobId": job_id,
        "validatorId": VALIDATOR_ID,
        "inferenceResult": result,
        "success": True,
        # The Router will handle building the Solana transaction using these inputs:
        "feeAmount": job_data['feeAmount'],
        "userWallet": job_data['userWallet']
    }
    
    print(f"   [REPORT] Reporting job {job_id} completion to Router...")
    
    # MOCK ROUTER ENDPOINT: Assume a /request/complete endpoint exists
    try:
        # Mock API Call - Replace with actual authenticated request
        # response = requests.post(f"{ROUTER_API_URL}/request/complete", json=completion_payload, timeout=5)
        # response.raise_for_status()
        
        # --- Mock Success Logic ---
        print(f"   [SUCCESS] Router accepted completion for {job_id}. NSD Fee Split (70/20/10) triggered on Solana.")
        print(f"   [REWARD] {job_data['feeAmount'] * 0.7:.4f} NSD reward secured for {VALIDATOR_ID}.")
        # --- End Mock Success Logic ---

    except requests.exceptions.RequestException as e:
        print(f"ERROR: Failed to report job completion for {job_id}. Router error: {e}")
        # Implement robust retry/logging here to ensure payment
        
def main_loop():
    """
    The main execution loop for the Validator Client.
    """
    global current_gpu_load
    print(f"--- NeuroSwarm Validator Client V0.2.0 Initialized ---")
    print(f"Validator ID: {VALIDATOR_ID} | Max Capacity: {MAX_CAPACITY} jobs")
    print(f"Press Ctrl+C to stop the client.")
    
    while True:
        try:
            # 1. Poll for a new job
            job_data = poll_for_jobs()
            
            if job_data:
                if current_gpu_load < MAX_CAPACITY:
                    current_gpu_load += 1
                    print(f"   [ASSIGNED] Job {job_data['jobId']} received. Current Load: {current_gpu_load}/{MAX_CAPACITY}")
                    
                    # 2. Process the job concurrently (simulated)
                    result = simulate_inference(job_data['prompt'])
                    
                    # 3. Report completion and trigger fee split
                    report_completion(job_data, result)
                    
                    # 4. Release capacity
                    current_gpu_load -= 1
                    print(f"   [CLEARED] Capacity released. Current Load: {current_gpu_load}/{MAX_CAPACITY}")
                else:
                    print(f"   [BUSY] Max capacity reached ({MAX_CAPACITY}). Skipping job poll cycle.")
            
            # Wait for the next poll cycle
            time.sleep(POLL_INTERVAL_SECONDS)

        except KeyboardInterrupt:
            print("\nShutting down Validator Client...")
            break
        except Exception as e:
            print(f"An unexpected error occurred in the main loop: {e}")
            time.sleep(POLL_INTERVAL_SECONDS * 2) # Wait longer on error

if __name__ == "__main__":
    main_loop()
