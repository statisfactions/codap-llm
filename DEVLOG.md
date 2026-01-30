# Development Log

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
