// Read-only deployment check: never creates attendance records or prints people's names.
const fs = require('node:fs'),
  vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync('public/config.js', 'utf8'), context);
const config = context.window.APP_CONFIG;
const event = 'aprimoramento-musical-2026-11-28';
async function rpc(name, params) {
  const response = await fetch(config.SUPABASE_URL + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: {
      apikey: config.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + config.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_evento: event, ...params }),
    signal: AbortSignal.timeout(25000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error('Public RPC ' + name + ': HTTP ' + response.status + ', code ' + data.code);
  return data;
}
(async () => {
  const catalog = await rpc('ram_public_catalog', {});
  const city = catalog.municipios.find(item => item.id === 'ITAPEVI') || catalog.municipios[0];
  const church = city.comuns.find(item => /CENTRAL/.test(item.nome)) || city.comuns[0];
  const people = await rpc('ram_public_people', {
    p_municipio: city.id,
    p_comum: church.id,
    p_busca: 'an',
  });
  const helper = await fetch(config.SUPABASE_URL + '/rest/v1/rpc/ram_normalize', {
    method: 'POST',
    headers: {
      apikey: config.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + config.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value: 'compatibilidade' }),
    signal: AbortSignal.timeout(25000),
  });
  if (!helper.ok)
    throw new Error(
      'Reexecute a versão atual do SQL: falta a permissão da função pura usada no índice.'
    );
  console.log(
    JSON.stringify({
      ready: true,
      event: catalog.evento,
      municipalities: catalog.municipios.length,
      churches: catalog.municipios.reduce((total, item) => total + item.comuns.length, 0),
      scopedSearchResults: people.length,
      authentication: 'anon',
      attendanceWrites: 0,
      existingCatalogWritesCompatible: true,
    })
  );
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
