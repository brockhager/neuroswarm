/**
 * CN-08-B: ARTIFACT_CRITIQUE Transaction Generator
 * 
 * Processes REQUEST_REVIEW transactions from the mempool,
 * calls Gemini LLM with approved JSON schema, and generates
 * ARTIFACT_CRITIQUE transactions for network submission.
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// CTO-approved ARTIFACT_CRITIQUE schema (2025-12-04)
const ARTIFACT_CRITIQUE_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        artifact_id: {
            type: SchemaType.STRING,
            description: "Hash ID of artifact being reviewed",
        },
        review_block_height: {
            type: SchemaType.NUMBER,
            description: "Block height initiating review request",
        },
        critique_version: {
            type: SchemaType.STRING,
            description: "Schema version (e.g., '1.0.0')",
        },
        llm_model: {
            type: SchemaType.STRING,
            description: "LLM model identifier",
        },
        issues: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    severity: {
                        type: SchemaType.STRING,
                        description: "Issue severity: CRITICAL, HIGH, MEDIUM, LOW, or SUGGESTION",
                        enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "SUGGESTION"],
                    },
                    type: {
                        type: SchemaType.STRING,
                        description: "Issue category (e.g., 'Security Issue', 'Style Violation')",
                    },
                    file_path: {
                        type: SchemaType.STRING,
                        description: "File path within artifact bundle",
                    },
                    line_range: {
                        type: SchemaType.STRING,
                        description: "Line range (e.g., '15-20' or '25')",
                    },
                    comment: {
                        type: SchemaType.STRING,
                        description: "Detailed explanation and fix recommendation",
                    },
                },
                required: ["severity", "type", "file_path", "line_range", "comment"],
            },
        },
    },
    required: ["artifact_id", "review_block_height", "critique_version", "llm_model", "issues"],
};

// System prompt for code review
const CODE_REVIEW_SYSTEM_PROMPT = `You are an expert code reviewer for a decentralized network. 
Analyze the provided code for security issues, logic errors, style violations, and improvement opportunities.
Focus on:
1. Security vulnerabilities (injection, auth bypass, data leaks)
2. Logic errors (race conditions, edge cases, incorrect algorithms)  
3. Performance issues (inefficient loops, memory leaks)
4. Best practices violations (missing error handling, unclear variable names)

For each issue found, provide:
- Severity level (CRITICAL/HIGH for security/data loss, MEDIUM for logic bugs, LOW for style, SUGGESTION for improvements)
- Specific file path and line range
- Clear explanation and actionable fix recommendation

Be thorough but fair. If no issues found, return empty issues array.`;

/**
 * Critique Processor class
 */
