const fs = require('node:fs'),
  path = require('node:path'),
  http = require('node:http'),
  os = require('node:os'),
  assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const WebSocket = require('ws');
const root = path.resolve(__dirname, '..'),
  dist = path.join(root, 'dist');
const pictures = path.join(root, 'scratch/meeting-preview.tmp');
const slug = 'aprimoramento-musical-2026-11-28',
  churches = ['1'.repeat(32), '2'.repeat(32)];
const catalog = {
  evento: {
    slug,
    titulo: 'Reunião de Aprimoramento Musical',
    data: '2026-11-28',
    local: 'Central de Itapevi',
    horario: null,
    aberto: true,
  },
  municipios: [
    {
      id: 'ITAPEVI',
      nome: 'ITAPEVI',
      comuns: [
        { id: churches[0], nome: 'BR-21-0001 - CENTRAL - ITAPEVI' },
        { id: '3'.repeat(32), nome: 'BR-21-0003 - VILA SÃO JOÃO - ITAPEVI' },
      ],
    },
    {
      id: 'COTIA',
      nome: 'COTIA',
      comuns: [{ id: churches[1], nome: 'BR-22-0001 - CENTRAL - COTIA' }],
    },
  ],
};
const requests = [],
  confirmations = [];
const savedRecords = new Map();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label) {
  const end = Date.now() + 60000;
  while (Date.now() < end) {
    try {
      const value = await fn();
      if (value) return value;
    } catch {}
    await pause(150);
  }
  throw new Error('Timeout: ' + label);
}
(async () => {
  fs.mkdirSync(pictures, { recursive: true });
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ccb-meeting-browser-'));
  let origin;
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    requests.push(url.pathname);
    if (url.pathname === '/config.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(
        'window.APP_CONFIG=' +
          JSON.stringify({
            SUPABASE_URL: origin + '/mock',
            SUPABASE_ANON_KEY: 'public-test-key',
            SHEETS_ENDPOINT_URL: origin + '/mock/sheets',
            REGIONAL_NAME: 'Regional Itapevi',
          })
      );
      return;
    }
    if (url.pathname === '/mock/sheets') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const input = JSON.parse(raw);
      assert.equal(input.sheet, 'Dados');
      assert.ok(input.data.UUID);
      assert.ok(['JOÃO DE TESTE', 'MANOEL LUIZ'].includes(input.data['NOME COMPLETO']));
      if (input.data['NOME COMPLETO'] === 'JOÃO DE TESTE') {
        assert.equal(input.data['NÍVEL'], 'OFICIALIZADO');
        assert.equal(input.data.INSTRUMENTO, 'VIOLINO');
        assert.equal(input.data.NAIPE_INSTRUMENTO, 'CORDAS');
      }
      if (input.data['NOME COMPLETO'] === 'MANOEL LUIZ')
        assert.equal(input.data.ANOTACOES, 'SAM Desatualizado');
      await pause(1200);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          uuid: input.data.UUID,
          diag: {
            master: {
              ok: true,
              id: '1LGoW7lbYS4crpEdTfGR2evuH9kArZgqrvVbmi6buBoQ',
              sheet: 'Dados',
            },
          },
        })
      );
      return;
    }
    if (url.pathname === '/mock/rest/v1/cadastro') {
      assert.equal(url.searchParams.get('id'), 'eq.test-person');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify([
          {
            id: 'test-person',
            nome: 'JOÃO DE TESTE',
            cidade: 'ITAPEVI',
            comum: catalog.municipios[0].comuns[0].nome,
            cargo: 'MÚSICO',
            instrumento: 'VIOLINO',
            nivel: 'OFICIALIZADO(A)',
          },
        ])
      );
      return;
    }
    if (url.pathname === '/mock/rest/v1/presencas') {
      res.setHeader('Content-Type', 'application/json');
      if (req.method !== 'POST') {
        const record = savedRecords.get((url.searchParams.get('uuid') || '').replace(/^eq\./, ''));
        res.end(JSON.stringify(record ? [record] : []));
        return;
      }
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const input = JSON.parse(raw);
      confirmations.push(input);
      assert.equal(input.cidade, 'ITAPEVI');
      assert.equal(input.comum, catalog.municipios[0].comuns[0].nome);
      if (confirmations.length === 1) {
        res.statusCode = 503;
        res.end(JSON.stringify({ message: 'temporary_test_failure' }));
      } else {
        savedRecords.set(input.uuid, input);
        res.end(JSON.stringify([input]));
      }
      return;
    }
    if (url.pathname.startsWith('/mock/rest/v1/rpc/')) {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const input = JSON.parse(raw);
      assert.equal(input.p_evento, slug);
      let data,
        status = 200;
      if (url.pathname.endsWith('ram_public_catalog')) data = catalog;
      else if (url.pathname.endsWith('ram_public_people')) {
        const good = input.p_municipio === 'ITAPEVI' && input.p_comum === churches[0];
        data =
          good && !/manoel/i.test(input.p_busca)
            ? [{ id: 'test-person', nome: 'JOÃO DE TESTE', cargo: 'MÚSICO' }]
            : [];
      } else if (url.pathname.endsWith('ram_public_confirm')) {
        confirmations.push(input);
        assert.equal(input.p_municipio, 'ITAPEVI');
        assert.equal(input.p_comum, churches[0]);
        assert.ok(['test-person', 'manual_Manoel Luiz'].includes(input.p_pessoa));
        if (confirmations.length === 1) {
          status = 503;
          data = { message: 'temporary_test_failure' };
        } else
          data = {
            id: 'test-receipt',
            confirmado_em: '2026-11-19T15:00:00Z',
            ja_confirmado: false,
          };
      }
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
      return;
    }
    const relative = decodeURIComponent(url.pathname).replace(/^\//, '');
    const candidate = path.resolve(dist, relative || 'index.html');
    const file =
      candidate.startsWith(dist + path.sep) &&
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isFile()
        ? candidate
        : path.join(dist, 'index.html');
    const types = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.ttf': 'font/ttf',
      '.ico': 'image/x-icon',
    };
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  const profile = path.join(base, 'profile');
  const browser = spawn(
    process.env.PWA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      '--user-data-dir=' + profile,
      'about:blank',
    ],
    { stdio: 'ignore', windowsHide: true }
  );
  let ws, debug;
  try {
    const info = await until(
      () =>
        fs.existsSync(path.join(profile, 'DevToolsActivePort')) &&
        fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n'),
      'Chromium'
    );
    ws = new WebSocket('ws://127.0.0.1:' + info[0] + info[1]);
    await new Promise((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });
    let id = 0,
      session;
    const pending = new Map();
    ws.on('message', raw => {
      const message = JSON.parse(raw);
      if (pending.has(message.id)) {
        const item = pending.get(message.id);
        pending.delete(message.id);
        message.error
          ? item.reject(new Error(JSON.stringify(message.error)))
          : item.resolve(message.result);
      }
    });
    const send = (method, params = {}, target = session) =>
      new Promise((resolve, reject) => {
        const key = ++id;
        pending.set(key, { resolve, reject });
        ws.send(
          JSON.stringify({ id: key, method, params, ...(target ? { sessionId: target } : {}) })
        );
      });
    const target = await send('Target.createTarget', { url: 'about:blank' });
    session = (await send('Target.attachToTarget', { targetId: target.targetId, flatten: true }))
      .sessionId;
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.bringToFront');
    await send('Network.enable');
    await send('Network.setBlockedURLs', {
      urls: [
        'https://fonts.googleapis.com/*',
        'https://fonts.gstatic.com/*',
        'https://va.vercel-scripts.com/*',
        'https://*.vercel-insights.com/*',
      ],
    });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    debug = async () => {
      console.log(
        JSON.stringify({
          requests: requests.slice(-15),
          page: await evaluate(
            '({text:document.body.innerText,path:location.pathname,config:window.APP_CONFIG&&window.APP_CONFIG.SUPABASE_URL})'
          ),
        })
      );
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(pictures, 'debug.png'), Buffer.from(shot.data, 'base64'));
    };
    const metrics = async (width, height, mobile = false) =>
      send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    const snapshot = async name => {
      const shot = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      fs.writeFileSync(path.join(pictures, name + '.png'), Buffer.from(shot.data, 'base64'));
    };
    const select = async (id, value) => {
      await evaluate('document.getElementById(' + JSON.stringify(id) + ').click()');
      const selector = '[data-option-id="' + value + '"]';
      await until(
        () => evaluate('!!document.querySelector(' + JSON.stringify(selector) + ')'),
        'municipality options'
      );
      await evaluate('document.querySelector(' + JSON.stringify(selector) + ').click()');
    };
    const type = async (value, id = 'ram-person') =>
      evaluate(
        '(function(){const e=document.getElementById(' +
          JSON.stringify(id) +
          ');e.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(e,' +
          JSON.stringify(value) +
          ');e.dispatchEvent(new Event("input",{bubbles:true}));})()'
      );
    const chooseChurch = async id => {
      await type('central', 'ram-church');
      await until(
        () => evaluate('!!document.querySelector(\'[data-church-id="' + id + '"]\')'),
        'church search result'
      );
      await evaluate('document.querySelector(\'[data-church-id="' + id + '"]\').click()');
    };
    await metrics(1024, 1050);
    await send('Page.navigate', { url: origin + '/confirmar-presenca' });
    await until(
      () =>
        evaluate(
          '!!document.getElementById("ram-city") && !document.getElementById("ram-city").disabled'
        ),
      'public catalog'
    );
    assert.equal(await evaluate('!!document.querySelector("input[type=password]")'), false);
    await snapshot('desktop');
    await metrics(375, 812, true);
    await pause(400);
    assert.equal(
      await evaluate('document.querySelector(".ram-page").scrollWidth <= window.innerWidth'),
      true
    );
    await snapshot('mobile');
    await metrics(320, 700, true);
    await pause(200);
    assert.equal(
      await evaluate('document.querySelector(".ram-page").scrollWidth <= window.innerWidth'),
      true
    );
    await select('ram-city', 'ITAPEVI');
    await until(
      () => evaluate('!document.getElementById("ram-church").disabled'),
      'church enabled'
    );
    await type('sao joao', 'ram-church');
    await until(
      () => evaluate('document.querySelectorAll("[data-church-id]").length === 1'),
      'accent-insensitive church search'
    );
    assert.equal(
      await evaluate('document.querySelector("[data-church-id]").getAttribute("data-church-id")'),
      '3'.repeat(32)
    );
    await until(
      () =>
        evaluate(
          'document.querySelector("[data-church-id]").getBoundingClientRect().bottom <= window.innerHeight'
        ),
      'church search result visible on mobile'
    );
    await snapshot('church-search-mobile');
    await type('inexistente', 'ram-church');
    await until(
      () => evaluate('document.body.innerText.includes("Nenhuma comum encontrada")'),
      'empty church search'
    );
    assert.equal(await evaluate('document.getElementById("ram-person").disabled'), true);
    await type('central', 'ram-church');
    await until(() => evaluate('!!document.querySelector("[data-church-id]")'), 'central search');
    await evaluate(
      'document.getElementById("ram-church").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}))'
    );
    await until(() => evaluate('!document.getElementById("ram-person").disabled'), 'name enabled');
    await type('jo');
    await until(() => evaluate('!!document.querySelector("[role=option]")'), 'name results');
    await evaluate('document.querySelector("[role=option]").click()');
    await until(
      () => evaluate('!document.querySelector(".ram-primary").disabled'),
      'selected person'
    );
    await select('ram-city', 'COTIA');
    await until(
      () =>
        evaluate(
          'document.getElementById("ram-person").value === "" && document.querySelector(".ram-primary").disabled && document.getElementById("ram-church").value === ""'
        ),
      'dependent reset'
    );
    await type('', 'ram-church');
    await until(
      () => evaluate('document.querySelectorAll("[data-church-id]").length === 1'),
      'municipality-scoped churches'
    );
    assert.equal(
      await evaluate('document.querySelector("[data-church-id]").getAttribute("data-church-id")'),
      churches[1]
    );
    await select('ram-city', 'ITAPEVI');
    await chooseChurch(churches[0]);
    await type('jo');
    await until(() => evaluate('!!document.querySelector("[role=option]")'), 'repeat name search');
    await evaluate('document.querySelector("[role=option]").click()');
    await until(
      () => evaluate('!document.querySelector(".ram-primary").disabled'),
      'selected again'
    );
    await evaluate(
      '(function(){const button=document.querySelector(".ram-primary");button.click();button.click();})()'
    );
    await until(
      () => evaluate('!!document.querySelector(".ram-success")'),
      'original confirmation shown immediately'
    );
    assert.equal(
      await evaluate('Object.keys(localStorage).some(key => key.startsWith("ram-pending-v1:"))'),
      true
    );
    assert.equal(await evaluate('!!document.querySelector("[data-queue-pending]")'), false);
    assert.equal(savedRecords.size, 0);
    await snapshot('success-background-mobile');
    await evaluate('document.querySelector(".ram-secondary").click()');
    await until(
      () => evaluate('document.getElementById("ram-person").value === ""'),
      'next person available immediately'
    );
    assert.equal(await evaluate('document.getElementById("ram-church").value !== ""'), true);
    await type('Manoel Luiz');
    await until(
      () => evaluate('!document.querySelector(".ram-primary").disabled'),
      'next person ready while first delivery is pending'
    );
    await evaluate('document.querySelector(".ram-primary").click()');
    await until(
      () => evaluate('!!document.querySelector(".ram-success")'),
      'second original confirmation'
    );
    await until(
      () =>
        evaluate(
          'Object.keys(localStorage).filter(key => key.startsWith("ram-pending-v1:")).length === 0'
        ),
      'background retry delivers both registrations'
    );
    assert.equal(savedRecords.size, 2);
    assert.equal(confirmations.length, 3);
    assert.equal(requests.filter(url => url === '/mock/sheets').length, 3);
    await evaluate('document.querySelector(".ram-secondary").click()');
    await type('Manoel Luiz');
    await until(
      () => evaluate('!document.querySelector(".ram-primary").disabled'),
      'duplicate ready'
    );
    await evaluate('document.querySelector(".ram-primary").click()');
    await until(
      () =>
        evaluate(
          '!!document.querySelector(".ram-success") && Object.keys(localStorage).filter(key => key.startsWith("ram-pending-v1:")).length === 0'
        ),
      'duplicate confirmed without another insertion'
    );
    assert.equal(confirmations.length, 3);
    assert.equal(requests.filter(url => url === '/mock/sheets').length, 3);
    assert.equal(await evaluate('!!document.querySelector(".swal2-toast")'), false);
    await snapshot('background-completed-mobile');
    assert.equal(
      requests.some(url => /ram_public_confirm|confirmacoes_reuniao/.test(url)),
      false
    );
    console.log(
      JSON.stringify(
        {
          passed: true,
          publicWithoutLogin: true,
          dependentFields: true,
          scopedNameSearch: true,
          retryPreservesQueuedRegistration: true,
          backgroundDelivery: true,
          doubleSubmitBlocked: true,
          receiptVerified: true,
          mobileWidths: [320, 375],
          screenshots: pictures,
        },
        null,
        2
      )
    );
  } catch (error) {
    if (debug) await debug();
    throw error;
  } finally {
    if (ws) ws.close();
    browser.kill();
    await new Promise(resolve => server.close(resolve));
    await pause(1000);
    if (
      path.dirname(base) === path.resolve(os.tmpdir()) &&
      path.basename(base).startsWith('ccb-meeting-browser-')
    ) {
      try {
        fs.rmSync(base, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
      } catch {}
    }
  }
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
