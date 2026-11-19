// Real Chromium service-worker integration test. Uses an isolated temporary profile.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const WebSocket = require('ws');
const { preparePwa } = require('./prepare-pwa.cjs');
const root = path.resolve(__dirname, '..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(task, label, timeout = 90000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try { const value = await task(); if (value) return value; } catch {}
    await sleep(250);
  }
  throw new Error('Timeout: ' + label);
}
function makeRelease(folder, name) {
  fs.mkdirSync(path.join(folder, 'assets'), { recursive: true });
  for (const file of ['sw.js', 'pwa-update.js']) fs.copyFileSync(path.join(root, 'public', file), path.join(folder, file));
  fs.writeFileSync(path.join(folder, 'index.html'), '<!doctype html><html><head><title>PWA Test</title></head><body><input id="draft"><div id="version"></div><script src="/assets/app-' + name + '.js"></script><script src="/pwa-update.js" defer></script></body></html>');
  fs.writeFileSync(path.join(folder, 'assets/app-' + name + '.js'), 'window.releaseName=' + JSON.stringify(name) + ';window.__pwaAppReady=true;window.__pwaUpdateBlocked=()=>Boolean(window.busy);document.getElementById("version").textContent=window.releaseName;sessionStorage.loads=Number(sessionStorage.loads||0)+1;');
  fs.writeFileSync(path.join(folder, 'config.js'), 'window.APP_CONFIG={}');
  fs.writeFileSync(path.join(folder, 'manifest.json'), '{}');
  return preparePwa(folder, '1.5.2');
}
(async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ccb-pwa-browser-'));
  const a = path.join(base, 'a'), b = path.join(base, 'b'), c = path.join(base, 'c');
  const releaseA = makeRelease(a, 'A'), releaseB = makeRelease(b, 'B');
  makeRelease(c, 'C');
  fs.unlinkSync(path.join(c, 'assets/app-C.js')); // simulate a broken deployment/download
  let current = a;
  const server = http.createServer((req, res) => {
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, '') || 'index.html';
    const file = path.resolve(current, relative);
    if (!file.startsWith(current + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end('missing'); return; }
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json' }[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store', 'Service-Worker-Allowed': '/' });
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const chrome = process.env.PWA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const profile = path.join(base, 'profile');
  const browser = spawn(chrome, ['--headless', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore', windowsHide: true });
  let ws;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    const info = await until(() => fs.existsSync(portFile) && fs.readFileSync(portFile, 'utf8').split('\n'), 'Chromium debugger');
    ws = new WebSocket('ws://127.0.0.1:' + info[0] + info[1]);
    await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
    let id = 0, session;
    const pending = new Map();
    ws.on('message', raw => {
      const message = JSON.parse(raw);
      if (pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id); pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error))); else resolve(message.result);
      }
    });
    const send = (method, params = {}, target = session) => new Promise((resolve, reject) => {
      const key = ++id; pending.set(key, { resolve, reject });
      ws.send(JSON.stringify({ id: key, method, params, ...(target ? { sessionId: target } : {}) }));
    });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    session = (await send('Target.attachToTarget', { targetId, flatten: true })).sessionId;
    await send('Page.enable'); await send('Runtime.enable'); await send('Page.bringToFront');
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    const url = 'http://127.0.0.1:' + server.address().port + '/?source=pwa';
    await send('Page.navigate', { url });
    await until(() => evaluate('window.releaseName==="A" && !!navigator.serviceWorker.controller'), 'initial installed release');
    await sleep(2500);
    assert.equal(await evaluate('Number(sessionStorage.loads)'), 1, 'first install must not reload');
    await evaluate('localStorage.pendingQueue=JSON.stringify([{id:"preserved-offline-record"}]);window.busy=true;document.getElementById("draft").value="unfinished name";');
    current = b;
    await evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update()).then(()=>true)');
    await until(() => evaluate('new Promise(resolve=>{const c=new MessageChannel();c.port1.onmessage=e=>resolve(e.data.buildId);navigator.serviceWorker.controller.postMessage({type:"GET_BUILD_ID"},[c.port2])})').then(value => value === releaseB.buildId), 'B worker activation');
    await sleep(2500);
    assert.equal(await evaluate('window.releaseName'), 'A', 'must not reload an unfinished form');
    assert.equal(await evaluate('document.getElementById("draft").value'), 'unfinished name');
    await evaluate('window.busy=false;document.getElementById("draft").value="";window.dispatchEvent(new Event("pwa:safety-change"));');
    await until(() => evaluate('window.releaseName==="B"'), 'automatic upgrade to B');
    assert.equal(await evaluate('Number(sessionStorage.loads)'), 2);
    assert.equal(await evaluate('JSON.parse(localStorage.pendingQueue)[0].id'), 'preserved-offline-record');
    current = c;
    await evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update()).then(()=>true)');
    await sleep(4000);
    assert.equal(await evaluate('window.releaseName'), 'B', 'broken release must not replace B');
    current = b;
    await send('Network.enable');
    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await send('Page.reload', { ignoreCache: true });
    await until(() => evaluate('window.releaseName==="B"'), 'offline relaunch');
    assert.equal(await evaluate('JSON.parse(localStorage.pendingQueue)[0].id'), 'preserved-offline-record');
    console.log(JSON.stringify({ passed: true, initialInstallWithoutReload: true, deferredDraft: true, automaticUpgrade: 'A -> B', offlineRestart: true, failedReleaseKeptOldApp: true, queuePreserved: true, buildA: releaseA.buildId, buildB: releaseB.buildId }, null, 2));
  } finally {
    if (ws) ws.close();
    browser.kill();
    await new Promise(resolve => server.close(resolve));
    // Remove only this test's OS temporary directory after Chromium exits.
    await sleep(1000);
    if (path.dirname(base) === path.resolve(os.tmpdir()) && path.basename(base).startsWith('ccb-pwa-browser-')) {
      try { fs.rmSync(base, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 }); } catch {}
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
