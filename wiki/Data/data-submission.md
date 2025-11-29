# Data Submission Guide (Contributor)

This guide helps contributors prepare and submit data to the NeuroSwarm Brain.

Pre-requisites:
- A valid JWT token with role 'contributor' or higher
- Optionally: Create data files to store on IPFS or other storage before submission

CLI:
- Install dependencies and ensure admin node is running (`npm run dev` in `admin-node`)
- Submit a file by computing its SHA-256 fingerprint and posting it to `/v1/brain/submit` using the CLI:

```bash
# Sample: compute hash and submit
npx ts-node ../submissions/src/cli/submit-data.ts --file ./dataset.csv \
  --contributorId contributor-abc --token "<JWT>" --url "http://localhost:8080/v1/brain/submit"
```

API:
- POST `/v1/brain/submit`
  - Body: JSON
    - contributorId (string)
    - tags (array of strings)
    - description (string)
    - sha256 (64 hex characters) or data (object) to be hashed server-side
    - submissionType: 'file' | 'json' | 'telemetry' (optional)
    - metadata: object (optional)

Response:
- success: boolean
- timelineId: string
- anchorResult: details about anchoring

Security & Governance:
- The admin node writes a signed timeline entry for every submission.
- The founder account anchors the submission hash to Solana (manual step).
- If the system is in safety/maintenance mode, submissions are rejected with 503.

Operational notes:
- Submit actual data to external storage (e.g., IPFS, S3) and include storage references in `metadata`.
- Do not store raw sensitive data on-chain.
