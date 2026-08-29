// Responsive check (PWS 1.3): the reporting form at a narrow mobile width.
// Drives headless Chrome over CDP against the deployed build, overrides device
// metrics to 390x844 (a common current handset), walks both reporter paths, and
// fails if the document scrolls horizontally or any element overflows the
// viewport. Run: node verification/responsive.mjs
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = new URL('./.output', import.meta.url).pathname.replace(/^\//, '');
const PORT = 9341;
const BASE = process.env.BASE || 'https://happy-tree-02634e910.7.azurestaticapps.net';
const WIDTH = 390, HEIGHT = 844;
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + OUT + '/cdpresp', '--window-size=1280,900',
  '--hide-scrollbars', '--no-first-run', '--disable-gpu', BASE + '/#/report'], { stdio: 'ignore' });
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
await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 3, mobile: true });
await send('Page.navigate', { url: BASE + '/#/report' });
await sleep(2500);

const measure = async (label) => {
  const r = await evaluate(`(() => {
    const d = document.documentElement;
    const edge = Math.max(d.clientWidth, window.innerWidth) + 2;
    const insideScroller = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ov = getComputedStyle(p).overflowX;
        if (ov === 'auto' || ov === 'scroll' || ov === 'clip' || ov === 'hidden') return true;
      }
      return false;
    };
    const wide = [...document.querySelectorAll('*')]
      .filter(el => el.getBoundingClientRect().right > edge && el.offsetParent !== null && !insideScroller(el))
      .slice(0, 5)
      .map(el => el.tagName + '.' + String(el.className).slice(0, 30) + ' right=' + Math.round(el.getBoundingClientRect().right));
    // scrollbar rounding differs per platform; anything <= 4px is not a real pan
    return JSON.stringify({ innerWidth: window.innerWidth, scrollWidth: d.scrollWidth,
      horizontalOverflow: d.scrollWidth - d.clientWidth, elementsPastEdge: wide });
  })()`);
  const o = JSON.parse(r);
  const ok = o.horizontalOverflow <= 4 && o.elementsPastEdge.length === 0;
  console.log((ok ? 'PASS' : 'FAIL') + `  ${label}  ->  innerWidth=${o.innerWidth} scrollWidth=${o.scrollWidth} overflow=${o.horizontalOverflow}px` +
    (o.elementsPastEdge.length ? '  past edge: ' + o.elementsPastEdge.join(' | ') : ''));
  return ok;
};

let allOk = true;
allOk = (await measure('form, no path chosen')) && allOk;
await evaluate(`(() => { const r=[...document.querySelectorAll('input[type=radio]')].find(x=>x.value==='public'); if(r) r.click(); return 1; })()`);
await sleep(700);
allOk = (await measure('public path, all sections')) && allOk;
await evaluate(`(() => { const r=[...document.querySelectorAll('input[type=radio]')].find(x=>x.value==='provider'); if(r) r.click(); return 1; })()`);
await sleep(700);
allOk = (await measure('provider path, all sections')) && allOk;
await send('Page.navigate', { url: BASE + '/#/' });
await sleep(1500);
allOk = (await measure('landing page')) && allOk;

console.log('\n' + (allOk ? `RESPONSIVE AT ${WIDTH}px: PASS` : `RESPONSIVE AT ${WIDTH}px: FAIL`));
chrome.kill();
process.exit(allOk ? 0 : 1);
