#!/usr/bin/env python3
"""
Test all prompts against the Ollama server using the exact same prompt
construction logic as statistical-madlibs-codap-v04.html, including
greedy completion of subword tokens to full words.

The plugin builds prompts as:
  system: "Complete the following text naturally with a single word.
           Only output the completion word, nothing else."
  user:   "Fill in [SlotName] with one word.\n\n<context before slot>"

Usage:
  python3 run_prompts.py                      # all prompts, gemma2:9b
  python3 run_prompts.py --model llama3.2:3b  # different model
  python3 run_prompts.py --ids 1,2,3          # specific prompts only
"""

import json, math, os, re, sys, time, argparse
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(SCRIPT_DIR, '..', '..', '.env')
DEFAULT_PROMPTS_FILE = os.path.join(SCRIPT_DIR, 'prompts.json')

SYSTEM_PROMPT = (
    "Complete the following text naturally with a single word. "
    "Only output the completion word, nothing else."
)
BASE_URL = "https://apollo.quocanmeomeo.io.vn"

# Mirrors the plugin's word-boundary regex
WORD_BOUNDARY_END = re.compile(r'[\s.,!?;:\'")\]}>]')
WORD_BOUNDARY_START = re.compile(r'^[\s.,!?;:\'")\]}>]')
CLEANUP_LEADING = re.compile(r'^[.,!?;:\'"()\[\]{}<>]+')
CLEANUP_TRAILING = re.compile(r'[.,!?;:\'"()\[\]{}<>]+$')
SPECIAL_TOKEN = re.compile(r'<\|.*?\|>')


def load_api_key():
    key = os.environ.get('OLLAMA_API_KEY')
    if key:
        return key
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE) as f:
            for line in f:
                line = line.strip().strip("'\"")
                if line.startswith('OLLAMA_API_KEY='):
                    return line.split('=', 1)[1].strip().strip("'\"")
    print("Error: OLLAMA_API_KEY not found", file=sys.stderr)
    sys.exit(1)


def parse_template(template):
    """
    Extract slot name and context from a template string, exactly as the
    CODAP plugin does: everything before [SlotName] is context, and
    the slot name is used in the prefix.
    """
    match = re.search(r'\[([^\]]+)\]', template)
    if not match:
        raise ValueError(f"No [SlotName] found in template: {template}")
    slot_name = match.group(1)
    context = template[:match.start()]
    return slot_name, context


def build_messages(template):
    """
    Build the system + user messages exactly as the CODAP plugin does
    with the "Simple Completion" preset (default):
      - prefix: "Fill in [SlotName] with one word."
      - chat format: on
      - add space before slot: on
      - include rest of template: off
    """
    slot_name, context = parse_template(template)

    prefix = f"Fill in [{slot_name}] with one word."
    user_content = f"{prefix}\n\n{context}"

    # Plugin adds trailing space if not already present
    if not user_content.endswith(' '):
        user_content += ' '

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": user_content},
    ]


def query_model(api_key, model, messages, top_logprobs=10, max_tokens=3,
                temperature=1.0):
    url = f"{BASE_URL}/v1/chat/completions"
    payload = json.dumps({
        "model": model,
        "messages": messages,
        "logprobs": True,
        "top_logprobs": top_logprobs,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": False,
    }).encode()

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())


def greedy_complete_to_word(api_key, model, messages, initial_token_text,
                            max_iterations=10):
    """
    Mirrors the plugin's greedyCompleteToWord(): given an initial token,
    keep generating greedily (temperature=0) until we hit a word boundary.
    Returns the completed word.
    """
    word = initial_token_text

    # Skip special tokens or empty
    if '<|' in word or '|>' in word or not word.strip():
        return ''

    # Check if already at a word boundary
    if word and WORD_BOUNDARY_END.search(word[-1]):
        word = CLEANUP_TRAILING.sub('', word)
        return word.strip()

    # Build a new conversation with the initial token already "spoken"
    # by appending it to the assistant's response so far
    continuation_messages = list(messages) + [
        {"role": "assistant", "content": word}
    ]

    for _ in range(max_iterations):
        try:
            resp = query_model(
                api_key, model, continuation_messages,
                top_logprobs=1, max_tokens=1, temperature=0.0
            )
        except Exception:
            break

        choice = resp['choices'][0]
        next_token = choice['message']['content']

        # Stop on special tokens
        if '<|' in next_token or '|>' in next_token:
            break
        # Stop on EOS
        if next_token == '<eos>' or next_token == '':
            break
        # Stop if next token starts with word boundary
        if WORD_BOUNDARY_START.match(next_token):
            break

        word += next_token
        continuation_messages[-1]["content"] = word

        # Check if word now ends at a boundary
        if word and WORD_BOUNDARY_END.search(word[-1]):
            word = CLEANUP_TRAILING.sub('', word)
            break

    # Final cleanup (mirrors plugin)
    word = word.strip()
    word = CLEANUP_LEADING.sub('', word)
    word = CLEANUP_TRAILING.sub('', word)
    word = SPECIAL_TOKEN.sub('', word)
    return word


