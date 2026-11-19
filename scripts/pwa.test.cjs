const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { preparePwa } = require('./prepare-pwa.cjs');
const root = path.resolve(__dirname, '..');

function fixture() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ccb-pwa-'));
  fs.mkdirSync(path.join(folder, 'assets'));
  for (const name of ['sw.js', 'pwa-update.js'])
    fs.copyFileSync(path.join(root, 'public', name), path.join(folder, name));
  for (const [name, value] of Object.entries({
    'index.html': '<html>release</html>',
    'config.js': 'window.APP_CONFIG={}',
    'manifest.json': '{}',
    'assets/app.js': 'app-v1',
  }))
    fs.writeFileSync(path.join(folder, name), value);
  return folder;
}
test('every content change produces a new service worker identity without a manual cache bump', () => {
  const first = fixture(),
    second = fixture();
  try {
    const a = preparePwa(first, '1.5.2');
    fs.writeFileSync(path.join(second, 'assets/app.js'), 'app-v2');
    const b = preparePwa(second, '1.5.2');
    assert.notEqual(a.buildId, b.buildId);
    assert.ok(a.assets.includes('/assets/app.js'));
    assert.ok(!fs.readFileSync(path.join(first, 'sw.js'), 'utf8').includes('__PWA_'));
    assert.ok(!fs.readFileSync(path.join(first, 'pwa-update.js'), 'utf8').includes('__PWA_'));
    assert.equal(JSON.parse(fs.readFileSync(path.join(first, 'release.json'))).version, '1.5.2');
  } finally {
    for (const folder of [first, second]) {
      assert.equal(path.dirname(folder), path.resolve(os.tmpdir()));
      assert.ok(path.basename(folder).startsWith('ccb-pwa-'));
      fs.rmSync(folder, { recursive: true });
    }
  }
});
function worker(options = {}) {
  const events = {},
    stores = new Map(),
    deleted = [];
  let skipped = 0,
    claimed = 0;
  const keyOf = key => new URL(typeof key === 'string' ? key : key.url, 'https://example.test').pathname;
  const cache = {
    put: async (key, value) => stores.set(keyOf(key), value),
    match: async key => stores.get(keyOf(key)),
  };
  const context = {
    self: {
      location: { origin: 'https://example.test' },
      addEventListener: (type, fn) => (events[type] = fn),
      skipWaiting: async () => skipped++,
      clients: { claim: async () => claimed++ },
    },
    caches: {
      open: async () => cache,
      keys: async () => [
        'unrelated-cache',
        'ccb-contagem-build-oldest',
        'ccb-contagem-build-previous',
        'ccb-contagem-build-test',
      ],
      delete: async name => deleted.push(name),
    },
    Request: class {
      constructor(url) {
        this.url = url;
      }
    },
    Response: { error: () => ({ networkError: true }) },
    URL,
    fetch:
      options.fetch ||
      (async () => ({ ok: true, headers: { get: () => 'application/javascript' } })),
  };
  vm.runInNewContext(
    fs
      .readFileSync(path.join(root, 'public/sw.js'), 'utf8')
      .replace('__PWA_BUILD_ID__', 'test')
      .replace(/(['"])__PWA_ASSETS__\1/, JSON.stringify(['/index.html', '/assets/app.js'])),
    context
  );
  return {
    events,
    stores,
    deleted,
    get skipped() {
      return skipped;
    },
    get claimed() {
      return claimed;
    },
  };
}
async function lifecycle(worker, type) {
  let promise;
  worker.events[type]({ waitUntil: value => (promise = value) });
  await promise;
}
test('new release activates only after ALL required files have been cached', async () => {
  const w = worker();
  await lifecycle(w, 'install');
  assert.equal(w.stores.size, 2);
  assert.equal(w.skipped, 1);
});
test('incomplete download keeps the existing worker active', async () => {
  const w = worker({
    fetch: async () => {
      throw new Error('offline');
    },
  });
  await assert.rejects(lifecycle(w, 'install'), /offline/);
  assert.equal(w.skipped, 0);
});
test('SPA HTML returned for a missing bundle rejects the release', async () => {
  const w = worker({ fetch: async () => ({ ok: true, headers: { get: () => 'text/html' } }) });
  await assert.rejects(lifecycle(w, 'install'), /asset unavailable/);
  assert.equal(w.skipped, 0);
});
test('activation preserves prior release and unrelated data caches', async () => {
  const w = worker();
  await lifecycle(w, 'activate');
  assert.deepEqual(w.deleted, ['ccb-contagem-build-oldest']);
  assert.equal(w.claimed, 1);
});
test('API, third-party and mutation requests never enter the static cache handler', () => {
  const w = worker();
  for (const [url, method] of [
    ['https://example.test/api/records', 'GET'],
    ['https://example.test/records', 'POST'],
    ['https://supabase.co/table', 'GET'],
    ['https://example.test/sw.js', 'GET'],
  ]) {
    w.events.fetch({ request: { url, method }, respondWith: () => assert.fail('intercepted') });
  }
});
test('offline navigation and updater use the installed shell, including PWA start_url query', async () => {
  const w = worker({
    fetch: async () => {
      throw new Error('offline');
    },
  });
  w.stores.set('/index.html', 'cached-shell');
  w.stores.set('/pwa-update.js', 'cached-updater');
  for (const [url, mode, expected] of [
    ['https://example.test/?source=pwa', 'navigate', 'cached-shell'],
    ['https://example.test/pwa-update.js', 'cors', 'cached-updater'],
  ]) {
    let response;
    w.events.fetch({
      request: { url, method: 'GET', mode },
      respondWith: value => (response = value),
    });
    assert.equal(await response, expected);
  }
});

function updater({ blocked = false, ready = true, modal = false, currentBuild = 'new' } = {}) {
  const events = {},
    documentEvents = {},
    workerEvents = {},
    timers = new Map(),
    intervals = [];
  let reloads = 0,
    updates = 0,
    time = 10000,
    serial = 0;
  const document = {
    readyState: 'complete',
    visibilityState: 'visible',
    activeElement: { tagName: 'BODY' },
    querySelector: () => modal,
    querySelectorAll: () => [],
    addEventListener: (type, fn) => (documentEvents[type] = fn),
  };
  const registration = { update: async () => updates++, waiting: null };
  const navigator = {
    onLine: true,
    serviceWorker: {
      controller: { postMessage: (_, ports) => ports[0].reply({ buildId: currentBuild }) },
      addEventListener: (type, fn) => (workerEvents[type] = fn),
      register: async (_url, options) => {
        assert.equal(options.updateViaCache, 'none');
        return registration;
      },
    },
  };
  const window = {
    __pwaAppReady: ready,
    __pwaUpdateBlocked: () => blocked,
    location: { reload: () => reloads++ },
    addEventListener: (type, fn) => (events[type] = fn),
  };
  class Channel {
    constructor() {
      this.port1 = { close() {}, onmessage: null };
      this.port2 = { reply: data => this.port1.onmessage?.({ data }) };
    }
  }
  vm.runInNewContext(
    fs
      .readFileSync(path.join(root, 'public/pwa-update.js'), 'utf8')
      .replace('__PWA_BUILD_ID__', 'old'),
    {
      window,
      document,
      navigator,
      MessageChannel: Channel,
      Date: { now: () => time },
      console,
      setTimeout: fn => {
        timers.set(++serial, fn);
        return serial;
      },
      clearTimeout: id => timers.delete(id),
      setInterval: fn => intervals.push(fn),
    }
  );
  return {
    window,
    document,
    navigator,
    events,
    documentEvents,
    workerEvents,
    intervals,
    get reloads() {
      return reloads;
    },
    get updates() {
      return updates;
    },
    unblock() {
      blocked = false;
      modal = false;
      window.__pwaAppReady = true;
    },
    tick() {
      time += 2500;
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach(fn => fn());
    },
  };
}
const flush = async () => {
  for (let n = 0; n < 12; n++) await Promise.resolve();
};
test('installed app refreshes once automatically after a changed build', async () => {
  const u = updater();
  await flush();
  u.tick();
  u.tick();
  assert.equal(u.reloads, 1);
});
test('first install/current build does not cause a reload loop', async () => {
  const u = updater({ currentBuild: 'old' });
  await flush();
  u.tick();
  assert.equal(u.reloads, 0);
});
for (const reason of ['blocked', 'modal', 'ready'])
  test('defers reload for ' + reason + ' until the app becomes safe', async () => {
    const u = updater({
      blocked: reason === 'blocked',
      modal: reason === 'modal',
      ready: reason !== 'ready',
    });
    await flush();
    u.tick();
    assert.equal(u.reloads, 0);
    u.unblock();
    u.tick();
    assert.equal(u.reloads, 1);
  });
test('focus, reconnect and periodic checks request worker updates', async () => {
  const u = updater({ currentBuild: 'old' });
  await flush();
  const before = u.updates;
  u.documentEvents.visibilitychange();
  await flush();
  u.events.online();
  await flush();
  u.intervals[0]();
  await flush();
  assert.equal(u.updates, before + 3);
});
test('offline and active text focus prevent reload', async () => {
  const u = updater();
  u.navigator.onLine = false;
  await flush();
  u.tick();
  assert.equal(u.reloads, 0);
  u.navigator.onLine = true;
  u.document.activeElement.tagName = 'INPUT';
  u.workerEvents.controllerchange();
  u.tick();
  assert.equal(u.reloads, 0);
  u.document.activeElement.tagName = 'BODY';
  u.tick();
  assert.equal(u.reloads, 1);
});
test('typed autocomplete draft remains protected after losing focus', async () => {
  const u = updater();
  const input = { type: 'text', value: 'unfinished search', getClientRects: () => [1] };
  u.document.querySelectorAll = () => [input];
  await flush();
  u.tick();
  assert.equal(u.reloads, 0);
  input.value = '';
  u.tick();
  assert.equal(u.reloads, 1);
});
test('navigation keeps installed HTML paired with its bundles instead of mixing deployments', async () => {
  const w = worker({ fetch: () => assert.fail('installed navigation must use its cached release') });
  w.stores.set('/index.html', 'installed-release');
  let response;
  w.events.fetch({ request: { url: 'https://example.test/?source=pwa', method: 'GET', mode: 'navigate' }, respondWith: value => response = value });
  assert.equal(await response, 'installed-release');
});
test('version metadata and Vercel build/cache configuration are consistent', () => {
  const pkg = require('../package.json');
  const lock = require('../package-lock.json');
  const vercel = require('../vercel.json');
  assert.equal(pkg.version, '1.5.2');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.ok(fs.readFileSync(path.join(root, 'app.config.js'), 'utf8').includes("version: '" + pkg.version + "'"));
  assert.equal(pkg.scripts['vercel-build'], 'npm run build');
  assert.ok(pkg.scripts.build.includes('prepare-pwa.cjs'));
  assert.ok(vercel.headers.find(header => header.source === '/sw.js').headers.some(header => header.key === 'Cache-Control' && header.value.includes('no-store')));
});
