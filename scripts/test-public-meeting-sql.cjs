const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(
  path.resolve(__dirname, '../scratch/meeting-sql-test.tmp/node_modules/@electric-sql/pglite')
);
(async () => {
  const db = new PGlite();
  let checks = 0;
  try {
    await db.exec(
      'create role anon; create role authenticated; create role service_role; create table public.cadastro(id text primary key,nome text,comum text,cidade text,cargo text);'
    );
    await db.exec('create table public.presencas(uuid uuid primary key,nome_completo text,cidade text,comum text,cargo text,local_ensaio text,data_ensaio timestamptz,registrado_por text,created_at timestamptz)');
    await db.query(
      'insert into public.cadastro values ($1,$2,$3,$4,$5),($6,$7,$8,$9,$10),($11,$12,$13,$14,$15)',
      [
        'test-1',
        'JOÃO DE TESTE',
        'BR-21-0001 - CENTRAL - ITAPEVI',
        'ITAPEVI',
        'MÚSICO',
        'test-2',
        'MARIA DE TESTE',
        'BR-22-0001 - CENTRAL - COTIA',
        'COTIA',
        'ORGANISTA',
        'test-3',
        'JOÃO DE TESTE',
        'BR-21-0001 - CENTRAL - ITAPEVI',
        'ITAPEVI',
        'MÚSICO',
      ]
    );
    const sql = fs.readFileSync(
      path.join(__dirname, '../docs/REUNIAO_APRIMORAMENTO_2026-11-28.sql'),
      'utf8'
    );
    await db.exec(sql);
    checks++;
    await db.exec(sql);
    checks++; // migration must be safe to run again
    await db.exec("update public.reunioes_publicas set encerramento=now()+interval '1 day'");
    await db.exec('grant insert on public.cadastro to anon; set role anon');
    await db.query('insert into public.cadastro values ($1,$2,$3,$4,$5)', [
      'index-check',
      'INDEX CHECK',
      'BR-21-0001 - CENTRAL - ITAPEVI',
      'ITAPEVI',
      'MÚSICO',
    ]);
    checks++;
    const event = 'aprimoramento-musical-2026-11-28';
    const { rows } = await db.query('select public.ram_public_catalog($1) as value', [event]);
    const catalog = rows[0].value;
    assert.equal(catalog.evento.aberto, true);
    assert.equal(catalog.municipios.length, 2);
    checks++;
    const itapevi = catalog.municipios.find(city => city.id === 'ITAPEVI');
    const cotia = catalog.municipios.find(city => city.id === 'COTIA');
    assert.notEqual(itapevi.comuns[0].id, cotia.comuns[0].id);
    checks++;
    const search = async (city, church, term) =>
      (
        await db.query('select public.ram_public_people($1,$2,$3,$4) as value', [
          event,
          city,
          church,
          term,
        ])
      ).rows[0].value;
    const people = await search('ITAPEVI', itapevi.comuns[0].id, 'joao');
    assert.equal(people.length, 1);
    assert.equal(people[0].id, 'test-1');
    checks++;
    assert.deepEqual(await search('COTIA', itapevi.comuns[0].id, 'joao'), []);
    checks++;
    assert.deepEqual(await search('ITAPEVI', itapevi.comuns[0].id, '%'), []);
    checks++;
    const confirm = async (city, church, person) =>
      (
        await db.query('select public.ram_public_confirm($1,$2,$3,$4) as value', [
          event,
          city,
          church,
          person,
        ])
      ).rows[0].value;
    await assert.rejects(confirm('COTIA', cotia.comuns[0].id, 'test-1'), /PARTICIPANTE_INVALIDO/);
    checks++;
    const first = await confirm('ITAPEVI', itapevi.comuns[0].id, 'test-1');
    assert.equal(first.ja_confirmado, false);
    assert.ok(first.id);
    checks++;
    const retry = await confirm('ITAPEVI', itapevi.comuns[0].id, 'test-1');
    assert.equal(retry.id, first.id);
    assert.equal(retry.ja_confirmado, true);
    checks++;
    const duplicateIdentity = await confirm('ITAPEVI', itapevi.comuns[0].id, 'test-3');
    assert.equal(duplicateIdentity.id, first.id);
    checks++;
    await assert.rejects(
      db.query('select * from public.confirmacoes_reuniao'),
      /permission denied/
    );
    checks++;
    await assert.rejects(db.query('delete from public.confirmacoes_reuniao'), /permission denied/);
    checks++;
    const manual = await confirm('ITAPEVI', itapevi.comuns[0].id, 'manual_MANOEL LUIZ');
    const manualRetry = await confirm('ITAPEVI', itapevi.comuns[0].id, 'manual_  manoel   luiz  ');
    assert.equal(manualRetry.id, manual.id);
    assert.equal(manualRetry.ja_confirmado, true);
    const existingManual = await confirm('ITAPEVI', itapevi.comuns[0].id, 'manual_JOAO DE TESTE');
    assert.equal(existingManual.id, first.id);
    await assert.rejects(confirm('ITAPEVI', itapevi.comuns[0].id, 'manual_AB'), /PARTICIPANTE_INVALIDO/);
    await assert.rejects(confirm('ITAPEVI', cotia.comuns[0].id, 'manual_MANOEL LUIZ'), /PARTICIPANTE_INVALIDO/);
    await db.exec('reset role');
    const manualRow = (await db.query('select * from public.presencas where uuid=$1', [manual.id])).rows[0];
    assert.equal(manualRow.nome_completo, 'MANOEL LUIZ');
    assert.equal(manualRow.cidade, 'ITAPEVI');
    assert.equal(manualRow.anotacoes, 'SAM Desatualizado');
    assert.equal((await db.query('select count(*)::int as count from public.cadastro where nome=$1', ['MANOEL LUIZ'])).rows[0].count, 0);
    await db.query('delete from public.presencas where uuid=$1', [manual.id]);
    checks += 8;
    assert.equal(
      (await db.query('select count(*)::int as count from public.presencas')).rows[0]
        .count,
      1
    );
    checks++;
    assert.equal((await db.query('select count(*)::int as count from public.confirmacoes_reuniao')).rows[0].count, 0);
    checks++;
    const report = await db.query(
      fs.readFileSync(
        path.join(__dirname, '../docs/LISTA_CONFIRMACOES_REUNIAO_2026-11-28.sql'),
        'utf8'
      )
    );
    assert.equal(report.rows.length, 1);
    assert.equal(report.rows[0]['Nome completo'], 'JOÃO DE TESTE');
    assert.equal(report.rows[0]['Presença no dia'], '');
    checks++;
    await db.exec(sql);
    assert.equal((await db.query('select count(*)::int as count from public.presencas')).rows[0].count, 1);
    await db.query('delete from public.presencas where uuid=$1', [first.id]);
    await db.exec(sql);
    assert.equal((await db.query('select count(*)::int as count from public.presencas')).rows[0].count, 0);
    checks += 2;
    await db.exec('update public.reunioes_publicas set inscricoes_abertas=false; set role anon');
    await assert.rejects(
      confirm('ITAPEVI', itapevi.comuns[0].id, 'test-1'),
      /INSCRICOES_ENCERRADAS/
    );
    checks++;
    assert.equal(
      (await db.query('select public.ram_public_catalog($1) as value', [event])).rows[0].value
        .evento.aberto,
      false
    );
    checks++;
    console.log(
      JSON.stringify({ passed: true, checks, engine: 'PostgreSQL/PGlite', productionData: false })
    );
  } finally {
    await db.close();
  }
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
