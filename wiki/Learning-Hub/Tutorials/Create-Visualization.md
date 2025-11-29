# Tutorial: Create a Custom Dashboard Visualization

[← Learning Hub](../README.md) | [← Tutorials](./README.md)

**Difficulty**: Intermediate  
**Time**: 30 minutes  
**Prerequisites**: JavaScript, HTML Canvas basics

## What You'll Build

A real-time dashboard widget that displays NeuroSwarm metrics with interactive charts and auto-refresh capability.

**Final Result:**
- Live updating chart widget
- Metrics display (throughput, latency, cache hit rate)
- Error handling and graceful degradation
- Standalone demo page

---

## Step 1: Set Up Your Plugin

Start with the visualization plugin starter kit:

```bash
cd neuroswarm/plugins
cp -r visualization-plugin my-custom-widget
cd my-custom-widget
```

**File structure:**
```
my-custom-widget/
├── widget.js        # Main widget logic
├── demo.html        # Test page
├── package.json     # Plugin metadata
└── README.md        # Documentation
```

---

## Step 2: Define Widget Metadata

Open `package.json` and customize your widget:

```json
{
  "name": "custom-metric-widget",
  "version": "1.0.0",
  "description": "Real-time throughput and latency monitor",
  "main": "widget.js",
  "keywords": ["visualization", "metrics", "dashboard"],
  "author": "Your Name",
  "license": "MIT"
}
```

**Key fields:**
- `name` — Unique widget identifier
- `description` — Shown in dashboard widget picker
- `keywords` — Used for search/filtering

---

## Step 3: Create Widget Class

Open `widget.js` and define your widget structure:

```javascript
export default class CustomMetricWidget {
  constructor(options = {}) {
    this.containerId = options.containerId || 'metric-widget';
    this.apiUrl = options.apiUrl || 'http://localhost:3009/api/metrics';
    this.refreshInterval = options.refreshInterval || 5000; // 5 seconds
    this.canvas = null;
    this.ctx = null;
    this.data = { throughput: [], latency: [] };
    this.maxDataPoints = 50; // 50 data points = ~4 minutes of history
  }

  // Initialize widget on page load
  async init() {
    this.createDOM();
    await this.fetchData();
    this.startAutoRefresh();
  }

  // Create HTML structure
  createDOM() {
    const container = document.getElementById(this.containerId);
    container.innerHTML = `
      <div class="widget-header">
        <h3>Real-Time Metrics</h3>
        <button id="pause-btn">⏸ Pause</button>
      </div>
      <canvas id="metrics-chart" width="800" height="400"></canvas>
      <div class="widget-stats">
        <div class="stat">
          <span class="label">Avg Throughput:</span>
          <span id="avg-throughput">-- tx/s</span>
        </div>
        <div class="stat">
          <span class="label">P95 Latency:</span>
          <span id="p95-latency">-- ms</span>
        </div>
      </div>
    `;
    this.canvas = document.getElementById('metrics-chart');
    this.ctx = this.canvas.getContext('2d');
    
    // Pause button handler
    document.getElementById('pause-btn').addEventListener('click', () => {
      this.togglePause();
    });
  }

  // Fetch metrics from API
  async fetchData() {
    try {
      const response = await fetch(this.apiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const metrics = await response.json();
      
      // Add to history, maintain max length
      this.data.throughput.push(metrics.throughput || 0);
      this.data.latency.push(metrics.latency_p95 || 0);
      
      if (this.data.throughput.length > this.maxDataPoints) {
        this.data.throughput.shift();
        this.data.latency.shift();
      }
      
      this.render();
    } catch (error) {
      console.warn('Failed to fetch metrics:', error.message);
      this.renderError(error.message);
    }
  }

  // Draw chart with dual Y-axes
  render() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const padding = 40;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw axes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding); // Y-axis
    ctx.lineTo(width - padding, height - padding); // X-axis
    ctx.stroke();
    
    // Draw throughput line (blue)
    this.drawLine(this.data.throughput, '#2196F3', padding, width, height);
    
    // Draw latency line (red)
    this.drawLine(this.data.latency, '#f44336', padding, width, height);
    
    // Update stats display
    const avgThroughput = this.calculateAverage(this.data.throughput);
    const p95Latency = this.calculatePercentile(this.data.latency, 0.95);
    
    document.getElementById('avg-throughput').textContent = `${avgThroughput.toFixed(2)} tx/s`;
    document.getElementById('p95-latency').textContent = `${p95Latency.toFixed(2)} ms`;
  }

  // Helper: Draw line chart
  drawLine(data, color, padding, width, height) {
    const ctx = this.ctx;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    const max = Math.max(...data, 1); // Avoid division by zero
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((value, index) => {
      const x = padding + (index / (this.maxDataPoints - 1)) * chartWidth;
      const y = height - padding - (value / max) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
  }

  // Helper: Calculate average
  calculateAverage(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  // Helper: Calculate percentile
  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(percentile * sorted.length) - 1;
    return sorted[index];
  }

  // Auto-refresh loop
  startAutoRefresh() {
    this.refreshTimer = setInterval(() => {
      if (!this.paused) {
        this.fetchData();
      }
    }, this.refreshInterval);
  }

  // Pause/resume functionality
  togglePause() {
    this.paused = !this.paused;
    const btn = document.getElementById('pause-btn');
    btn.textContent = this.paused ? '▶ Resume' : '⏸ Pause';
  }

  // Render error state
  renderError(message) {
    this.ctx.fillStyle = '#f44336';
    this.ctx.font = '16px Arial';
    this.ctx.fillText(`Error: ${message}`, 50, this.canvas.height / 2);
  }

  // Cleanup on destroy
  destroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }
}
```

