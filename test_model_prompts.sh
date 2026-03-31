#!/bin/bash
# Test LLM models on the Ollama server with the same prompt format
# used by the statistical-madlibs CODAP plugin.
#
# Usage:
#   ./test_model_prompts.sh                          # test all models, all prompts
#   ./test_model_prompts.sh llama3.2:3b              # test one model, all prompts
#   ./test_model_prompts.sh llama3.2:3b "meows"      # test one model, one prompt

set -euo pipefail

# Load API key
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
if [[ -f "$ENV_FILE" ]]; then
    export $(grep OLLAMA_API_KEY "$ENV_FILE" | tr -d "'")
fi

if [[ -z "${OLLAMA_API_KEY:-}" ]]; then
    echo "Error: OLLAMA_API_KEY not set. Create a .env file or export it." >&2
    exit 1
fi

BASE_URL="https://apollo.quocanmeomeo.io.vn"

# ── Test prompts ──────────────────────────────────────────────
# Each prompt mimics what the plugin sends:
#   system: "Complete the following text naturally with a single word. Only output the completion word, nothing else."
#   user:   "<prefix>\n\n<context>"
# The plugin's default prefix is "Fill in [SLOT] with one word."

declare -A PROMPTS
PROMPTS[meows]="Fill in [Animal] with one word.\n\nWhat kind of animal meows? A"
PROMPTS[river]="Fill in [River] with one word.\n\nThe longest river in the world is the"
PROMPTS[dessert]="Fill in [Dessert] with one word.\n\nWhat is the tastiest dessert?"
PROMPTS[color]="Fill in [Color] with one word.\n\nThe sky on a clear day is"

SYSTEM_PROMPT="Complete the following text naturally with a single word. Only output the completion word, nothing else."

# ── Helpers ───────────────────────────────────────────────────

test_model() {
    local model=$1
    local label=$2
    local user_prompt=$3

    printf "%-18s %-10s " "$model" "$label"

    local start_ms=$(($(date +%s%N) / 1000000))

    local result
    result=$(curl -s -X POST "$BASE_URL/v1/chat/completions" \
      -H "Authorization: Bearer $OLLAMA_API_KEY" \
      -H "Content-Type: application/json" \
      --max-time 120 \
      -d "$(python3 -c "
import json
print(json.dumps({
    'model': '$model',
    'messages': [
        {'role': 'system', 'content': '''$SYSTEM_PROMPT'''},
        {'role': 'user',   'content': '$user_prompt'}
    ],
    'logprobs': True,
    'top_logprobs': 10,
    'max_tokens': 3,
    'temperature': 1.0,
    'stream': False
}))
")" 2>&1)

    local end_ms=$(($(date +%s%N) / 1000000))
    local elapsed=$(( end_ms - start_ms ))

    echo "$result" | python3 -c "
import json, sys, math

try:
    d = json.load(sys.stdin)
except Exception as e:
    print(f'ERROR: {e}')
    sys.exit(0)

if 'error' in d:
    print(f'ERROR: {d[\"error\"][\"message\"]}')
    sys.exit(0)

choice = d['choices'][0]
content = choice['message']['content'].strip().replace(chr(10), ' ')
print(f'{content:15s} ({${elapsed}}ms)')

if choice.get('logprobs') and choice['logprobs'].get('content'):
    for tok_info in choice['logprobs']['content'][:1]:
        for alt in tok_info['top_logprobs']:
            prob = math.exp(alt['logprob']) * 100
            token_repr = repr(alt['token'])
            print(f'  {token_repr:25s} {prob:6.2f}%')
else:
    print('  (no logprobs returned)')
print()
" 2>&1
}

list_models() {
    curl -s "$BASE_URL/api/tags" \
      -H "Authorization: Bearer $OLLAMA_API_KEY" \
    | python3 -c "
import json, sys
d = json.load(sys.stdin)
for m in d['models']:
    size_gb = m['size'] / 1e9
    details = m.get('details', {})
    quant = details.get('quantization_level', '?')
    params = details.get('parameter_size', '?')
    print(f\"  {m['name']:25s} {params:>8s}  {quant:>8s}  {size_gb:.1f} GB\")
"
}

# ── Main ──────────────────────────────────────────────────────

echo "Available models:"
list_models
echo ""

# Determine which models and prompts to test
FILTER_MODEL="${1:-}"
FILTER_PROMPT="${2:-}"

if [[ -n "$FILTER_MODEL" ]]; then
    MODELS=("$FILTER_MODEL")
else
    MODELS=("llama3.2:3b" "llama2:7b-chat" "qwen3.5:0.8b")
fi

if [[ -n "$FILTER_PROMPT" ]]; then
    PROMPT_KEYS=("$FILTER_PROMPT")
else
    PROMPT_KEYS=("meows" "river" "dessert" "color")
fi

printf "%-18s %-10s %-15s %s\n" "MODEL" "PROMPT" "RESPONSE" "TIME"
echo "────────────────────────────────────────────────────────────"

for model in "${MODELS[@]}"; do
    for key in "${PROMPT_KEYS[@]}"; do
        prompt="${PROMPTS[$key]}"
        test_model "$model" "$key" "$prompt"
    done
done
