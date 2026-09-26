# Interview templates

Blank CODAP documents for the interview activities. Each one opens from a link as a fresh,
unsaved copy, so no one has to copy and rename a master file on Drive, and the template
itself can't be overwritten by accident.

| Activity | Open link |
|---|---|
| 3 Mystery Word Machine (v02) | [open in CODAP](https://codap3.concord.org/?url=https%3A%2F%2Fstatisfactions.github.io%2Fcodap-llm%2Ftemplates%2Fmystery-word-machine-v02.codap) |
| 4.1 Hottest planet (v01) | [open in CODAP](https://codap3.concord.org/?url=https%3A%2F%2Fstatisfactions.github.io%2Fcodap-llm%2Ftemplates%2Fplanet-hottest-v01.codap) |
| 4.2 Coldest planet (v01) | [open in CODAP](https://codap3.concord.org/?url=https%3A%2F%2Fstatisfactions.github.io%2Fcodap-llm%2Ftemplates%2Fplanet-coldest-v01.codap) |
| 5 Your prompt (v01) | [open in CODAP](https://codap3.concord.org/?url=https%3A%2F%2Fstatisfactions.github.io%2Fcodap-llm%2Ftemplates%2Fyour-prompt-v01.codap) |

A copy opened from a link is named "Untitled Document". At the start of the interview, rename
it to the activity plus the participant ID (e.g. `3 Mystery Word Machine aa07`) and save it
to the project's private storage.

**No participant data in this folder.** The repo is public. Completed interview documents
belong in the private project storage.

## Notes for the interviewer instructions (to be written up)

- **Access code.** The Mad Libs templates (4.x, 5) need an access code, entered once per
  browser under ⚙️ Inference Backend. It's not obvious: paste the code, then **click outside
  the field**. The plugin connects only when the field loses focus.
- **Watch the console.** The small log area at the bottom of the Mad Libs plugin shows errors
  as they happen. Note any errors you see, with the time, so they can be matched to the
  recording.
- **4.1 and 4.2** open with the model's word pool already loaded in the Sampler, so drawing
  works straight away.
- **5 Your prompt** opens with an empty Sampler. Type the participant's prompt, click **Parse
  Template**, then **Prepare Slot**. When the panel says the slot is ready, choose the
  **Words_…** item in the Sampler's Collector dropdown and draw. If draws come out as
  "connect-to-sampler-first", that dropdown step was skipped: choose the pool, **CLEAR DATA**,
  draw again. (The plugin's "Connect to Sampler" button is not part of this: it adds
  running percentages.)
- The full interviewer guide, with screenshots, is in the private project repo
  (`Materials/codap-guide-v01`).

## Adding a template

1. Build the document in CODAP, save it, and download the `.codap` file. The 4.x and 5
   templates are generated from the private project repo by `Templates/build_templates.py`.
2. Add it here with a lowercase, hyphenated name and a version number (e.g. `planet-prompts-v01.codap`).
3. Check it holds no participant data (tables should be empty or hold only preloaded data).
4. Add a row to the table above. The link is
   `https://codap3.concord.org/?url=` + the URL-encoded
   `https://statisfactions.github.io/codap-llm/templates/<file>.codap`.
5. After pushing, wait a minute for GitHub Pages to update, then test the link.

Older versions stay in the folder, as with the plugins.