class CritiqueProcessor {
    constructor(options = {}) {
        this.geminiApiKey = options.geminiApiKey || process.env.GEMINI_API_KEY;
        this.validatorId = options.validatorId;
        this.logFn = options.logFn || console.log;

        if (!this.geminiApiKey) {
            throw new Error('GEMINI_API_KEY environment variable required for critique processor');
        }

        this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
        this.model = this.genAI.getGenerativeModel({
            model: options.model || 'gemini-2.0-flash-exp',
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: ARTIFACT_CRITIQUE_SCHEMA,
            },
        });
    }

    /**
     * Fetch artifact content from NS-Node or Gateway
     * @param {string} artifactId - CID of the artifact
     * @param {string} gatewayUrl - Gateway URL
     * @returns {Promise<string>} - Artifact content as string
     */
    async fetchArtifactContent(artifactId, gatewayUrl) {
        try {
            // Try fetching from gateway
            const url = `${gatewayUrl}/v1/artifacts/${artifactId}`;
            const res = await fetch(url);

            if (!res.ok) {
                throw new Error(`Failed to fetch artifact ${artifactId}: HTTP ${res.status}`);
            }

            const content = await res.text();
            this.logFn(`[CritiqueProcessor] Fetched artifact ${artifactId} (${content.length} bytes)`);
            return content;
        } catch (error) {
            this.logFn(`[CritiqueProcessor] Error fetching artifact ${artifactId}:`, error.message);
            throw error;
        }
    }

    /**
     * Generate artifact critique using Gemini LLM
     * @param {Object} reviewRequest - REQUEST_REVIEW transaction
     * @param {string} artifactContent - Content to review
     * @returns {Promise<Object>} - Critique payload
     */
    async generateCritique(reviewRequest, artifactContent) {
        const { artifact_id, block_height } = reviewRequest;

        try {
            const prompt = `Review the following code artifact and identify any issues:\n\n\`\`\`\n${artifactContent}\n\`\`\``;

            this.logFn(`[CritiqueProcessor] Calling Gemini API for artifact ${artifact_id}...`);
            const result = await this.model.generateContent([
                { role: 'user', parts: [{ text: CODE_REVIEW_SYSTEM_PROMPT }] },
                { role: 'user', parts: [{ text: prompt }] },
            ]);

            const response = await result.response;
            const critiqueJson = JSON.parse(response.text());

            // Validate response structure
            if (!critiqueJson || typeof critiqueJson !== 'object') {
                throw new Error('Invalid LLM response: not an object');
            }

            // Ensure required fields are present (LLM should guarantee this via schema)
            critiqueJson.artifact_id = artifact_id;
            critiqueJson.review_block_height = block_height || 0;
            critiqueJson.critique_version = critiqueJson.critique_version || '1.0.0';
            critiqueJson.llm_model = critiqueJson.llm_model || this.model.model;
            critiqueJson.issues = critiqueJson.issues || [];

            this.logFn(`[CritiqueProcessor] Generated critique for ${artifact_id}: ${critiqueJson.issues.length} issues found`);
            return critiqueJson;
        } catch (error) {
            this.logFn(`[CritiqueProcessor] Error generating critique for ${artifact_id}:`, error.message);
            throw error;
        }
    }

    /**
     * Create ARTIFACT_CRITIQUE transaction
     * @param {Object} critiquePayload - Validated critique from LLM
     * @returns {Object} - Transaction object ready for signing
     */
    createCritiqueTx(critiquePayload) {
        return {
            type: 'ARTIFACT_CRITIQUE',
            from: this.validatorId,
            payload: critiquePayload,
            timestamp: Date.now(),
        };
    }

    /**
     * Process a REQUEST_REVIEW transaction
     * Main entry point: fetches artifact, calls LLM, generates tx
     * 
     * @param {Object} reviewRequest - REQUEST_REVIEW transaction
     * @param {string} gatewayUrl - Gateway URL for artifact fetching
     * @returns {Promise<Object|null>} - ARTIFACT_CRITIQUE transaction or null if error
     */
    async processReviewRequest(reviewRequest, gatewayUrl) {
        try {
            if (!reviewRequest || reviewRequest.type !== 'REQUEST_REVIEW') {
                return null;
            }

            const artifactId = reviewRequest.artifact_id;
            if (!artifactId) {
                this.logFn(`[CritiqueProcessor] Invalid REQUEST_REVIEW: missing artifact_id`);
                return null;
            }

            this.logFn(`[CritiqueProcessor] Processing REQUEST_REVIEW for artifact ${artifactId}`);

            // Step 1: Fetch artifact content
            const artifactContent = await this.fetchArtifactContent(artifactId, gatewayUrl);

            // Step 2: Generate critique using Gemini
            const critiquePayload = await this.generateCritique(reviewRequest, artifactContent);

            // Step 3: Create transaction
            const critiqueTx = this.createCritiqueTx(critiquePayload);

            this.logFn(`[CritiqueProcessor] Created ARTIFACT_CRITIQUE tx for ${artifactId}`);
            return critiqueTx;
        } catch (error) {
            this.logFn(`[CritiqueProcessor] Failed to process review request:`, error.message);
            return null;
        }
    }
}

export { CritiqueProcessor, ARTIFACT_CRITIQUE_SCHEMA, CODE_REVIEW_SYSTEM_PROMPT };
