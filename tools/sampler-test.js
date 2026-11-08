// Check a Mad Libs template end to end in headless CODAP, with the model stubbed out.
//
//   node sampler-test.js [template.codap] [--quick]
//
// Requests for the plugin are answered with the local copy in this repo (so unpushed changes
// are tested), and its server is replaced by a dead address (so nothing reaches the worker).
// CODAP loads plugins over https, so the plugin can't simply be served from localhost. Checks:
// student mode hides the researcher controls; the Sampler is already set to the pool and is
// never touched. With --quick (the 4.x templates) it draws once from the saved pool. Without
// it (section 5), it also checks prompt validation, START pressed while the model is still
// working, a second prompt in the same tab, quick prompt/draw cycles (every draw must come
// from the newest pool and carry its Prompt, Run and Settings columns), and that the model's
// special tokens (<eos> etc.) never become candidate words.
// Exits 1 if any check fails. Screenshot: out/<template>-test.png
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CODAP = 'https://codap3.concord.org/';
const PORT = 8766;
const repoRoot = path.resolve(__dirname, '..');
const LOCAL = `http://localhost:${PORT}/`;
const PLUGIN_SITE = 'https://statisfactions.github.io/codap-llm/';
const NO_SERVER = 'https://no-model.invalid/v1/chat/completions';
const DELAY = 6000;   // stubbed model time for the slow-answer checks
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Playwright's pinned Chromium, or the newest one installed if that's missing.
function chromiumPath() {
  const pinned = chromium.executablePath();
  if (fs.existsSync(pinned)) return undefined;
  const cache = path.join(process.env.HOME, '.cache', 'ms-playwright');
  const dirs = fs.readdirSync(cache).filter(d => d.startsWith('chromium_headless_shell-')).sort();
  if (!dirs.length) throw new Error('no Chromium in ' + cache + ': run npx playwright install chromium');
  return path.join(cache, dirs[dirs.length - 1], 'chrome-headless-shell-linux64', 'chrome-headless-shell');
}

let failures = 0;
function check(ok, what, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + what + (detail && !ok ? '\n     ' + detail : ''));
  if (!ok) failures++;
}

