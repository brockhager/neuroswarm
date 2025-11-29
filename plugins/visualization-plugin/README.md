# NeuroSwarm Visualization Plugin Starter Kit

**Build custom dashboard widgets** for the NeuroSwarm ecosystem.

This starter template provides everything you need to create interactive, real-time visualizations that integrate seamlessly with the NeuroSwarm dashboard.

---

## 🎯 What is a Visualization Plugin?

Visualization plugins are **dashboard widgets** that display NeuroSwarm metrics, plugin outputs, and custom data in real-time. They enable:

- **Real-time monitoring** (performance metrics, throughput)
- **Plugin visualization** (validator results, scoring trends)
- **Custom dashboards** (domain-specific KPIs)
- **Interactive charts** (time series, distributions, comparisons)

### Use Cases

✅ **Performance Monitoring**: Display latency, throughput, error rates  
✅ **Plugin Metrics**: Visualize validator success rates, execution times  
✅ **Governance Dashboards**: Show voting activity, proposal status  
✅ **Custom Analytics**: Domain-specific visualizations  
✅ **Real-Time Feeds**: Live transaction streams, block production  

---

## 🚀 Quick Start

### 1. Test Locally (No Backend Required)

Open `demo.html` in your browser:

```bash
cd examples/visualization-plugin
open demo.html  # macOS
start demo.html  # Windows
xdg-open demo.html  # Linux
```

The demo runs with **mock data** — no NS-node required!

### 2. Connect to Real API

Start NeuroSwarm nodes:

```bash
cd neuroswarm
.\onboarding\onboard.ps1 -Detach
```

Reload `demo.html` — widget will automatically connect to `http://localhost:3009`

### 3. Customize the Widget

Edit `widget.js` to implement your visualization:

```javascript
async _fetchData() {
  // Fetch your custom data
  const response = await fetch(`${this.apiEndpoint}/api/custom-metrics`);
  return await response.json();
}

_updateStats(data) {
  // Display your metrics
  statsContainer.innerHTML = `
    <div class="stat-item">
      <div class="stat-label">My Metric</div>
      <div class="stat-value">${data.myMetric}</div>
    </div>
  `;
}
```

### 4. Integrate with Dashboard

Add to `brain-dashboard.html`:

```html
<script src="../examples/visualization-plugin/widget.js"></script>
<script>
  const myWidget = new CustomVisualization({
    name: 'my-custom-widget',
    refreshInterval: 5000,
    apiEndpoint: 'http://localhost:3009'
  });
  
  const container = document.getElementById('my-widget-container');
  myWidget.render(container);
</script>
```

---

## 📚 API Reference

### Constructor

```javascript
constructor(config = {})
```

**Parameters**:
- `config.name` (string): Widget name (default: 'custom-widget')
- `config.version` (string): Widget version (default: '1.0.0')
- `config.refreshInterval` (number): Auto-refresh interval in ms (default: 5000)
- `config.apiEndpoint` (string): API base URL (default: 'http://localhost:3009')

### render(container)

Render widget into DOM container.

**Parameters**:
- `container` (HTMLElement): DOM element to render into

**Example**:
```javascript
const container = document.getElementById('widget-container');
await widget.render(container);
```

### refresh()

Manually refresh widget data.

**Example**:
```javascript
widget.refresh(); // Update now
```

### startAutoRefresh() / stopAutoRefresh()

Control automatic refresh timer.

**Example**:
```javascript
widget.startAutoRefresh();  // Start polling
widget.stopAutoRefresh();   // Stop polling
```

### destroy()

Clean up resources when widget is removed.

**Example**:
```javascript
widget.destroy(); // Remove event listeners, stop timers
```

### getMetadata()

Get widget metadata for registration.

**Returns**: `Object`
```javascript
{
  name: string,
  version: string,
  type: 'visualization',
  description: string,
  author: string,
  refreshInterval: number,
  apiEndpoint: string
}
```

---

## 🎨 Customization Examples

### Example 1: Simple Counter Widget

```javascript
class CounterWidget extends CustomVisualization {
  async _fetchData() {
    const response = await fetch(`${this.apiEndpoint}/v1/mempool`);
    const data = await response.json();
    return { count: data.mempool?.length || 0 };
  }

  _updateStats(data) {
    this.container.querySelector('.widget-content').innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <h2>Mempool Transactions</h2>
        <div style="font-size: 4em; font-weight: bold; color: #667eea;">
          ${data.count}
        </div>
      </div>
    `;
  }
}
```

### Example 2: Bar Chart Widget

```javascript
_updateChart() {
  const canvas = document.getElementById(`${this.name}-chart`);
  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = canvas.offsetHeight;

  ctx.clearRect(0, 0, width, height);

  const values = [10, 25, 15, 30, 20]; // Your data
  const maxValue = Math.max(...values);
  const barWidth = width / values.length;

  values.forEach((value, i) => {
    const barHeight = (value / maxValue) * (height - 40);
    const x = i * barWidth;
    const y = height - barHeight - 20;

    ctx.fillStyle = '#667eea';
    ctx.fillRect(x + 5, y, barWidth - 10, barHeight);

    // Label
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(value, x + barWidth / 2, y - 5);
  });
}
```

### Example 3: Real-Time Feed Widget

```javascript
class TransactionFeed extends CustomVisualization {
  constructor(config) {
    super(config);
    this.transactions = [];
  }

