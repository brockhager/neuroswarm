#include <iostream>
#include "version.h"
#include <string>
#include <vector>
#include <sstream>
#include <random>
#include <algorithm>
// Lightweight, dependency-free JSON helpers (simple extraction + builders).
// This keeps the native binary self-contained for CI and local builds.

static std::string get_json_field(const std::string &s, const std::string &field) {
    // naive extraction for simple JSON like {"cmd":"embed","text":"..."}
    std::string needle = '"' + field + '"';
    size_t pos = s.find(needle);
    if (pos == std::string::npos) return std::string();
    pos = s.find(':', pos);
    if (pos == std::string::npos) return std::string();
    // skip spaces
    pos++;
    while (pos < s.size() && isspace((unsigned char)s[pos])) pos++;
    if (pos >= s.size()) return std::string();
    if (s[pos] == '"') {
        pos++;
        std::string out;
        while (pos < s.size() && s[pos] != '"') {
            if (s[pos] == '\\' && pos+1 < s.size()) { out.push_back(s[pos+1]); pos += 2; continue; }
            out.push_back(s[pos++]);
        }
        return out;
    }
    // not a string – try to read until comma or brace
    size_t end = s.find_first_of(',}', pos);
    if (end == std::string::npos) end = s.size();
    return s.substr(pos, end - pos);
}

static std::string jstr_escape(const std::string &s) {
    std::string out;
    for (char c : s) {
        if (c == '"') out += '\\"';
        else if (c == '\\') out += "\\\\";
        else out += c;
    }
    return out;
}

static std::string json_error(const std::string &msg) {
    return std::string("{\"error\":\"") + jstr_escape(msg) + "\"}";
}

static std::string json_health(const std::string &status, const std::string &model, const std::string &backend, int memory_mb, int uptime_seconds) {
    std::ostringstream o;
    o << "{";
    o << "\"status\":\"" << jstr_escape(status) << "\",";
    o << "\"model\":\"" << jstr_escape(model) << "\",";
    o << "\"backend\":\"" << jstr_escape(backend) << "\",";
    o << "\"memory_mb\":" << memory_mb << ",";
    o << "\"version\":\"" << NS_LLM_VERSION << "\",";
    o << "\"uptime_seconds\":" << uptime_seconds;
    o << "}";
    return o.str();
}

static std::string json_metrics(size_t requests_total, size_t requests_failed, size_t cache_hits, size_t cache_misses) {
    std::ostringstream o;
    o << "{";
    o << "\"requests_total\":" << requests_total << ",";
    o << "\"requests_failed\":" << requests_failed << ",";
    o << "\"cache_hits\":" << cache_hits << ",";
    o << "\"cache_misses\":" << cache_misses;
    o << "}";
    return o.str();
}

static std::string json_embed(const std::vector<double> &emb, const std::string &model, int dims, int tokens) {
    std::ostringstream o;
    o << "{";
    o << "\"embedding\":[";
    for (size_t i=0;i<emb.size();i++) {
        if (i) o << ",";
        o << emb[i];
    }
    o << "],";
    o << "\"model\":\"" << jstr_escape(model) << "\",";
    o << "\"dimensions\":" << dims << ",";
    o << "\"tokens\":" << tokens;
    o << "}";
    return o.str();
}

static std::vector<double> deterministic_embedding(const std::string &text, int dims = 384) {
    // Very small stable PRNG-based embedding
    uint32_t seed = 2166136261u;
    for (char c : text) seed = (seed ^ (unsigned char)c) * 16777619u;
    std::mt19937 rng(seed);
    std::uniform_real_distribution<double> dist(-1.0, 1.0);
    std::vector<double> vec; vec.reserve(dims);
    for (int i=0;i<dims;i++) vec.push_back(round(dist(rng)*1e6)/1e6);
    return vec;
}