(async () => {
  const args = process.argv.slice(2);
  const quick = args.includes('--quick');
  const target = path.resolve(args.find(a => !a.startsWith('--')) || path.join(repoRoot, 'templates', 'your-prompt-v02.codap'));
  const name = path.basename(target, '.codap');

  // Test copy: no server.
  const doc = JSON.parse(fs.readFileSync(target, 'utf8'));
  let pool = '', prompt = '', placeholder = '';
  for (const comp of doc.components) {
    const st = comp.componentStorage || {};
    const url = st.currentGameUrl || '';
    if (url.includes('statistical-madlibs')) {
      const u = new URL(url);
      u.searchParams.set('server', NO_SERVER);
      prompt = u.searchParams.get('prompt') || '';
      st.currentGameUrl = u.toString();
    } else if (url.includes('sampler.concord.org')) {
      pool = st.savedGameState.collectorContextName;
    }
  }
  const poolCtx = doc.contexts.find(c => c.name === pool);
  const poolWords = new Set(poolCtx ? poolCtx.collections[0].cases.map(c => c.values.Word) : []);
  if (!quick) placeholder = [...poolWords][0];
  const testDoc = path.join(__dirname, 'out', name + '-test.codap');
  fs.mkdirSync(path.dirname(testDoc), { recursive: true });
  fs.writeFileSync(testDoc, JSON.stringify(doc));

  const server = spawn('python3', [path.join(__dirname, 'serve.py'), repoRoot, String(PORT)], { stdio: 'ignore' });
  await sleep(800);
  const docUrl = LOCAL + path.relative(repoRoot, testDoc).split(path.sep).map(encodeURIComponent).join('/');
  const served = await fetch(docUrl).then(r => r.status, () => 0);
  if (served !== 200) {
    server.kill();
    throw new Error(`${docUrl} returned ${served}: is something else using port ${PORT}?`);
  }
  const browser = await chromium.launch({
    executablePath: chromiumPath(),
    args: ['--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessRespectPreflightResults,LocalNetworkAccessChecks'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    page.on('dialog', async d => { console.log('  [alert] ' + d.message()); await d.dismiss(); });
    page.on('pageerror', e => console.log('  [page error] ' + e.message));
    await page.route(PLUGIN_SITE + 'statistical-madlibs-codap-*.html*', route => {
      const file = path.join(repoRoot, path.basename(new URL(route.request().url()).pathname));
      route.fulfill({ status: 200, contentType: 'text/html', body: fs.readFileSync(file, 'utf8') });
    });
    await page.route('https://no-model.invalid/**', route => route.abort());
    await page.goto(CODAP + '?url=' + encodeURIComponent(docUrl), { waitUntil: 'load', timeout: 60000 });

    let mad, smp;
    for (let i = 0; i < 40 && !(mad && smp); i++) {
      await sleep(1000);
      mad = page.frames().find(f => f.url().includes('statistical-madlibs'));
      smp = page.frames().find(f => f.url().includes('sampler.concord.org'));
    }
    if (!mad || !smp) {
      await page.screenshot({ path: path.join(__dirname, 'out', name + '-test.png') });
      throw new Error('plugin or Sampler did not load; frames: ' + page.frames().map(f => f.url()).join(' '));
    }
    await mad.waitForFunction(() => typeof codapConnected !== 'undefined' && codapConnected, null, { timeout: 30000 });
    await sleep(5000);  // let the Sampler finish reading its pool

    const api = req => mad.evaluate(r => codapInterface.sendRequest(r), req);
    const status = async () => (await mad.textContent('#modelStatus')).trim();
    const dropdown = () => smp.evaluate(() => [...document.querySelectorAll('select')].map(s => s.value).filter(v => v.startsWith('Words_'))[0] || '');
    const setModel = (cands, delay) => mad.evaluate(([c, d]) => {
      model = {}; tokenizer = {}; updateButtonStates();
      window.getWordCandidates = async () => { await new Promise(r => setTimeout(r, d)); return c; };
    }, [cands.map(([word, probability]) => ({ word, probability, tokenId: 0 })), delay]);
    const prepare = async text => {
      await mad.fill('#templateInput', text);
      await mad.click('#prepareSlotBtn');
    };
    const waitReady = async () => {
      for (let i = 0; i < 60; i++) { if (/ready/i.test(await status())) return true; await sleep(500); }
      return false;
    };
    let seen = 0;
    const draw = async n => {
      await smp.evaluate(n => {
        const box = [...document.querySelectorAll('input')].find(i => i.parentElement && /items/.test(i.parentElement.textContent) && /^\d+$/.test(i.value));
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        set.call(box, String(n));
        box.dispatchEvent(new Event('input', { bubbles: true }));
        box.dispatchEvent(new Event('change', { bubbles: true }));
      }, n);
      await smp.getByRole('button', { name: 'START' }).click();
      let all = [];
      for (let i = 0; i < 120; i++) {
        await sleep(1000);
        const r = await api({ action: 'get', resource: 'dataContext[Sampler].itemSearch[*]' });
        if (r && r.success) all = r.values;   // CODAP may be too busy to answer mid-draw
        if (all.length >= seen + n) break;
      }
      const mine = all.slice(seen).map(i => i.values);
      seen = all.length;
      return mine;
    };
    const tally = draws => { const t = {}; draws.forEach(d => t[d.Word] = (t[d.Word] || 0) + 1); return JSON.stringify(t); };
    const share = (draws, word) => draws.filter(d => d.Word === word).length / draws.length;

    // Student mode
    const hidden = await mad.evaluate(() => ['tempSlider', 'parseBtn', 'backendSettings', 'debugLog', 'tableLabelRow', 'revealSection', 'resetBtn']
      .filter(id => { const e = document.getElementById(id); return e && e.offsetParent !== null; }));
    check(hidden.length === 0, 'student mode hides the researcher controls', 'still visible: ' + hidden.join(', '));
    check(/Get the AI/.test(await mad.textContent('#prepareSlotBtn')), 'Prepare button is labelled for students');
    check(await dropdown() === pool, `Sampler is set to ${pool} on load`, 'dropdown: ' + await dropdown());

    if (quick) {
      const d = await draw(200);
      check(d.length === 200 && d.every(x => poolWords.has(x.Word)), 'draws come from the saved pool', tally(d));
      check(d.every(x => x.Prompt === prompt && x.Run === 'saved'), 'draws carry the prompt and Run "saved"', JSON.stringify(d[0]));
    } else {
      // The real candidate pipeline with the API stubbed: special tokens never become words
      const words = await mad.evaluate(async () => {
        templateInput.value = 'The hottest planet in the solar system is [Planet]';
        parseTemplate();
        const lp = (token, p) => ({ token, logprob: Math.log(p) });
        ollamaQuery = async (messages, options) => options.logprobs
          ? { choices: [{ logprobs: { content: [{ top_logprobs: [lp(' Venus', .6), lp('<eos>', .2), lp('<end_of_turn>', .1), lp(' Mercury', .05), lp('<pad>', .05)] }] } }] }
          : { choices: [{ message: { content: '.' } }] };
        return (await ollamaGetWordCandidates(8, 0)).map(c => c.word);
      });
      check(JSON.stringify(words) === '["Venus","Mercury"]', 'special tokens (<eos>, <end_of_turn>, <pad>) never become candidates', JSON.stringify(words));

      // Validation
      await setModel([['x', 1]], 0);
      for (const [bad, expect] of [['What is the best fruit', /Add a blank/], ['The [best fruit] is', /one word/], ['The [Fruit] is tasty', /very end/], ['A [Fruit] and a [Fruit]', /just one blank/]]) {
        await prepare(bad); await sleep(300);
        check(expect.test(await status()), `rejects "${bad}"`, 'status: ' + await status());
      }
      const P1 = 'The best fruit to eat on a hot day is [Fruit]';
      const P2 = 'The capital of the country of Velmaria is [City]';

      // START pressed while the model is still working on the first prompt
      await setModel([['Watermelon', .8], ['Mango', .2]], DELAY);
      await prepare(P1);
      await sleep(1000);
      check(/working out its answers/.test(await status()), 'shows progress while the model works', await status());
      let d = await draw(20);
      check(d.every(x => x.Word === placeholder), 'START before the answers arrive draws the placeholder', tally(d));
      check(await waitReady(), 'first prompt becomes ready', await status());
      d = await draw(200);
      const run1 = d[0] && d[0].Run;
      check(d.every(x => ['Watermelon', 'Mango'].includes(x.Word) && x.Prompt === P1 && x.Run === run1),
        'then draws come from the first prompt, with its Prompt and Run', tally(d) + ' ' + JSON.stringify(d[0]));
      check(Math.abs(share(d, 'Watermelon') - .8) < .12, 'in proportion (80/20)', tally(d));
      check(d[0] && /gemma2:9b/.test(d[0].Settings) && /v08/.test(d[0].Settings), 'Settings records the model and plugin build', d[0] && d[0].Settings);

      // Second prompt in the same tab, START during the wait
      await setModel([['Atheria', .5], ['Alora', .5]], DELAY);
      await prepare(P2);
      await sleep(1000);
      d = await draw(50);
      check(d.every(x => x.Run === run1), 'START during the second wait still draws the first pool, labelled with its Run', tally(d));
      check(await waitReady(), 'second prompt becomes ready', await status());
      d = await draw(200);
      check(d.every(x => ['Atheria', 'Alora'].includes(x.Word) && x.Prompt === P2 && x.Run !== run1),
        'then draws come from the second prompt', tally(d));

      // Quick cycles: START right after each prompt is ready
      const pools = [[['Venus', .9], ['Mercury', .1]], [['Neil', .6], ['Buzz', .4]], [['Uranus', .77], ['Neptune', .23]]];
      let stale = 0;
      for (const [k, cands] of pools.entries()) {
        await setModel(cands, 300);
        const text = `Cycle ${k + 1} prompt is [Word]`;
        await prepare(text);
        await waitReady();
        d = await draw(100);
        const words = new Set(cands.map(c => c[0]));
        stale += d.filter(x => !words.has(x.Word) || x.Prompt !== text).length;
      }
      check(stale === 0, 'quick prompt/draw cycles never draw from an old pool', stale + ' stale draws');
      check(await dropdown() === pool, `Sampler is still set to ${pool}`, 'dropdown: ' + await dropdown());
    }

    const ctx = await api({ action: 'get', resource: 'dataContext[Sampler]' });
    const cols = ctx.values.collections.at(-1).attrs.map(a => a.name);
    check(['Word', 'Prompt', 'Run', 'Settings'].every(c => cols.includes(c)), 'Sampler draws have Word, Prompt, Run, Settings', cols.join(', '));
    const shot = path.join(__dirname, 'out', name + '-test.png');
    await page.screenshot({ path: shot });
    console.log(`\n${failures ? failures + ' check(s) FAILED' : 'All checks passed'}. Screenshot: ${shot}`);
  } finally {
    await browser.close();
    server.kill();
  }
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
