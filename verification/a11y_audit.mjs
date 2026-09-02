// Behavioural accessibility audit. Drives real key events rather than reading
// markup, because every defect found so far was invisible to axe and to jsdom.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = new URL('./.output', import.meta.url).pathname.replace(/^\//, '');
const PORT = 9340;
const BASE = 'http://localhost:5173';
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + OUT + '/cdpA11y', '--window-size=1280,900',
  '--hide-scrollbars', '--no-first-run', '--disable-gpu', BASE], { stdio: 'ignore' });
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
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;

async function key(k, code, vk, mods = 0) {
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mods });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mods });
}
const tab = (shift = false) => key('Tab', 'Tab', 9, shift ? 8 : 0);
const esc = () => key('Escape', 'Escape', 27);

async function goto(hash) {
  await send('Page.navigate', { url: BASE + hash });
  await sleep(2200);
}

const DESCRIBE = String.raw`(() => {
  const a = document.activeElement;
  if (!a || a === document.body) return JSON.stringify({ tag: 'BODY' });
  const cs = getComputedStyle(a);
  const r = a.getBoundingClientRect();
  const nameFull = (a.getAttribute('aria-label') || a.textContent || a.value || '').trim();
  const name = nameFull.slice(0, 46);
  return JSON.stringify({
    tag: a.tagName, type: a.type || null, id: a.id || null,
    cls: (typeof a.className === 'string' ? a.className : '').slice(0, 34),
    name, nameFull,
    outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor,
    boxShadow: cs.boxShadow === 'none' ? null : cs.boxShadow.slice(0, 40),
    visible: r.width > 0 && r.height > 0,
    w: Math.round(r.width), h: Math.round(r.height),
  });
})()`;

const report = { findings: [], checks: [] };
const note = (ok, label, detail) => {
  report.checks.push({ ok, label, detail });
  if (!ok) report.findings.push(label + ' :: ' + detail);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ->  ' + detail : ''}`);
};

await send('Page.enable'); await send('Runtime.enable'); await send('Input.enable').catch(() => {});

// ===========================================================================
console.log('\n--- 1. Keyboard sweep, provider form (SC 2.1.1, 2.4.3, 2.4.7) ---');
await goto('/#/report');
await ev(`[...document.querySelectorAll('label.option')].find(l=>l.textContent.trim()==='Healthcare provider').querySelector('input').click()`);
await sleep(700);
await ev(`document.activeElement.blur(); window.scrollTo(0,0)`);

// Stamp each element on first visit so a genuine cycle is detectable. Comparing
// by tag+class breaks immediately on the nav, whose links share an empty class.
await ev(`document.querySelectorAll('[data-audit]').forEach(e=>e.removeAttribute('data-audit'))`);
const seen = [];
let noOutline = [];
let cycled = false;
for (let i = 0; i < 120; i++) {
  await tab();
  const d = JSON.parse(await ev(DESCRIBE));
  if (d.tag === 'BODY') break;
  const already = await ev(
    "(() => { const a = document.activeElement;"
    + " if (!a || a === document.body) return 'body';"
    + " if (a.hasAttribute('data-audit')) return 'seen';"
    + " a.setAttribute('data-audit','1'); return 'new'; })()");
  if (already === undefined) { console.log('   !! stamp expression errored'); break; }
  if (already !== 'new') { cycled = true; break; }
  const sig = `${d.tag}#${d.id || ''}.${d.cls}`;
  seen.push({ sig, ...d });
  const hasOutline = d.outline && !/^none/.test(d.outline) && !/ 0px /.test(d.outline);
  if (!hasOutline && !d.boxShadow) noOutline.push(`${sig} "${d.name}"`);
}
console.log(`   (swept ${seen.length} stops, cycled back to start: ${cycled})`);
note(seen.length > 20, 'Tab reaches the whole form', `${seen.length} focusable stops`);
note(noOutline.length === 0, 'Every focused element shows an indicator (SC 2.4.7)',
  noOutline.length ? noOutline.slice(0, 6).join(' | ') : 'all stops had outline or shadow');