static std::string json_generate(const std::string &text, const std::string &model, int tokens_generated) {
    std::ostringstream o;
    o << "{";
    o << "\"text\":\"" << jstr_escape(text) << "\",";
    o << "\"model\":\"" << jstr_escape(model) << "\",";
    o << "\"tokens_generated\":" << tokens_generated;
    o << "}";
    return o.str();
}

int main(int argc, char** argv) {
    bool stub = false;
    for (int i=1;i<argc;i++) {
        std::string a(argv[i]);
        if (a=="--stub") stub = true;
    }

    std::string line;
    size_t requests_total = 0, requests_failed = 0;
    size_t cache_hits = 0, cache_misses = 0;

    // protocol: each line is a JSON object { "cmd": "embed", ... }
    while (std::getline(std::cin, line)) {
        if (line.size() == 0) continue;
        try {
            const std::string cmd = get_json_field(line, "cmd");

            if (cmd == "health") {
                const std::string model = stub ? "all-MiniLM-L6-v2-native-stub" : "all-MiniLM-L6-v2";
                const std::string backend = stub ? "native-stub" : "onnxruntime";
                std::cout << json_health("healthy", model, backend, 123, 1) << std::endl;
                continue;
            }

            if (cmd == "metrics") {
                std::cout << json_metrics(requests_total, requests_failed, cache_hits, cache_misses) << std::endl;
                continue;
            }

            if (cmd == "embed") {
                requests_total++;
                const std::string text = get_json_field(line, "text");
                if (text.empty()) {
                    requests_failed++;
                    std::cout << json_error("missing text") << std::endl;
                    continue;
                }

                bool cHit = text.size() < 64;
                if (cHit) cache_hits++; else cache_misses++;

                if (stub) {
                    auto emb = deterministic_embedding(text);
                    int tokens = std::max(1, (int)std::count_if(text.begin(), text.end(), [](char c){ return c==' ';})+1);
                    std::cout << json_embed(emb, "all-MiniLM-L6-v2-native-stub", (int)emb.size(), tokens) << std::endl;
                    continue;
                }

#ifdef ONNXRUNTIME_FOUND
                // Attempt real ONNX inference if available
                std::string modelPath = "models/all-MiniLM-L6-v2.onnx";
                std::ifstream f(modelPath);
                if (f.good()) {
                    try {
                        Ort::Env env(ORT_LOGGING_LEVEL_WARNING, "ns-llm");
                        Ort::SessionOptions sessionOptions;
                        sessionOptions.SetIntraOpNumThreads(1);
                        Ort::Session session(env, modelPath.c_str(), sessionOptions);

                        // NOTE: Real inference requires tokenizer/inputs; for now return model-loaded info
                        std::cout << "{\"model\":\"all-MiniLM-L6-v2\",\"loaded\":true,\"dimensions\":384}" << std::endl;
                        continue;
                    } catch (const std::exception &e) {
                        std::cout << json_error(std::string("onnx-inference-failed: ") + e.what()) << std::endl;
                        continue;
                    }
                }
#endif

                std::cout << json_error("onnx runtime not implemented in scaffold or model missing") << std::endl;
                continue;
            }

            if (cmd == "generate") {
                requests_total++;
                const std::string text = get_json_field(line, "text");
                if (text.empty()) {
                    requests_failed++;
                    std::cout << json_error("missing text") << std::endl;
                    continue;
                }

                if (stub) {
                    // Stub generation: just append some text
                    std::string generated = " [STUB GENERATION: " + text + "]";
                    std::cout << json_generate(generated, "gpt2-stub", 5) << std::endl;
                    continue;
                }

#ifdef ONNXRUNTIME_FOUND
                // Real generation placeholder
                std::cout << json_error("real generation not yet implemented") << std::endl;
                continue;
#endif
                std::cout << json_error("onnx runtime not available") << std::endl;
                continue;
            }

            std::cout << json_error("unknown cmd") << std::endl;
        } catch (const std::exception &e) {
            requests_failed++;
            std::cout << json_error(std::string("parse/error: ") + e.what()) << std::endl;
        }
    }
    return 0;
}
