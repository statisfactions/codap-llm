// Open a CODAP document in headless CODAP 3 and report what loaded.
//
//   node load-test.js <file.codap | https://...codap> [screenshot.png]
//
// A local file is served from the repo root by serve.py, so paths must be inside the repo.
// Prints the data contexts CODAP loaded, any console errors, and saves a screenshot
// (default out/<name>.png).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CODAP = 'https://codap3.concord.org/';
const PORT = 8765;
const repoRoot = path.resolve(__dirname, '..');

(async () => {
  const target = process.argv[2];
  if (!target) { console.error('usage: node load-test.js <file.codap | url> [shot.png]'); process.exit(2); }
  let docUrl = target, server = null;
  if (!/^https?:/.test(target)) {
    const rel = path.relative(repoRoot, path.resolve(target));
    if (rel.startsWith('..')) { console.error('local file must be inside the repo'); process.exit(2); }
    server = spawn('python3', [path.join(__dirname, 'serve.py'), repoRoot, String(PORT)], { stdio: 'ignore' });
    await new Promise(r => setTimeout(r, 800));
    docUrl = `http://localhost:${PORT}/` + rel.split(path.sep).map(encodeURIComponent).join('/');
  }
  const shot = process.argv[3] || path.join(__dirname, 'out', path.basename(target).replace(/\.codap$/, '') + '.png');
  fs.mkdirSync(path.dirname(shot), { recursive: true });

  const browser = await chromium.launch({
    // Chrome blocks public sites from fetching localhost unless these checks are off.
    args: ['--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessRespectPreflightResults,LocalNetworkAccessChecks'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    const url = CODAP + '?url=' + encodeURIComponent(docUrl);
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(15000);
    await page.screenshot({ path: shot });
    const tiles = await page.$$eval('.codap-component .title-text, .component-title-bar .title-text',
      els => els.map(e => e.textContent.trim()).filter(Boolean));
    console.log('link:  ', url);
    console.log('tiles: ', tiles.length ? tiles.join(' | ') : '(none found: check the screenshot)');
    console.log('errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none');
    console.log('shot:  ', shot);
  } finally {
    await browser.close();
    if (server) server.kill();
  }
})();
