# 👩‍💻 Developer Guide

This guide is for developers who want to build NeuroSwarm from source or contribute to the project.

## Build from Source

### Prerequisites
- Node.js v18+
- Git

### Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/brockhager/neuro-infra.git
   cd neuro-infra/neuroswarm
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the Node**
   ```bash
   npm start
   ```

### Building Binaries
To create standalone executables for Windows, Linux, and macOS:

```bash
npm run build:bin
```

The binaries will be output to `../neuroswarm/dist/`.
You can then upload these files to your server.

## Architecture
See the [System Overview](System-Overview/README.md) for details on the architecture.
