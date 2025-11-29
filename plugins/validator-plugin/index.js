/**
 * NeuroSwarm Validator Plugin Starter Template
 * 
 * This template demonstrates how to create a custom content validator
 * that integrates with the NeuroSwarm ecosystem.
 * 
 * Validators are used to enforce quality standards, detect spam,
 * and maintain trust in the Global Brain knowledge base.
 */

export default class CustomValidator {
  constructor(config = {}) {
    this.name = config.name || 'custom-validator';
    this.version = config.version || '1.0.0';
    this.enabled = config.enabled !== false;
    
    // Custom configuration
    this.minLength = config.minLength || 10;
    this.maxLength = config.maxLength || 10000;
    this.blockedWords = config.blockedWords || [];
    this.requiredFields = config.requiredFields || ['type', 'payload'];
    
    console.log(`[${this.name}] Validator initialized`);
  }

  /**
   * Main validation method called by PluginManager
   * 
   * @param {Object} entry - The data entry to validate
   * @param {string} entry.type - Entry type (e.g., 'learn', 'query')
   * @param {any} entry.payload - Entry content
   * @param {string} entry.signedBy - Creator signature
   * @param {Object} entry.metadata - Optional metadata
   * @returns {Promise<Object>} Validation result
   */
  async validate(entry) {
    const startTime = Date.now();
    const errors = [];
    const warnings = [];

    try {
      // 1. Check required fields
      for (const field of this.requiredFields) {
        if (!(field in entry)) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      if (errors.length > 0) {
        return this._buildResult(false, errors, warnings, startTime);
      }

      // 2. Validate payload type
      if (typeof entry.payload !== 'string') {
        errors.push('Payload must be a string');
        return this._buildResult(false, errors, warnings, startTime);
      }

      // 3. Check length constraints
      const length = entry.payload.length;
      if (length < this.minLength) {
        errors.push(`Payload too short: ${length} < ${this.minLength}`);
      }
      if (length > this.maxLength) {
        errors.push(`Payload too long: ${length} > ${this.maxLength}`);
      }

      // 4. Check for blocked words
      const payloadLower = entry.payload.toLowerCase();
      for (const word of this.blockedWords) {
        if (payloadLower.includes(word.toLowerCase())) {
          errors.push(`Contains blocked word: ${word}`);
        }
      }

      // 5. Custom validation logic (example: check for spam patterns)
      if (this._isSpamPattern(entry.payload)) {
        warnings.push('Potential spam pattern detected');
      }

      // 6. Validate signature if present
      if (entry.signedBy && !this._isValidSignature(entry.signedBy)) {
        errors.push('Invalid signature format');
      }

      // Return validation result
      const valid = errors.length === 0;
      return this._buildResult(valid, errors, warnings, startTime);

    } catch (error) {
      console.error(`[${this.name}] Validation error:`, error);
      return this._buildResult(false, [`Internal error: ${error.message}`], warnings, startTime);
    }
  }

  /**
   * Check for spam patterns (example implementation)
   * 
   * @param {string} text - Text to analyze
   * @returns {boolean} True if spam pattern detected
   * @private
   */
  _isSpamPattern(text) {
    // Example: Repeated characters
    if (/(.)\1{10,}/.test(text)) return true;
    
    // Example: Excessive capitalization
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.7 && text.length > 20) return true;
    
    // Example: URL spam
    const urlCount = (text.match(/https?:\/\//g) || []).length;
    if (urlCount > 5) return true;
    
    return false;
  }

  /**
   * Validate signature format
   * 
   * @param {string} signature - Signature to validate
   * @returns {boolean} True if valid format
   * @private
   */
  _isValidSignature(signature) {
    // Example: Check for hex string format
    return /^[a-fA-F0-9]+$/.test(signature) && signature.length >= 64;
  }

  /**
   * Build validation result object
   * 
   * @param {boolean} valid - Whether validation passed
   * @param {string[]} errors - List of errors
   * @param {string[]} warnings - List of warnings
   * @param {number} startTime - Validation start timestamp
   * @returns {Object} Validation result
   * @private
   */
  _buildResult(valid, errors, warnings, startTime) {
    const executionTime = Date.now() - startTime;
    
    return {
      valid,
      validator: this.name,
      version: this.version,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      executionTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get validator metadata (called by PluginManager during registration)
   * 
   * @returns {Object} Validator metadata
   */
  getMetadata() {
    return {
      name: this.name,
      version: this.version,
      type: 'validator',
      description: 'Custom content validator for NeuroSwarm',
      author: 'Your Name',
      enabled: this.enabled,
      config: {
        minLength: this.minLength,
        maxLength: this.maxLength,
        blockedWords: this.blockedWords.length,
        requiredFields: this.requiredFields
      }
    };
  }

  /**
   * Enable the validator
   */
  enable() {
    this.enabled = true;
    console.log(`[${this.name}] Enabled`);
  }

  /**
   * Disable the validator
   */
  disable() {
    this.enabled = false;
    console.log(`[${this.name}] Disabled`);
  }

  /**
   * Update configuration dynamically
   * 
   * @param {Object} newConfig - New configuration values
   */
  updateConfig(newConfig) {
    if (newConfig.minLength !== undefined) this.minLength = newConfig.minLength;
    if (newConfig.maxLength !== undefined) this.maxLength = newConfig.maxLength;
    if (newConfig.blockedWords !== undefined) this.blockedWords = newConfig.blockedWords;
    if (newConfig.requiredFields !== undefined) this.requiredFields = newConfig.requiredFields;
    
    console.log(`[${this.name}] Configuration updated`);
  }
}
