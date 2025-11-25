import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3009;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  console.log('Health endpoint called');
  res.json({
    status: 'ok',
    version: 'test-0.1.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server listening on port ${PORT}`);
  console.log(`Server address:`, JSON.stringify(server.address()));
});

// Test the endpoint internally
setTimeout(async () => {
  try {
    console.log('Testing health endpoint internally...');
    const response = await fetch(`http://localhost:${PORT}/health`);
    const data = await response.json();
    console.log('Internal test successful:', data.status);
  } catch (error) {
    console.log('Internal test failed:', error.message);
  }
}, 1000);

// Keep the process alive
setInterval(() => {
  console.log(`Server still running... uptime: ${process.uptime().toFixed(1)}s`);
}, 5000);