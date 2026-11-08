# Development Log

## 2026-11-08: v08 — students drive the plugin

For the next interview phase students operate CODAP themselves.

- **No Sampler dropdown step.** `?pool=Answer` makes every prompt write its words to
  `Words_Answer`. The section 5 template (v02) ships that pool with a placeholder word and the
  Sampler already set to it. Whenever a data context is created or deleted, the Sampler
  (v1.0.4 and v1.0.5) lists the contexts again, re-selects the one with its saved name and
  re-reads its items, so recreating the pool is enough. Tested headlessly
  (`tools/sampler-test.js`): START pressed while the model is still working draws the old pool
  (or the placeholder); a pool swapped in mid-draw doesn't affect that draw, because the
  Sampler copies the pool at START; quick prompt/draw cycles never drew from an old pool.
- **Prompt, Run, Settings columns.** Each pool item carries the prompt, a run label
  (`2 · 10:42:05`) and the model/top-K/temperature/plugin build. The Sampler copies every
  pool column into its draws, so draws from different prompts or versions stay
  distinguishable, including in saved documents.
- **`?mode=student`** hides temperature/top-K, table label, refresh/reset, the reveal,
  direct-sampling, prompt-engineering and backend panels, and the log. The backend panel
  reappears, showing only the access-code box, if a code is needed.
- **One button.** Prepare parses the prompt if it changed; Parse Template is still there for
  multi-slot work outside student mode. Student mode checks the prompt: one blank, one word
  in the brackets, at the very end (the model only sees the words before the blank).
- **Progress.** The status bar counts seconds while the model works and says to wait before
  pressing START.
- **No server URL in the file.** The default is empty; templates pass `?server=`.
- Templates v02 also pin the Sampler to `sampler.concord.org/version/v1.0.5/`.

## 2026-04-01: v06 — Editable table labels, suppress sentences table

### Changes
- **Editable table label field**: Added a text input next to "Prepare Slot" that controls the suffix used for `Words_` and `Variability_` table names in CODAP. Defaults to the slot name but can be changed freely. Solves two problems:
  1. Mystery word machine prompts no longer reveal the answer category (e.g., change "planet" to "word" so tables show as `Words_word` instead of `Words_planet`)
  2. Multiple prompts with the same slot name (e.g., three different planet prompts) can use distinct labels to avoid ambiguity about which data you're looking at
- **Sentences table no longer auto-opens**: The `MadLibsData` context is still created for future use, but its case table doesn't pop up on load — it was extraneous for the sampling-focused workflow
- **New file**: `statistical-madlibs-codap-v06.html` (bumped from v05)

## 2026-01-30: Prompt Engineering Experiments for Slot Filling

### Goal
Investigate whether providing full sentence context improves slot-filling predictions (e.g., when filling `[River Name]` in "The [River Name] flows through [Location]").

### Hypothesis
Showing the model the complete template—including text after the slot being filled—might provide better semantic constraints for predictions.

### Experiments

**Approach 1: Fill-in-the-blank style**
- Inserted `___` marker at slot position with rest of template visible
- Prompt: `The ___flows through [Location]... Fill in the blank (___) for [River Name]:`
- **Result**: Poor. Model produced non-word tokens like "the", "Rivers", "**Answer", "Dolphin", "I". The model attempted to follow instructions rather than predict the next word.

**Approach 2: Hybrid (context hint + completion)**
- Showed full template as quoted context in system prompt
- Still used left-to-right completion from the slot position
- Prompt structure:
  ```
  Complete the sentence. Full template: "The [River Name] flows through [Location]..."
  Now continue with the next word for [River Name]:
  The
  ```
- **Result**: Still worse than simple completion. The additional context appears to confuse the model or shift its behavior away from pure next-token prediction.

**Approach 3: Simple left-to-right completion (baseline)**
- Model sees only text up to the slot: `The `
- Prompt: `Fill in [River Name] with one word.\n\nThe `
- **Result**: Best performance. Produces relevant river names consistently.

### Conclusion
Standard autoregressive models (Qwen2.5-0.5B-Instruct) perform best with simple left-to-right completion. Attempts to provide "fill-in-the-middle" context through prompt engineering degrade performance, likely because:

1. The model wasn't trained for infilling tasks
2. Additional instructions shift the model from next-token prediction to instruction-following mode
3. The quoted context may introduce confusing tokens into the attention window

**Recommendation**: Use Simple Completion preset (default) for best results. The "Include rest of template" option is preserved for future experimentation but not recommended for current model.

### Future Considerations
- True fill-in-middle (FIM) models with special tokens (e.g., code models like StarCoder)
- Encoder-decoder models (T5, BART) trained with span corruption
- Fine-tuning a small model specifically for this task
