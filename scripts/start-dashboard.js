#!/usr/bin/env node
// Small static file server for monitor-dashboard.html to avoid Python dependency
// Usage: node scripts/start-dashboard.js [port] [dir]

const http = require('http');
const fs = require('fs');
const path = require('path');

const port = parseInt(process.argv[2], 10) || process.env.PORT || 8000;
const root = path.resolve(process.argv[3] || process.cwd());

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html';
    case '.js': return 'application/javascript';
    case '.css': return 'text/css';
    case '.json': return 'application/json';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(root, urlPath === '/' ? '/monitor-dashboard.html' : urlPath);
  // prevent path traversal
  if (!filePath.startsWith(root)) return res.writeHead(403).end('forbidden');
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.on('listening', () => console.log(`Dashboard server serving ${root} on http://0.0.0.0:${port}`));
server.on('error', (err) => { console.error('Dashboard server error', err); process.exit(1); });
server.listen(port, '0.0.0.0');