const invisible = seen.filter((s) => !s.visible);
note(invisible.length === 0, 'No focus stop is invisible', invisible.map((s) => s.sig).join(' | ') || 'none');
report.tabStops = seen.map((s) => `${s.tag}${s.id ? '#' + s.id : ''} "${s.name}"`);

// New controls added today must be in the tab order.
note(seen.some((s) => s.cls.includes('tip-toggle')), 'Tooltip toggles are keyboard reachable', '');
// The chips are unclassed buttons inside .progress-item, so identify them by
// their accessible name, which is also what a screen reader announces.
const chipStops = seen.filter((s) => /(not started|in progress|optional|complete)/.test(s.nameFull));
note(chipStops.length > 0, 'Completion status controls are keyboard reachable', chipStops.length + ' stops');
note(chipStops.every((s) => /\d+ of \d+ required|optional/.test(s.nameFull)),
  'Completion status announces state in text, not colour', chipStops[0] ? chipStops[0].name : 'none');

// ===========================================================================
console.log('\n--- 2. FAQ dialog: focus in, Escape out, focus returns (SC 2.1.2) ---');
await goto('/#/report');
await ev(`[...document.querySelectorAll('button')].find(b=>/help.*faq/i.test(b.textContent)).focus()`);
const opener = await ev(`document.activeElement.textContent.trim()`);
await ev(`document.activeElement.click()`);
await sleep(700);
const inDialog = await ev(`(() => { const d=document.querySelector('[role="dialog"]'); return !!(d && d.contains(document.activeElement)); })()`);
note(inDialog, 'Opening the dialog moves focus inside it', String(inDialog));

// Tab many times: focus must never escape the dialog.
let escaped = false;
for (let i = 0; i < 25; i++) {
  await tab();
  const still = await ev(`(() => { const d=document.querySelector('[role="dialog"]'); return !!(d && d.contains(document.activeElement)); })()`);
  if (!still) { escaped = true; break; }
}
note(!escaped, 'Focus stays trapped while the dialog is open', escaped ? 'focus escaped the dialog' : 'held for 25 tabs');

await esc();
await sleep(600);
const closed = await ev(`!document.querySelector('[role="dialog"]')`);
note(closed, 'Escape closes the dialog', String(closed));
const returned = await ev(`(document.activeElement.textContent || '').trim()`);
note(returned === opener, 'Focus returns to the control that opened it', `expected "${opener}", got "${returned}"`);

// ===========================================================================
console.log('\n--- 3. Text resize to 200 percent (SC 1.4.4) ---');
await goto('/#/report');
await ev(`[...document.querySelectorAll('label.option')].find(l=>l.textContent.trim()==='Healthcare provider').querySelector('input').click()`);
await sleep(600);
const before = await ev(`document.querySelectorAll('.field').length`);
await ev(`document.documentElement.style.fontSize = '200%'`);
await sleep(900);
const after = await ev(`document.querySelectorAll('.field').length`);
const zoom = JSON.parse(await ev(String.raw`(() => {
  const de = document.documentElement;
  window.scrollTo(500,0); const sx = Math.round(window.scrollX); window.scrollTo(0,0);
  const clipped = [...document.querySelectorAll('.field-label, .btn, .section-title')]
    .filter(e => { const s = getComputedStyle(e); return s.overflow === 'hidden' && e.scrollWidth > e.clientWidth + 2; })
    .map(e => (e.className||'') + ':' + (e.textContent||'').trim().slice(0,26));
  return JSON.stringify({ horizontalScroll: sx > 0, clipped: clipped.slice(0,6) });
})()`));
note(after === before, 'No content lost at 200 percent', `${before} fields before, ${after} after`);
note(!zoom.horizontalScroll, 'No horizontal scrolling at 200 percent', zoom.horizontalScroll ? 'page scrolls sideways' : 'none');
note(zoom.clipped.length === 0, 'No text clipped at 200 percent', zoom.clipped.join(' | ') || 'none');
await ev(`document.documentElement.style.fontSize = ''`);

