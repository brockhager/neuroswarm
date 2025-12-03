# NS-LLM Deployment Guide

Complete guide for deploying NS-LLM in production using Docker.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Manual Setup](#manual-setup)
4. [Environment Configuration](#environment-configuration)
5. [Model Management](#model-management)
6. [Production Configuration](#production-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Docker**: 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose**: 2.0+ (included with Docker Desktop)
- **Git**: For cloning the repository
- **8GB RAM minimum** (16GB recommended for larger models)
- **10GB disk space** (more for additional models)

### Optional

- **NVIDIA GPU** with CUDA support (for GPU acceleration)
- **HuggingFace Account** (for Llama-2 and other supported models)

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/neuroswarm.git
cd neuroswarm
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit configuration (optional)
nano .env
```

### 3. Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 4. Access Web Interface

Open browser to: **http://localhost:3010**

**Default Ports:**
- Web Interface: `3010`
- NS Node API: `3009`
- NS-LLM Backend: `8080`

### 5. Verify Deployment

```bash
# Check health
curl http://localhost:3009/health

# Test generation
curl -X POST http://localhost:3009/api/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "maxTokens": 20}'
```

---

## Manual Setup

### Without Docker

#### 1. NS-LLM Backend (C++)

```bash
cd NS-LLM

# Install dependencies (Ubuntu)
sudo apt-get install build-essential cmake wget python3 python3-pip

# Install Python packages
pip3 install optimum[exporters] onnxruntime transformers

# Download ONNX Runtime
wget https://github.com/microsoft/onnxruntime/releases/download/v1.15.1/onnxruntime-linux-x64-1.15.1.tgz
tar -xzf onnxruntime-linux-x64-1.15.1.tgz
export ONNXRUNTIME_DIR=$(pwd)/onnxruntime-linux-x64-1.15.1

# Export model
cd model-pipeline
python3 export_generative.py --model gpt2 --out ../models

# Build native binary
cd ../native
mkdir build && cd build
cmake .. -DONNXRUNTIME_DIR=$ONNXRUNTIME_DIR
make -j$(nproc)

# Run backend
./ns-llm-native
```

#### 2. NS Node (Node.js)

```bash
cd ns-node

# Install dependencies
npm install

# Start server
PORT=3009 node server.js
```

#### 3. NS Web (React)

```bash
cd ns-web

# Install dependencies
npm install

# Build for production
npm run build

# Serve with any static server
npx serve -s dist -p 3010
```

---

## Environment Configuration

### `.env` File

```bash
# NS Node Configuration
PORT=3009
NODE_ENV=production

# NS-LLM Backend
NS_LLM_URL=http://localhost:8080
MODEL_PATH=./NS-LLM/models

# Model Configuration
DEFAULT_MODEL=gpt2
MAX_TOKENS=200

# Governance Configuration
GOVERNANCE_MIN_TOKENS=5
GOVERNANCE_MAX_TOKENS=500
GOVERNANCE_MIN_COHERENCE=0.3
GOVERNANCE_STRICT_MODE=false

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000

# Logging
LOG_LEVEL=info

# CORS
CORS_ORIGINS=http://localhost:3010,http://localhost:3000

# HuggingFace Token (for Llama-2 and other supported models)
# HF_TOKEN=your_token_here
```

### Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3009 | NS Node server port |
| `NODE_ENV` | development | Environment mode |
| `NS_LLM_URL` | http://localhost:8080 | NS-LLM backend URL |
| `MODEL_PATH` | ./NS-LLM/models | Model directory |
| `DEFAULT_MODEL` | gpt2 | Default model to load |
| `MAX_TOKENS` | 200 | Max generation tokens |
| `GOVERNANCE_MIN_TOKENS` | 5 | Min response length |
| `GOVERNANCE_MAX_TOKENS` | 500 | Max response length |
| `GOVERNANCE_MIN_COHERENCE` | 0.3 | Min coherence score |
| `GOVERNANCE_STRICT_MODE` | false | Reject vs warn |
| `CIRCUIT_BREAKER_THRESHOLD` | 5 | Failures before open |
| `CIRCUIT_BREAKER_TIMEOUT` | 60000 | Recovery timeout (ms) |
| `LOG_LEVEL` | info | Logging verbosity |
| `CORS_ORIGINS` | * | Allowed CORS origins |
| `HF_TOKEN` | - | HuggingFace API token |

---

## Model Management

### Available Models

| Model | Size | Context | Memory | Use Case |
|-------|------|---------|--------|----------|
| GPT-2 | 124M | 1024 | ~500MB | Testing, development |
| TinyLlama | 1.1B | 2048 | ~1.5GB | Production, low-resource |
| Llama-2-7B | 7B | 4096 | ~4GB | High quality |
| Mistral-7B | REMOVED_BY_POLICY | n/a | n/a | Removed from repo

### Export Additional Models

```bash
cd NS-LLM/model-pipeline

# List available models
python3 export_large_models.py --list

# Export TinyLlama
python3 export_large_models.py --model tinyllama --out ../models

# Export Llama-2-7B (requires HF token)
export HF_TOKEN=your_token_here
python3 export_large_models.py --model llama2-7b --out ../models

# Export without quantization
python3 export_large_models.py --model gpt2 --no-quantize
```

### Switch Models at Runtime

**Via API:**
```bash
curl -X POST http://localhost:3009/api/models/switch \
  -H "Content-Type: application/json" \
  -d '{"model": "tinyllama"}'
```

**Via Web Interface:**
Navigate to Models tab → Select model → Click "Switch"

---

## Production Configuration

### Docker Compose Production

```yaml
version: '3.8'

services:
  ns-llm:
    build: ./NS-LLM
    restart: always
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
    volumes:
      - ./NS-LLM/models:/app/models:ro
    environment:
      - MODEL_PATH=/app/models

  ns-node:
    build: ./ns-node
    restart: always
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=warn

  ns-web:
    build: ./ns-web
    restart: always
    ports:
      - "80:3010"  # Expose on port 80
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Web interface
    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3009;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Security Best Practices

1. **Enable HTTPS** with Let's Encrypt or similar
2. **Set CORS origins** to specific domains
3. **Add rate limiting** to prevent abuse
4. **Use environment variables** for secrets
5. **Enable authentication** for production APIs
6. **Regular security updates** for dependencies

---

## Monitoring & Logging

### Health Checks

```bash
# Overall health
curl http://localhost:3009/health

# NS-LLM backend
curl http://localhost:8080/health

# Governance metrics
curl http://localhost:3009/api/metrics

# Model status
curl http://localhost:3009/api/models/current
```

### Prometheus Metrics

Add to `docker-compose.yml`:

```yaml
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
```

### Centralized Logging

```yaml
services:
  loki:
    image: grafana/loki
    ports:
      - "3100:3100"
    volumes:
      - loki_data:/loki

  promtail:
    image: grafana/promtail
    volumes:
      - /var/log:/var/log
      - ./promtail-config.yml:/etc/promtail/config.yml
```

### Docker Logs

```bash
# View all logs
docker-compose logs -f

# Specific service
docker-compose logs -f ns-node

# Last 100 lines
docker-compose logs --tail=100 ns-llm

# Since timestamp
docker-compose logs --since 2024-01-01T00:00:00
```

---

## Troubleshooting

### Common Issues

#### 1. Backend Not Starting

**Symptom:** `ns-llm-unavailable` errors

**Solutions:**
```bash
# Check backend logs
docker-compose logs ns-llm

# Verify model files exist
ls -lh NS-LLM/models/

# Check ONNX Runtime
docker-compose exec ns-llm ldd /usr/local/bin/ns-llm-native

# Restart backend
docker-compose restart ns-llm
```

#### 2. High Memory Usage

**Symptom:** Container OOM killed

**Solutions:**
```bash
# Check memory usage
docker stats

# Use smaller model
# Edit .env: DEFAULT_MODEL=gpt2

# Increase Docker memory limit
# Docker Desktop → Settings → Resources → Memory

# Enable quantization
python3 export_large_models.py --model tinyllama --quantize
```

#### 3. Slow Response Times

**Symptom:** High latency (>5s)

**Solutions:**
```bash
# Check CPU usage
docker stats

# Reduce max tokens
# Edit .env: MAX_TOKENS=50

# Switch to smaller model
curl -X POST http://localhost:3009/api/models/switch \
  -d '{"model": "gpt2"}'

# Enable caching
# Add Redis for response caching
```

#### 4. Port Conflicts

**Symptom:** `Address already in use`

**Solutions:**
```bash
# Find process using port
lsof -i :3009
netstat -ano | findstr :3009  # Windows

# Kill process
kill -9 <PID>

# Change port in .env
PORT=3010
```

#### 5. Model Not Found

**Symptom:** `Model not found: tinyllama`

**Solutions:**
```bash
# List available models
curl http://localhost:3009/api/models

# Export model
cd NS-LLM/model-pipeline
python3 export_large_models.py --model tinyllama

# Restart services
docker-compose restart
```

### Debug Mode

Enable verbose logging:

```bash
# Edit .env
LOG_LEVEL=debug

# Restart
docker-compose restart ns-node

# View logs
docker-compose logs -f ns-node
```

### Performance Profiling

```bash
# Node.js profiling
docker-compose exec ns-node node --prof server.js

# Memory snapshot
docker-compose exec ns-node node --inspect server.js

# CPU profiling
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

---

## Backup & Recovery

### Backup Models

```bash
# Backup models directory
tar -czf models-backup-$(date +%Y%m%d).tar.gz NS-LLM/models/

# Upload to cloud storage
aws s3 cp models-backup-*.tar.gz s3://your-bucket/backups/
```

### Backup Configuration

```bash
# Backup environment and compose files
tar -czf config-backup-$(date +%Y%m%d).tar.gz .env docker-compose.yml

# Version control
git add .env.example docker-compose.yml
git commit -m "Update production config"
```

### Restore

```bash
# Stop services
docker-compose down

# Restore models
tar -xzf models-backup-20240101.tar.gz

# Restore config
tar -xzf config-backup-20240101.tar.gz

# Restart
docker-compose up -d
```

---

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.yml
services:
  ns-node:
    deploy:
      replicas: 3
    
  nginx:
    image: nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
```

### Load Balancer Config

```nginx
upstream ns_node {
    least_conn;
    server ns-node-1:3009;
    server ns-node-2:3009;
    server ns-node-3:3009;
}

server {
    listen 80;
    location / {
        proxy_pass http://ns_node;
    }
}
```

---

## Support

- **Documentation**: [wiki/NS-LLM/](../wiki/NS-LLM/)
- **Issues**: [GitHub Issues](https://github.com/your-org/neuroswarm/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/neuroswarm/discussions)
