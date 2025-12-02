import os
import requests
import json
from flask import Flask, request, jsonify
from flask_cors import CORS 
from datetime import datetime
import base64

# --- 1. CONFIGURATION ---
MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY")
MISTRAL_ENDPOINT = "https://api.mistral.ai/v1/chat/completions"
MISTRAL_MODEL = "mistral-large-latest"
MISTRAL_TEMPERATURE = 0.2

# The core identity of Agent3 (The Neuroswarm Expert)
SYSTEM_INSTRUCTION = """
You are Agent3: The dedicated Neuroswarm Expert. Your primary function is to assist in the design, development, and maintenance of decentralized, open-source AI systems, particularly those related to Neuroswarm, Federated Learning, or integrating into large developer environments like Google Antigravity (AG).

You are currently participating in a multi-turn chat. Use the conversation history provided to maintain context and continuity in your responses.

***CONTEXT FROM GITHUB FILE (if provided)***
If the user provided file content, analyze it and use it directly in your response. The content will be included in the user's last message, inside a markdown code block labeled 'Github File Content'.

Your response must be professional, and if code or a detailed structure is requested, include it in a single Markdown file block. Be concise and focus on the technical details.
"""

app = Flask(__name__)
CORS(app) 

# --- 2. GITHUB API HELPER FUNCTION ---

def get_github_file_content(repo_url, path, token):
    """
    Fetches the content of a file from a public or private GitHub repository.
    Repo URL format expected: 'https://github.com/OWNER/REPO'
    """
    try:
        # 1. Parse Owner and Repo Name
        parts = repo_url.strip('/').split('/')
        if len(parts) < 2:
            raise ValueError("Invalid GitHub Repository URL format.")
        owner = parts[-2]
        repo_name = parts[-1]
        
        # 2. Construct the GitHub API URL for content
        api_url = f"https://api.github.com/repos/{owner}/{repo_name}/contents/{path.lstrip('/')}"
        
        headers = {
            "Accept": "application/vnd.github.v3.raw", # Request the raw content
            "Authorization": f"token {token}"
        }
        
        print(f"Fetching content from: {api_url}")

        response = requests.get(api_url, headers=headers)
        response.raise_for_status() # Raise an exception for bad status codes

        # GitHub API returns file content directly when Accept header is set to raw
        return response.text

    except requests.exceptions.RequestException as e:
        if response.status_code == 404:
            raise FileNotFoundError(f"File not found at path: {path}")
        elif response.status_code == 401:
            raise PermissionError("Invalid GitHub Token or insufficient permissions.")
        else:
            raise Exception(f"GitHub API Error ({response.status_code}): {e}")
    except ValueError as e:
        raise Exception(f"Input Error: {e}")
    except Exception as e:
        raise Exception(f"General Error during GitHub fetch: {e}")

# --- 3. API ENDPOINT ---

@app.route('/api/agent3/query', methods=['POST'])
def query_agent3():
    """
    Primary endpoint for the AG environment to send a request.
    It now handles fetching and injecting GitHub file content.
    """
    if not request.is_json:
        return jsonify({"error": "Missing JSON in request"}), 400

    data = request.get_json()
    user_query = data.get('query')
    conversation_history = data.get('history', [])
    
    # NEW: Optional GitHub context parameters
    github_token = data.get('github_token')
    github_repo = data.get('github_repo')
    github_filepath = data.get('github_filepath')

    if not user_query:
        return jsonify({"error": "Missing 'query' field in JSON payload"}), 400

    if not MISTRAL_API_KEY:
        return jsonify({"error": "Service configuration error: MISTRAL_API_KEY not set."}), 500

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Received query: {user_query[:50]}...")
    print(f"History length: {len(conversation_history)} messages.")

    # --- HANDLE GITHUB FILE INJECTION ---
    full_user_query = user_query
    if github_token and github_repo and github_filepath:
        try:
            file_content = get_github_file_content(github_repo, github_filepath, github_token)
            
            # Format the content to be injected into the LLM prompt
            injection_block = f"\n\n***Github File Content for {github_filepath}***\n"
            injection_block += f"```\n{file_content}\n```\n"
            
            full_user_query = user_query + injection_block
            print(f"Successfully injected content of {github_filepath} (Length: {len(file_content)} bytes)")

        except Exception as e:
            # If fetching fails, return an error immediately to the frontend
            return jsonify({
                "status": "error",
                "error": "GitHub File Fetch Error",
                "details": str(e)
            }), 400


    # --- BUILD THE FULL MESSAGE LIST (The Memory) ---
    messages = [{"role": "system", "content": SYSTEM_INSTRUCTION}]
    
    # Add all past user/assistant messages
    messages.extend(conversation_history) 
    
    # Append the final user message, which includes the injected file content
    messages.append({"role": "user", "content": full_user_query})

    # Build the payload for the Mistral API
    payload = {
        "model": MISTRAL_MODEL,
        "temperature": MISTRAL_TEMPERATURE,
        "messages": messages 
    }

    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        # Call the external Mistral API
        response = requests.post(MISTRAL_ENDPOINT, headers=headers, json=payload, timeout=90) # Increased timeout for long prompts
        response.raise_for_status()

        response_data = response.json()
        model_output = response_data['choices'][0]['message']['content']

        # Return the clean, processed response
        return jsonify({
            "status": "success",
            "agent_id": "Agent3",
            "model_used": MISTRAL_MODEL,
            "response_content": model_output
        })

    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e.response.status_code} - {e.response.text}")
        return jsonify({
            "error": "External API failure",
            "details": f"External API call failed with status {e.response.status_code}. Check your API key and network."
        }), 502
    except Exception as e:
        print(f"Internal Error: {e}")
        return jsonify({"error": "Internal service error", "details": str(e)}), 500

# --- 4. RUN THE SERVICE ---

if __name__ == '__main__':
    print("--- STARTING AGENT3 API GATEWAY (GITHUB ENABLED) ---")
    print(f"Listening on http://127.0.0.1:5000")
    print(f"Endpoint: /api/agent3/query")
    app.run(host='0.0.0.0', port=5000)