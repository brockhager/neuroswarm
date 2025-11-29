/**
 * NeuroSwarm Visualization Plugin Starter Template
 * 
 * This template demonstrates how to create a custom dashboard widget
 * that visualizes NeuroSwarm metrics in real-time.
 * 
 * Widgets are loaded dynamically by the dashboard and can display:
 * - Custom metrics and KPIs
 * - Real-time data streams
 * - Interactive charts and graphs
 * - Plugin-specific visualizations
 */

class CustomVisualization {
  constructor(config = {}) {
    this.name = config.name || 'custom-widget';
    this.version = config.version || '1.0.0';
    this.refreshInterval = config.refreshInterval || 5000; // 5 seconds
    this.apiEndpoint = config.apiEndpoint || 'http://localhost:3009';
    
    this.container = null;
    this.intervalId = null;
    this.data = [];
    
    console.log(`[${this.name}] Visualization plugin initialized`);
  }

  /**
   * Render the widget into the specified container
   * Called by dashboard when loading the plugin
   * 
   * @param {HTMLElement} container - DOM element to render into
   */
  async render(container) {
    this.container = container;
    
    // Create widget HTML structure
    this.container.innerHTML = `
      <div class="widget-card">
        <div class="widget-header">
          <h3 class="widget-title">${this.name}</h3>
          <button class="widget-refresh" onclick="window.${this.name}_refresh()">🔄</button>
        </div>
        <div class="widget-content">
          <div class="widget-stats" id="${this.name}-stats">
            <div class="stat-item">
              <div class="stat-label">Loading...</div>
              <div class="stat-value">-</div>
            </div>
          </div>
          <canvas id="${this.name}-chart" class="widget-chart"></canvas>
        </div>
        <div class="widget-footer">
          <span class="widget-status" id="${this.name}-status">Initializing...</span>
          <span class="widget-updated" id="${this.name}-updated">-</span>
        </div>
      </div>
    `;

    // Add styles
    this._injectStyles();

    // Set up refresh button callback
    window[`${this.name}_refresh`] = () => this.refresh();

    // Initial data load
    await this.refresh();

    // Start auto-refresh
    this.startAutoRefresh();

    console.log(`[${this.name}] Rendered successfully`);
  }

  /**
   * Fetch data from API endpoint
   * 
   * @returns {Promise<Object>} API response data
   * @private
   */
  async _fetchData() {
    try {
      const response = await fetch(`${this.apiEndpoint}/api/metrics`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`[${this.name}] Data fetch error:`, error);
      throw error;
    }
  }

  /**
   * Refresh widget data and update display
   */
  async refresh() {
    const statusEl = document.getElementById(`${this.name}-status`);
    const updatedEl = document.getElementById(`${this.name}-updated`);

    try {
      statusEl.textContent = 'Loading...';
      statusEl.className = 'widget-status loading';

      // Fetch new data
      const data = await this._fetchData();
      this.data.push({
        timestamp: Date.now(),
        ...data
      });

      // Keep only last 50 data points
      if (this.data.length > 50) {
        this.data.shift();
      }

      // Update display
      this._updateStats(data);
      this._updateChart();

      // Update status
      statusEl.textContent = 'Active';
      statusEl.className = 'widget-status active';
      updatedEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;

    } catch (error) {
      statusEl.textContent = 'Error';
      statusEl.className = 'widget-status error';
      updatedEl.textContent = error.message;
    }
  }

  /**
   * Update stats display with latest data
   * 
   * @param {Object} data - Latest metrics data
   * @private
   */
  _updateStats(data) {
    const statsContainer = document.getElementById(`${this.name}-stats`);
    
    // Example: Display key metrics
    statsContainer.innerHTML = `
      <div class="stat-item">
        <div class="stat-label">Requests</div>
        <div class="stat-value">${data.requests || 0}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Latency (P95)</div>
        <div class="stat-value">${(data.latencyP95 || 0).toFixed(2)}ms</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Success Rate</div>
        <div class="stat-value">${((data.successRate || 0) * 100).toFixed(1)}%</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Errors</div>
        <div class="stat-value">${data.errors || 0}</div>
      </div>
    `;
  }

