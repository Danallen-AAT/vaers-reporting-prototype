// Measure the deployed prototype against PRS#4's page load target using the
// browser's own Navigation Timing and Paint Timing, on a cold cache.
import { spawn } from 'node:child_process';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = new URL('./.output', import.meta.url).pathname.replace(/^\//, '');
const PORT = 9350;
const BASE = 'https://happy-tree-02634e910.7.azurestaticapps.net';

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + OUT + '/cdpPerf', '--window-size=1280,900',
  '--no-first-run', '--disable-gpu'], { stdio: 'ignore' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let page;
for (let i = 0; i < 60 && !page; i++) {
  try { page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === 'page' && t.webSocketDebuggerUrl); } catch {}
  if (!page) await sleep(250);
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method: m, params: p })); return new Promise(r => pend.set(i, r)); };
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');

const PROFILES = [
  { name: 'Broadband, no throttle', net: null, cpu: 1 },
  { name: 'Fast 3G, 4x CPU slowdown', net: { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 }, cpu: 4 },
];

const results = [];
for (const prof of PROFILES) {
  for (const path of ['/', '/#/report']) {
    await send('Network.clearBrowserCache');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    if (prof.net) await send('Network.emulateNetworkConditions', prof.net);
    else await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await send('Emulation.setCPUThrottlingRate', { rate: prof.cpu });

    await send('Page.navigate', { url: 'about:blank' });
    await sleep(400);
    await send('Page.navigate', { url: BASE + path });
    await sleep(prof.cpu > 1 ? 6000 : 3500);

    const m = await ev(`(() => {
      const n = performance.getEntriesByType('navigation')[0] || {};
      const paints = Object.fromEntries(performance.getEntriesByType('paint').map(p => [p.name, Math.round(p.startTime)]));
      const res = performance.getEntriesByType('resource');
      return JSON.stringify({
        domContentLoaded: Math.round(n.domContentLoadedEventEnd || 0),
        load: Math.round(n.loadEventEnd || 0),
        firstPaint: paints['first-paint'] ?? null,
        firstContentfulPaint: paints['first-contentful-paint'] ?? null,
        requests: res.length + 1,
        transferredKB: Math.round((res.reduce((a, r) => a + (r.transferSize || 0), 0) + (n.transferSize || 0)) / 1024),
      });
    })()`);
    results.push({ profile: prof.name, path, ...JSON.parse(m) });
  }
}

console.log('PRS#4 page load target: 3000 ms\n');
console.log('profile                      path        FCP     DCL    load   reqs   KB   verdict');
for (const r of results) {
  const v = r.load <= 3000 ? 'PASS' : 'over';
  console.log(
    `${r.profile.padEnd(28)} ${r.path.padEnd(11)} ${String(r.firstContentfulPaint).padStart(5)}  ${String(r.domContentLoaded).padStart(5)}  ${String(r.load).padStart(5)}  ${String(r.requests).padStart(4)}  ${String(r.transferredKB).padStart(4)}  ${v}`
  );
}
ws.close(); chrome.kill(); process.exit(0);