def process_prompt(api_key, model, prompt_entry, top_k=10):
    """
    Process a single prompt: get initial logprobs, greedy-complete each
    candidate to a full word, deduplicate by lowercase, return top-3.
    """
    messages = build_messages(prompt_entry['template'])

    t0 = time.time()

    # Step 1: Get top-k logprobs for the first token
    resp = query_model(api_key, model, messages, top_logprobs=top_k,
                       max_tokens=1)

    choice = resp['choices'][0]
    lp = choice.get('logprobs', {})
    if not lp or not lp.get('content'):
        return None, 0

    initial_tokens = []
    for alt in lp['content'][0].get('top_logprobs', []):
        initial_tokens.append({
            'token': alt['token'],
            'prob': math.exp(alt['logprob']),
        })

    # Step 2: Greedy-complete each token to a full word
    seen_words = {}  # normalized_word -> {word, prob}
    completed_list = []

    for tok in initial_tokens:
        word = greedy_complete_to_word(
            api_key, model, messages, tok['token']
        )
        if not word:
            continue

        normalized = word.lower().strip()
        if not normalized:
            continue

        if normalized in seen_words:
            # Merge probability (same word, different casing)
            seen_words[normalized]['prob'] += tok['prob']
        else:
            seen_words[normalized] = {
                'word': word,
                'prob': tok['prob'],
            }
            completed_list.append(normalized)

    # Step 3: Build final candidates sorted by probability
    candidates = []
    for norm in completed_list:
        entry = seen_words[norm]
        candidates.append({
            'word': entry['word'],
            'prob': entry['prob'],
        })
    candidates.sort(key=lambda c: c['prob'], reverse=True)

    elapsed_ms = int((time.time() - t0) * 1000)
    return candidates, elapsed_ms


def run(model, prompt_ids=None, prompts_file=DEFAULT_PROMPTS_FILE):
    api_key = load_api_key()

    with open(prompts_file) as f:
        prompts = json.load(f)

    if prompt_ids:
        prompts = [p for p in prompts if p['id'] in prompt_ids]

    results = []

    # Header
    print(f"{'ID':>3}  {'Domain':<10} {'Exp':>6}  "
          f"{'Top-1':>25}  {'Top-2':>25}  {'Top-3':>25}  {'ms':>6}")
    print("─" * 110)

    for p in prompts:
        try:
            candidates, elapsed_ms = process_prompt(api_key, model, p)
        except Exception as e:
            print(f"{p['id']:>3}  {p['domain']:<10} {p.get('expected',''):>6}  "
                  f"ERROR: {e}")
            continue

        if not candidates:
            print(f"{p['id']:>3}  {p['domain']:<10} {p.get('expected',''):>6}  "
                  f"(no candidates)")
            continue

        def fmt(i):
            if i < len(candidates):
                c = candidates[i]
                return f"{c['word']} {c['prob']*100:5.1f}%"
            return ""

        expected = p.get("expected", "")
        row = {
            "id": p["id"],
            "domain": p["domain"],
            "expected": expected,
            "template": p["template"],
            "candidates": [
                {"word": c["word"], "prob": round(c["prob"], 6)}
                for c in candidates
            ],
            "elapsed_ms": elapsed_ms,
        }
        results.append(row)

        print(f"{p['id']:>3}  {p['domain']:<10} {p.get('expected',''):>6}  "
              f"{fmt(0):>25}  {fmt(1):>25}  {fmt(2):>25}  "
              f"{elapsed_ms:>6}")

    # Save full results
    outfile = os.path.join(
        SCRIPT_DIR, f"results_{model.replace(':', '_')}.json"
    )
    with open(outfile, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nFull results saved to {outfile}")

    # Summary stats
    if results:
        top1_probs = [
            r['candidates'][0]['prob'] * 100
            for r in results if r.get('candidates')
        ]
        print(f"\nTop-1 probability stats (n={len(top1_probs)}):")
        top1_probs.sort()
        print(f"  Min: {min(top1_probs):.1f}%  "
              f"Max: {max(top1_probs):.1f}%  "
              f"Median: {top1_probs[len(top1_probs)//2]:.1f}%  "
              f"Mean: {sum(top1_probs)/len(top1_probs):.1f}%")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', default='gemma2:9b')
    parser.add_argument('--ids', help='Comma-separated prompt IDs')
    parser.add_argument('--file', default=DEFAULT_PROMPTS_FILE,
                        help='Prompts JSON file')
    args = parser.parse_args()

    ids = None
    if args.ids:
        ids = set(int(x) for x in args.ids.split(','))

    run(args.model, ids, args.file)
