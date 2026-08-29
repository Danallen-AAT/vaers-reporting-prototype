import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = new URL('./.output', import.meta.url).pathname.replace(/^\//, '');
const PORT = 9338;
const BASE = 'https://happy-tree-02634e910.7.azurestaticapps.net';
const TARGET = BASE + '/#/report';
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + OUT + '/cdpprofile6', '--window-size=1280,900',
  '--hide-scrollbars', '--no-first-run', '--disable-gpu', TARGET], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let page;
for (let i = 0; i < 60 && !page; i++) {
  try { page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === 'page' && t.webSocketDebuggerUrl); } catch {}
  if (!page) await sleep(250);
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (m, p = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method: m, params: p })); return new Promise(r => pending.set(i, r)); };
const evaluate = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;

await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL });
await sleep(4500);

const results = {};

// Does the deployed build even contain the new features?
results.hasProgressPanel = await evaluate(`!!document.querySelector('.progress-panel') || (() => {
  const r = [...document.querySelectorAll('label.option')].find(l=>l.textContent.trim()==='Healthcare provider');
  if (r) r.querySelector('input').click();
  return false;
})()`);
await sleep(900);
results.progressPanelAfterPathChoice = await evaluate(`!!document.querySelector('.progress-panel')`);
results.tooltipTogglesPresent = await evaluate(`document.querySelectorAll('button.tip-toggle').length`);

// Skip link, on the live site.
await evaluate(`window.scrollTo(0, 800)`);
await sleep(300);
await evaluate(`document.querySelector('.skip-link').click()`);
await sleep(1200);
results.skipLink = await evaluate(`JSON.stringify({
  hash: location.hash,
  focused: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
  landedOnLanding: !!document.querySelector('.landing'),
})`);

// Error summary link, on the live site.
await evaluate(`[...document.querySelectorAll('button')].find(b=>/review submission/i.test(b.textContent)).click()`);
await sleep(1000);
await evaluate(`document.querySelector('.error-summary a').click()`);
await sleep(1200);
results.errorLink = await evaluate(`JSON.stringify({
  hash: location.hash,
  focused: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
  landedOnLanding: !!document.querySelector('.landing'),
  stillOnForm: !!document.querySelector('.vaers-form'),
})`);

// Completion status chip, on the live site.
await evaluate(`document.querySelectorAll('.progress-item button')[2].click()`);
await sleep(1200);
results.chip = await evaluate(`JSON.stringify({
  hash: location.hash,
  focused: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
  landedOnLanding: !!document.querySelector('.landing'),
})`);

const r = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(`${OUT}/live_verified.png`, Buffer.from(r.result.data, 'base64'));

console.log('LIVE SITE: ' + BASE);
console.log(JSON.stringify(results, null, 1));
ws.close(); chrome.kill(); process.exit(0);