---

## Step 4: Test with Demo Page

Open `demo.html` and add mock data for testing:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Custom Widget Demo</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    #metric-widget { border: 1px solid #ccc; padding: 20px; max-width: 900px; }
    .widget-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .widget-stats { display: flex; gap: 30px; margin-top: 15px; }
    .stat { display: flex; flex-direction: column; }
    .label { font-size: 12px; color: #666; }
    button { padding: 8px 16px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Custom Metric Widget Demo</h1>
  <div id="metric-widget"></div>

  <script type="module">
    import CustomMetricWidget from './widget.js';

    // Mock API for testing
    let mockThroughput = 10;
    let mockLatency = 50;

    // Intercept fetch to return mock data
    const originalFetch = window.fetch;
    window.fetch = async (url) => {
      if (url.includes('/api/metrics')) {
        // Simulate realistic variations
        mockThroughput = Math.max(0, mockThroughput + (Math.random() - 0.5) * 5);
        mockLatency = Math.max(0, mockLatency + (Math.random() - 0.5) * 20);
        
        return {
          ok: true,
          json: async () => ({
            throughput: mockThroughput,
            latency_p95: mockLatency
          })
        };
      }
      return originalFetch(url);
    };

    // Initialize widget
    const widget = new CustomMetricWidget({
      containerId: 'metric-widget',
      refreshInterval: 2000 // 2 seconds for demo
    });
    widget.init();
  </script>
</body>
</html>
```

**Test it:**
```bash
# Open in browser (no server needed!)
open demo.html
# Or on Windows: start demo.html
```

---

## Step 5: Integrate with Dashboard

Add your widget to `brain-dashboard.html`:

```javascript
// 1. Import widget
import CustomMetricWidget from './plugins/my-custom-widget/widget.js';

// 2. Add container to HTML
document.querySelector('.dashboard').innerHTML += `
  <div id="custom-widget-container"></div>
`;

// 3. Initialize widget
const metricsWidget = new CustomMetricWidget({
  containerId: 'custom-widget-container',
  apiUrl: 'http://localhost:3009/api/metrics',
  refreshInterval: 5000
});
metricsWidget.init();
```

---

## Step 6: Add Interactivity

Enhance your widget with click-to-drill-down:

```javascript
// In widget.js render() method
this.canvas.addEventListener('click', (event) => {
  const rect = this.canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  
  // Calculate clicked data point
  const padding = 40;
  const chartWidth = this.canvas.width - 2 * padding;
  const index = Math.floor(((x - padding) / chartWidth) * this.maxDataPoints);
  
  if (index >= 0 && index < this.data.throughput.length) {
    console.log('Clicked data point:', {
      index,
      throughput: this.data.throughput[index],
      latency: this.data.latency[index]
    });
    
    // Show tooltip or modal with details
    this.showTooltip(index, event.clientX, event.clientY);
  }
});
```

---

## Step 7: Performance Optimization

**1. Throttle redraws:**
```javascript
render() {
  if (this.renderScheduled) return;
  this.renderScheduled = true;
  
  requestAnimationFrame(() => {
    this.renderScheduled = false;
    this._actualRender(); // Move render logic here
  });
}
```

**2. Use OffscreenCanvas (for heavy rendering):**
```javascript
constructor(options) {
  this.offscreen = new OffscreenCanvas(800, 400);
  this.offscreenCtx = this.offscreen.getContext('2d');
}

render() {
  // Draw to offscreen canvas
  this.drawToOffscreen();
  
  // Transfer to visible canvas
  this.ctx.drawImage(this.offscreen, 0, 0);
}
```

**3. Debounce API calls:**
```javascript
fetchData() {
  clearTimeout(this.fetchTimeout);
  this.fetchTimeout = setTimeout(async () => {
    // Actual fetch logic
  }, 300);
}
```

---

## Step 8: Error Handling

Add comprehensive error handling:

```javascript
async fetchData() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const response = await fetch(this.apiUrl, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const metrics = await response.json();
    this.validateMetrics(metrics);
    this.updateData(metrics);
    this.render();
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('Fetch timeout');
    } else {
      console.error('Fetch error:', error);
    }
    this.renderError(error.message);
  }
}

