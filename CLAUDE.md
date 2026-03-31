# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CODAP plugins for exploring language model probability distributions in educational contexts. Default inference backend is Ollama API (remote server, `gemma2:9b`); Transformers.js (in-browser) available as fallback. Integrates with CODAP (Common Online Data Analysis Platform).

**Two main plugins:**
- `statistical-madlibs-codap-v05.html` - Mad libs game with slot-based probability exploration and variability tracking
- `token-prob-codap-v9.html` - Real-time token probability distribution viewer

## Running Locally

No build system. Serve via HTTP for HTTPS resources:
```bash
python3 -m http.server 8000
# Visit http://localhost:8000/statistical-madlibs-codap-v05.html
```

Or open HTML files directly in browser for standalone mode.

## Architecture

### Single-File HTML Pattern
Each plugin is self-contained (2000+ lines) with embedded JavaScript and CSS. No build step required. Dependencies loaded from CDN:
- Transformers.js: `@huggingface/transformers@3.5.1` (fallback backend only)
- iframe-phone for CODAP communication

### LLM Pipeline Flow
```
Ollama:       User Input → API call (logprobs) → Greedy Completion → Dedup/Merge → CODAP Output
Transformers: User Input → Tokenization → Model Logits → Top-K Filtering → Greedy Completion → CODAP Output
```

### Key Functions (statistical-madlibs)
- `getWordCandidates(context, k, slotIndex)` - Main inference pipeline (dispatches to Ollama or Transformers.js)
- `ollamaQuery(messages, options)` - Ollama `/v1/chat/completions` API wrapper
- `ollamaGetWordCandidates(k, slotIndex)` - Full Ollama pipeline: logprobs → greedy complete → dedup
- `ollamaGreedyCompleteToWord(messages, token)` - Complete subword tokens via API
- `buildOllamaMessages(slotIndex)` - Build system+user messages for Ollama API
- `greedyCompleteToWord(prompt, tokenId, prob)` - Complete subword token to full word boundary (Transformers.js)
- `softmaxWithTemperature(logits, temp)` - Temperature-scaled probabilities
- `sampleFromTopK(candidates, temp)` - Categorical sampling from top-K
- `sendCompletedSentenceToCODAP()` - CODAP data transmission
- `buildDifferentnessFormulas(candidates)` - Generate CODAP formulas for variability tracking (running % per word + differentness)
- `sanitizeAttrName(word)` - Clean word for use as CODAP attribute name
- `createDifferentnessTracker(slot, candidates)` - Create variability table in CODAP
- `addToDifferentnessTracker(slot, word)` - Record samples for differentness calculation

### CODAP Integration
Uses iframe-phone RPC for bidirectional communication. Creates three data contexts:
1. **Probability distributions** - Query ID, Rank, Word, Probability per slot
2. **Completed sentences** - Run ID, template, filled slots, path scores
3. **Variability tracker** - Per-slot table with running percentage columns for each candidate word (e.g., "% Nile", "% Amazon") plus "Differentness" column. Students compare empirical percentages to theoretical probabilities, observing convergence via law of large numbers

### Global State (statistical-madlibs)
- `inferenceBackendMode` - `'ollama'` (default) or `'transformers'`
- `ollamaConfig` - `{ baseUrl, apiKey, model }` for Ollama API connection
- `slots[]` - Parsed template slots with candidates, probabilities, `diffContextName`, `diffSampleCount`
- `activeSlotIndex` - Currently selected slot
- `temperature`, `topK` - Sampling parameters
- `runCounter`, `queryCounter`, `diffSampleCounter` - CODAP ID generation

## Models

Default inference backend is Ollama API (`gemma2:9b`). Transformers.js (`onnx-community/Qwen2.5-0.5B-Instruct`) available as fallback.
- Token Prob: `HuggingFaceTB/SmolLM2-135M-Instruct`

## Version Files

Latest versions are highest numbered. Previous versions kept for reference:
- `statistical-madlibs-codap-v05.html` (current) - Ollama API backend, Transformers.js fallback
- `statistical-madlibs-codap-v04.html` - adds variability tracking
- `token-prob-codap-v9.html` (current)

## Build Tags

**IMPORTANT:** When making changes to plugin files, update the build tag in the header.

Format: `vXX-YYYYMMDDx` where:
- `XX` = major version (e.g., 04)
- `YYYYMMDD` = date (e.g., 20260131)
- `x` = letter suffix for multiple changes per day (a, b, c...)

Location in statistical-madlibs: Look for the `<h1>` tag with "Statistical Mad Libs" and update the version span.

Example: `v04-20260131a` → `v04-20260131b` (next change same day) → `v04-20260201a` (next day)