// ===========================================================================
console.log('\n--- 4. Error announcement live region (SC 3.3.1) ---');
await goto('/#/report');
await ev(`[...document.querySelectorAll('label.option')].find(l=>l.textContent.trim()==='Patient, parent, or caregiver').querySelector('input').click()`);
await sleep(600);
await ev(`[...document.querySelectorAll('button')].find(b=>/review submission/i.test(b.textContent)).click()`);
await sleep(900);
const live = JSON.parse(await ev(String.raw`(() => {
  const alerts = [...document.querySelectorAll('[role="alert"],[aria-live]')];
  return JSON.stringify({
    count: alerts.length,
    summaryIsAlert: !!document.querySelector('.error-summary[role="alert"]'),
    summaryFocused: document.activeElement === document.querySelector('.error-summary'),
    perFieldAlerts: document.querySelectorAll('.field-error[role="alert"]').length,
  });
})()`));
note(live.summaryIsAlert, 'Error summary is an alert region', String(live.summaryIsAlert));
note(live.summaryFocused, 'Focus moves to the error summary (SC 2.4.3)', String(live.summaryFocused));
note(live.perFieldAlerts > 0, 'Each field error is announced', `${live.perFieldAlerts} field alerts`);

// ===========================================================================
console.log('\n--- 5. Authoring tool cannot inject markup (508 504.2) ---');
await goto('/#/admin');
await sleep(800);
await ev(`(() => {
  const p = document.querySelector('input[type=password]');
  if (p) {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    set.call(p, 'admin'); p.dispatchEvent(new Event('input',{bubbles:true}));
    const b = [...document.querySelectorAll('button')].find(b=>/sign in|log in/i.test(b.textContent));
    if (b) b.click();
  }
  return true;
})()`);
await sleep(1200);
const PAYLOAD = '<img src=x onerror=window.__XSS=1><b>BOLD</b>';
const injected = await ev(`(() => {
  // A question label editor specifically, not whichever input renders first.
  const inp = document.querySelector('input[aria-label^="Label for"]');
  if (!inp) return 'no editor input found';
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  set.call(inp, ${JSON.stringify(PAYLOAD)});
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  return 'set';
})()`);
await sleep(1000);
const inject = JSON.parse(await ev(String.raw`(() => JSON.stringify({
  xssFired: !!window.__XSS,
  boldElements: document.querySelectorAll('.vaers-form b, .admin-preview b, b').length,
  renderedAsText: document.body.innerText.includes('<b>BOLD</b>') || document.body.innerText.includes('onerror'),
}))()`));
note(injected === 'set', 'Reached an authoring input', injected);
note(!inject.xssFired, 'Authored markup does not execute', `xss fired: ${inject.xssFired}`);
note(inject.boldElements === 0, 'Authored markup is not parsed as HTML', `${inject.boldElements} <b> elements created`);
note(inject.renderedAsText, 'Authored markup renders as literal text', String(inject.renderedAsText));

// ===========================================================================
console.log('\n--- 6. Landing page exists (SC 2.4.5 claim is stale?) ---');
await goto('/#/');
const landing = JSON.parse(await ev(String.raw`(() => JSON.stringify({
  hasLanding: !!document.querySelector('.landing'),
  navLinks: document.querySelectorAll('.site-nav a').length,
  h1: (document.querySelector('h1')||{}).textContent || null,
  wayfinding: document.querySelectorAll('.landing a[href], .landing .link-tile').length,
}))()`));
note(landing.hasLanding, 'Landing page is implemented', JSON.stringify(landing));

writeFileSync(`${OUT}/a11y_audit.json`, JSON.stringify(report, null, 2));
console.log('\n============================================');
console.log(`CHECKS: ${report.checks.length}   FAILURES: ${report.findings.length}`);
report.findings.forEach((f) => console.log('  !! ' + f));
console.log('\nTAB ORDER (first 30):');
report.tabStops.slice(0, 30).forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}. ${s}`));

ws.close(); chrome.kill(); process.exit(0);