  async _fetchData() {
    const response = await fetch(`${this.apiEndpoint}/v1/mempool`);
    const data = await response.json();
    return data.mempool || [];
  }

  _updateStats(data) {
    this.transactions = data.slice(0, 10);
    
    const html = this.transactions.map(tx => `
      <div class="tx-item">
        <span class="tx-type">${tx.type}</span>
        <span class="tx-time">${new Date(tx.timestamp).toLocaleTimeString()}</span>
      </div>
    `).join('');

    this.container.querySelector('.widget-content').innerHTML = html;
  }
}
```

---

## 🧪 Testing Guide

### Unit Testing

Test widget methods independently:

```javascript
// test.js
import CustomVisualization from './widget.js';

const widget = new CustomVisualization({ name: 'test' });

// Test metadata
const metadata = widget.getMetadata();
console.assert(metadata.type === 'visualization', 'Type should be visualization');

// Test data transformation
const mockData = { value: 42 };
// Add your test assertions here

console.log('✅ All tests passed');
```

### Integration Testing

Test with real dashboard:

1. Add widget to `brain-dashboard.html`
2. Start NeuroSwarm nodes
3. Open dashboard in browser
4. Verify widget loads and refreshes
5. Check browser console for errors

### Visual Testing

```bash
# Start simple HTTP server
python -m http.server 8000

# Open test page
open http://localhost:8000/demo.html
```

Verify:
- ✅ Widget renders correctly
- ✅ Data updates automatically
- ✅ Charts display properly
- ✅ Responsive layout works
- ✅ Error states handled gracefully

---

## 📊 Performance Best Practices

### Optimization Tips

1. **Efficient Rendering**
   ```javascript
   // Bad: Re-render entire widget
   container.innerHTML = largeHTML;

   // Good: Update specific elements
   document.getElementById('value').textContent = newValue;
   ```

2. **Data Sampling**
   ```javascript
   // Keep only recent data points
   if (this.data.length > 100) {
     this.data = this.data.slice(-50);
   }
   ```

3. **Debounced Updates**
   ```javascript
   // Avoid excessive redraws
   if (this._updateTimeout) clearTimeout(this._updateTimeout);
   this._updateTimeout = setTimeout(() => this._redraw(), 100);
   ```

4. **Canvas Optimization**
   ```javascript
   // Use requestAnimationFrame for smooth animations
   requestAnimationFrame(() => this._updateChart());
   ```

### Memory Management

```javascript
destroy() {
  // Clean up event listeners
  if (this.resizeListener) {
    window.removeEventListener('resize', this.resizeListener);
  }

  // Stop timers
  this.stopAutoRefresh();

  // Clear data
  this.data = [];

  // Remove DOM elements
  if (this.container) {
    this.container.innerHTML = '';
  }
}
```

---

## 🎨 Styling Guidelines

### CSS Best Practices

1. **Scoped Styles**: Prefix all classes with widget name
   ```css
   .my-widget-card { }
   .my-widget-header { }
   ```

2. **Responsive Design**: Use flex/grid layouts
   ```css
   .widget-stats {
     display: grid;
     grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
   }
   ```

3. **Dark Mode Support** (optional)
   ```css
   @media (prefers-color-scheme: dark) {
     .widget-card {
       background: #1f2937;
       color: white;
     }
   }
   ```

### Accessibility

- Use semantic HTML elements
- Add ARIA labels for screen readers
- Ensure sufficient color contrast (WCAG AA)
- Support keyboard navigation

```html
<button aria-label="Refresh widget" onclick="refresh()">🔄</button>
```

---

## 🔗 Integration Examples

### Load from CDN

```html
<script src="https://cdn.example.com/custom-widget.js"></script>
```

### Load as ES Module

```javascript
import CustomVisualization from './widget.js';
```

### Dynamic Loading

```javascript
async function loadWidget(url) {
  const script = document.createElement('script');
  script.src = url;
  script.type = 'module';
  
  return new Promise((resolve, reject) => {
    script.onload = () => resolve(window.CustomVisualization);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const Widget = await loadWidget('/plugins/my-widget.js');
const widget = new Widget();
```

---

## 📚 Further Reading

- **[Create Visualization Tutorial](../../wiki/Learning-Hub/Tutorials/Create-Visualization.md)** — Step-by-step guide
- **[Dashboard Architecture](../../wiki/Technical/Dashboard.md)** — How dashboards work
- **[Chart.js Integration](https://www.chartjs.org/)** — Advanced charting library
- **[D3.js Examples](https://d3js.org/)** — Complex visualizations

---

## 🤝 Contributing

**Share your widget!** Submit a PR to add it to the community gallery.

**Need help?** Ask in [Discord #visualizations](../../README.md#community)

---

## 📄 License

MIT License — See [LICENSE](../../LICENSE) for details

**Last Updated**: 2025-11-28  
**Maintainers**: NeuroSwarm Plugin Team