  /**
   * Update chart with historical data
   * 
   * @private
   */
  _updateChart() {
    const canvas = document.getElementById(`${this.name}-chart`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (this.data.length < 2) return;

    // Draw simple line chart
    const padding = 20;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Find min/max for scaling
    const values = this.data.map(d => d.latencyP95 || 0);
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);

    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw line
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.beginPath();

    this.data.forEach((point, i) => {
      const x = padding + (i / (this.data.length - 1)) * chartWidth;
      const value = point.latencyP95 || 0;
      const y = height - padding - ((value - minValue) / (maxValue - minValue)) * chartHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw data points
    ctx.fillStyle = '#667eea';
    this.data.forEach((point, i) => {
      const x = padding + (i / (this.data.length - 1)) * chartWidth;
      const value = point.latencyP95 || 0;
      const y = height - padding - ((value - minValue) / (maxValue - minValue)) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${maxValue.toFixed(0)}ms`, padding - 5, padding + 5);
    ctx.fillText(`${minValue.toFixed(0)}ms`, padding - 5, height - padding + 5);
  }

  /**
   * Start auto-refresh timer
   */
  startAutoRefresh() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.refresh();
    }, this.refreshInterval);

    console.log(`[${this.name}] Auto-refresh started (${this.refreshInterval}ms)`);
  }

  /**
   * Stop auto-refresh timer
   */
  stopAutoRefresh() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log(`[${this.name}] Auto-refresh stopped`);
    }
  }

  /**
   * Inject widget styles into page
   * 
   * @private
   */
  _injectStyles() {
    if (document.getElementById(`${this.name}-styles`)) return;

    const style = document.createElement('style');
    style.id = `${this.name}-styles`;
    style.textContent = `
      .widget-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        min-height: 300px;
        display: flex;
        flex-direction: column;
      }

      .widget-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #f0f0f0;
      }

      .widget-title {
        font-size: 1.3em;
        font-weight: 600;
        color: #333;
        margin: 0;
      }

      .widget-refresh {
        background: #f3f4f6;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 1em;
        transition: background 0.2s;
      }

      .widget-refresh:hover {
        background: #e5e7eb;
      }

      .widget-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 15px;
      }

      .widget-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 10px;
      }

      .stat-item {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 8px;
        border-left: 4px solid #667eea;
      }

      .stat-label {
        font-size: 0.85em;
        color: #6b7280;
        margin-bottom: 5px;
      }

      .stat-value {
        font-size: 1.5em;
        font-weight: 600;
        color: #333;
      }

      .widget-chart {
        flex: 1;
        min-height: 150px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
      }

      .widget-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #f0f0f0;
        font-size: 0.85em;
      }

      .widget-status {
        padding: 4px 8px;
        border-radius: 12px;
        font-weight: 600;
      }

      .widget-status.active {
        background: #d1fae5;
        color: #065f46;
      }

      .widget-status.loading {
        background: #fef3c7;
        color: #92400e;
      }

      .widget-status.error {
        background: #fee2e2;
        color: #991b1b;
      }

      .widget-updated {
        color: #6b7280;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Clean up resources when widget is removed
   */
  destroy() {
    this.stopAutoRefresh();
    
    // Remove global callback
    if (window[`${this.name}_refresh`]) {
      delete window[`${this.name}_refresh`];
    }

    console.log(`[${this.name}] Destroyed`);
  }

  /**
   * Get widget metadata for dashboard registration
   * 
   * @returns {Object} Widget metadata
   */
  getMetadata() {
    return {
      name: this.name,
      version: this.version,
      type: 'visualization',
      description: 'Custom visualization widget',
      author: 'Your Name',
      refreshInterval: this.refreshInterval,
      apiEndpoint: this.apiEndpoint
    };
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomVisualization;
}

// Make available globally for browser loading
if (typeof window !== 'undefined') {
  window.CustomVisualization = CustomVisualization;
}
