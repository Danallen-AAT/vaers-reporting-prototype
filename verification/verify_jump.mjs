import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = new URL('./.output', import.meta.url).pathname.replace(/^\//, '');
const PORT = 9337;
const URL = 'http://localhost:5173/#/report';
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + OUT + '/cdpprofile5', '--window-size=1280,900',
  '--hide-scrollbars', '--no-first-run', '--disable-gpu', URL], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let page;
for (let i = 0; i < 40 && !page; i++) {
  try { page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === 'page' && t.webSocketDebuggerUrl); } catch {}
  if (!page) await sleep(250);
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (m, p = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method: m, params: p })); return new Promise(r => pending.set(i, r)); };
const evaluate = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;
async function shoot(n) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, 'base64'));
}

await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: URL });
await sleep(2500);

// Public path, then force validation errors.
await evaluate(`[...document.querySelectorAll('label.option')].find(l=>l.textContent.trim()==='Patient, parent, or caregiver').querySelector('input').click()`);
await sleep(700);
await evaluate(`[...document.querySelectorAll('button')].find(b=>/review submission/i.test(b.textContent)).click()`);
await sleep(900);

const state = async (label) => {
  const v = await evaluate(String.raw`(() => {
    const ae = document.activeElement;
    return JSON.stringify({
      hash: location.hash,
      onForm: !!document.querySelector('.vaers-form'),
      onLanding: !!document.querySelector('.landing'),
      errorSummaryPresent: !!document.querySelector('.error-summary'),
      focused: ae ? (ae.id || ae.className || ae.tagName) : null,
      focusedTag: ae ? ae.tagName : null,
      scrollY: Math.round(window.scrollY),
      labelVisible: (() => {
        const ae = document.activeElement;
        const field = ae && ae.closest ? ae.closest('.field') : null;
        if (!field) return 'n/a';
        const lab = field.querySelector('.field-label');
        const panel = document.querySelector('.progress-panel');
        if (!lab) return 'no label';
        const lr = lab.getBoundingClientRect();
        const pb = panel ? panel.getBoundingClientRect().bottom : 0;
        return { labelTop: Math.round(lr.top), panelBottom: Math.round(pb), clear: lr.top >= pb };
      })(),
    }, null, 1);
  })()`);
  console.log('\n== ' + label + ' ==\n' + v);
};

await state('after failed submit');

// ---- 1. Error summary link ----
const clickedTarget = await evaluate(String.raw`(() => {
  const a = document.querySelector('.error-summary a');
  const href = a.getAttribute('href');
  a.click();
  return href;
})()`);
console.log('\nclicked error link ->', clickedTarget);
await sleep(1200);
await state('after clicking an error summary link');
await shoot('verify_error_link');

// ---- 2. Skip link ----
await evaluate(`window.scrollTo(0, 900)`);
await sleep(400);
await evaluate(`document.querySelector('.skip-link').click()`);
await sleep(1200);
await state('after clicking the skip link');

ws.close(); chrome.kill(); process.exit(0);
