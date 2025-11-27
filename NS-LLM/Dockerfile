# Multi-stage build for NS-LLM C++ backend
FROM ubuntu:22.04 AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    wget \
    python3 \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies for model export
RUN pip3 install --no-cache-dir \
    optimum[exporters] \
    onnxruntime \
    transformers \
    torch

# Set working directory
WORKDIR /build

# Copy source code
COPY NS-LLM/native ./native
COPY NS-LLM/model-pipeline ./model-pipeline

# Download ONNX Runtime
ARG ONNXRUNTIME_VERSION=1.15.1
RUN wget https://github.com/microsoft/onnxruntime/releases/download/v${ONNXRUNTIME_VERSION}/onnxruntime-linux-x64-${ONNXRUNTIME_VERSION}.tgz \
    && tar -xzf onnxruntime-linux-x64-${ONNXRUNTIME_VERSION}.tgz \
    && mv onnxruntime-linux-x64-${ONNXRUNTIME_VERSION} /opt/onnxruntime

# Build NS-LLM native binary
WORKDIR /build/native
RUN mkdir -p build && cd build \
    && cmake .. -DONNXRUNTIME_DIR=/opt/onnxruntime \
    && make -j$(nproc)

# Export default model (GPT-2)
WORKDIR /build/model-pipeline
RUN python3 export_generative.py --model gpt2 --out /models --quantize

# Runtime stage
FROM ubuntu:22.04

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy ONNX Runtime libraries
COPY --from=builder /opt/onnxruntime/lib /usr/local/lib

# Copy built binary
COPY --from=builder /build/native/build/ns-llm-native /usr/local/bin/

# Copy models
COPY --from=builder /models /app/models

# Set library path
ENV LD_LIBRARY_PATH=/usr/local/lib:$LD_LIBRARY_PATH

WORKDIR /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD echo '{"cmd":"health"}' | /usr/local/bin/ns-llm-native || exit 1

# Expose port
EXPOSE 8080

# Run NS-LLM backend
CMD ["/usr/local/bin/ns-llm-native"]
