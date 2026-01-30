# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CODAP plugins for exploring language model probability distributions in educational contexts. Uses Transformers.js for browser-based LLM inference with integration into CODAP (Common Online Data Analysis Platform).

**Two main plugins:**
- `statistical-madlibs-codap-v03.html` - Mad libs game with slot-based probability exploration
- `token-prob-codap-v9.html` - Real-time token probability distribution viewer

## Running Locally

No build system. Serve via HTTP for HTTPS resources:
```bash
python3 -m http.server 8000
# Visit http://localhost:8000/statistical-madlibs-codap-v03.html
```

Or open HTML files directly in browser for standalone mode.

## Architecture

### Single-File HTML Pattern
Each plugin is self-contained (2000+ lines) with embedded JavaScript and CSS. No build step required. Dependencies loaded from CDN:
- Transformers.js: `@huggingface/transformers@3.0.2`
- iframe-phone for CODAP communication

### LLM Pipeline Flow
```
User Input → Tokenization → Model Logits → Top-K Filtering → Temperature Sampling → CODAP Output
```

### Key Functions (statistical-madlibs)
- `getWordCandidates(promptText, k, slotIndex)` - Main inference pipeline
- `softmaxWithTemperature(logits, temp)` - Temperature-scaled probabilities
- `sampleFromTopK(candidates, temp)` - Categorical sampling from top-K
- `greedyCompleteToWord()` - Generate tokens until word boundary
- `sendToCODAP()` / `sendCompletedSentenceToCODAP()` - CODAP data transmission

### CODAP Integration
Uses iframe-phone RPC for bidirectional communication. Creates two data contexts:
1. **Probability distributions** - Query ID, Rank, Word, Probability per slot
2. **Completed sentences** - Run ID, template, filled slots, path scores

### Global State (statistical-madlibs)
- `slots[]` - Parsed template slots with candidates and probabilities
- `activeSlotIndex` - Currently selected slot
- `temperature`, `topK` - Sampling parameters
- `runCounter`, `queryCounter` - CODAP ID generation

## Models

Hardcoded model IDs (change in source if needed):
- Mad Libs: `onnx-community/Qwen2.5-0.5B-Instruct`
- Token Prob: `HuggingFaceTB/SmolLM2-135M-Instruct`

## Version Files

Latest versions are highest numbered. Previous versions kept for reference:
- `statistical-madlibs-codap-v03.html` (current)
- `token-prob-codap-v9.html` (current)
