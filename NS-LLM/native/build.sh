#!/usr/bin/env bash
set -euo pipefail

mkdir -p build
cd build
cmake .. -DPROTOTYPE_ONLY=ON
cmake --build . --config Release

echo "Built ns-llm-native in build/ (prototype-only mode). To run: ./ns-llm-native --stub"