validateMetrics(metrics) {
  if (typeof metrics.throughput !== 'number' || metrics.throughput < 0) {
    throw new Error('Invalid throughput value');
  }
  if (typeof metrics.latency_p95 !== 'number' || metrics.latency_p95 < 0) {
    throw new Error('Invalid latency value');
  }
}
```

---

## Best Practices

**1. Memory Management**
```javascript
destroy() {
  // Clear timers
  if (this.refreshTimer) clearInterval(this.refreshTimer);
  if (this.fetchTimeout) clearTimeout(this.fetchTimeout);
  
  // Remove event listeners
  this.canvas.removeEventListener('click', this.clickHandler);
  
  // Clear data
  this.data = null;
  this.ctx = null;
}
```

**2. Accessibility**
```html
<canvas id="metrics-chart" 
        width="800" 
        height="400"
        role="img"
        aria-label="Real-time throughput and latency chart">
  <!-- Fallback for screen readers -->
  <p>Chart showing throughput averaging ${avgThroughput} tx/s and latency averaging ${avgLatency} ms</p>
</canvas>
```

**3. Responsive Design**
```javascript
resizeCanvas() {
  const container = document.getElementById(this.containerId);
  const width = container.clientWidth - 40;
  this.canvas.width = width;
  this.canvas.height = width * 0.5; // Maintain 2:1 aspect ratio
  this.render();
}

init() {
  this.createDOM();
  window.addEventListener('resize', () => this.resizeCanvas());
  this.resizeCanvas();
}
```

---

## Common Issues

**Problem: Chart flickers during updates**
- **Cause**: Direct canvas manipulation
- **Solution**: Use double buffering with OffscreenCanvas

**Problem: Memory leak with long sessions**
- **Cause**: Unbounded data arrays
- **Solution**: Implement `maxDataPoints` limit

**Problem: Widget doesn't update when API is down**
- **Cause**: No fallback mechanism
- **Solution**: Cache last known good state

---

## Next Steps

✅ **Customize colors and layout** to match your dashboard theme
✅ **Add more metrics** (cache hit rate, error rate, etc.)
✅ **Implement drill-down** with modal/tooltip for detail view
✅ **Export data** as CSV or JSON for analysis
✅ **Add alerts** when metrics exceed thresholds

---

## Related Resources

- [Plugin Architecture](../Core-Concepts/Plugin-Architecture.md) — How plugins integrate with NeuroSwarm
- [API Reference](../../API/Plugin-API.md) — Complete PluginManager API docs
- [Dashboard Customization](../../Dashboard/Customization.md) — Styling and layout options
- [Visualization Plugin Starter Kit](../../../plugins/visualization-plugin/) — Full working template

---

Last updated: 2025-01-28
