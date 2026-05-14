/*
 * Simulacao operacional do ensaio regional.
 *
 * Nao grava em producao. O objetivo e reproduzir o fluxo do dia do evento:
 * chegada de participantes, atendimento por equipe, salvamento local rapido e
 * sincronizacao em segundo plano para Google Sheets/Supabase.
 *
 * Uso:
 *   node scripts/simular_evento_domingo.js
 *   node scripts/simular_evento_domingo.js --stress=1.5 --itapevi-operators=48
 */

const DEFAULTS = {
  itapevi: 2000,
  pirapora: 350,
  // Atendentes efetivamente digitando, nao equipe total.
  // Itapevi ideal do PDF: 14 musicos + 5 organistas + 3 irmandade = 22.
  itapeviOperators: 22,
  piraporaOperators: 4,
  totalWindowMin: 150, // 7h30 a 10h00
  prePeakMin: 70, // 7h30 a 8h40
  peakMin: 20, // 8h40 a 9h00
  postPeakMin: 60, // 9h00 a 10h00
  peakShare: 0.4,
  prePeakShare: 0.3,
  postPeakShare: 0.3,
  outsideRegionalShare: 0.15,
  duplicateShare: 0.015,
  stress: 1,
  burstItapevi: 0,
  burstPirapora: 0,
  seed: 17052026,
};

function parseArgs() {
  const args = { ...DEFAULTS };
  for (const raw of process.argv.slice(2)) {
    const match = raw.match(/^--([^=]+)=(.+)$/);
    if (!match) continue;
    const key = match[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = Number(match[2]);
    if (Number.isFinite(value) && key in args) {
      args[key] = value;
    }
  }
  return args;
}

function mulberry32(seed) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[idx];
}

function fmtSeconds(value) {
  return `${value.toFixed(1)}s`;
}

function fmtPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function groupCounts(total, peakShare, prePeakShare, postPeakShare, stress) {
  const stressedTotal = Math.round(total * stress);
  const peak = Math.round(stressedTotal * peakShare);
  const pre = Math.round(stressedTotal * prePeakShare);
  const post = Math.max(0, stressedTotal - peak - pre);
  return { pre, peak, post };
}

function generateArrivals({ total, location, rand, cfg }) {
  const counts = groupCounts(
    total,
    cfg.peakShare,
    cfg.prePeakShare,
    cfg.postPeakShare,
    cfg.stress
  );

  const phases = [
    { count: counts.pre, start: 0, duration: cfg.prePeakMin * 60 },
    { count: counts.peak, start: cfg.prePeakMin * 60, duration: cfg.peakMin * 60 },
    {
      count: counts.post,
      start: (cfg.prePeakMin + cfg.peakMin) * 60,
      duration: cfg.postPeakMin * 60,
    },
  ];

  const arrivals = [];
  for (const phase of phases) {
    for (let i = 0; i < phase.count; i++) {
      const isOutside = rand() < cfg.outsideRegionalShare;
      const groupRand = rand();
      const group = groupRand < 0.7 ? 'musico' : groupRand < 0.9 ? 'organista' : 'irmandade';
      arrivals.push({
        location,
        group,
        isOutside,
        isDuplicate: rand() < cfg.duplicateShare,
        arrival: phase.start + rand() * phase.duration,
      });
    }
  }

  const burstSize = location === 'ITAPEVI' ? cfg.burstItapevi : cfg.burstPirapora;
  for (let i = 0; i < burstSize; i++) {
    const isOutside = rand() < cfg.outsideRegionalShare;
    const groupRand = rand();
    arrivals.push({
      location,
      group: groupRand < 0.7 ? 'musico' : groupRand < 0.9 ? 'organista' : 'irmandade',
      isOutside,
      isDuplicate: rand() < cfg.duplicateShare,
      arrival: cfg.prePeakMin * 60,
    });
  }

  return arrivals.sort((a, b) => a.arrival - b.arrival);
}

function serviceTimeSeconds(item, rand) {
  const base = item.isOutside ? 35 : 15;
  const variance = item.isOutside ? 12 : 7;
  const duplicateCost = item.isDuplicate ? 8 : 0;
  return Math.max(6, base + (rand() - 0.5) * variance + duplicateCost);
}

function backendDurationSeconds(rand) {
  const duplicateCheck = 0.25 + rand() * 1.25;
  const localSave = 0.02 + rand() * 0.05;
  const sheets = 0.6 + rand() * 2.7;
  const supabase = 0.25 + rand() * 1.1;
  return {
    foreground: duplicateCheck + localSave,
    background: Math.max(sheets, supabase),
  };
}

function simulateLocation(arrivals, operators, rand) {
  const availableAt = Array.from({ length: operators }, () => 0);
  const waits = [];
  const serviceTimes = [];
  const backendEvents = [];

  for (const item of arrivals) {
    let bestIndex = 0;
    for (let i = 1; i < availableAt.length; i++) {
      if (availableAt[i] < availableAt[bestIndex]) bestIndex = i;
    }

    const start = Math.max(item.arrival, availableAt[bestIndex]);
    const wait = start - item.arrival;
    const service = serviceTimeSeconds(item, rand);
    const finish = start + service;
    const backend = backendDurationSeconds(rand);

    availableAt[bestIndex] = finish;
    waits.push(wait);
    serviceTimes.push(service);
    backendEvents.push({
      start: finish,
      end: finish + backend.foreground + backend.background,
      foregroundEnd: finish + backend.foreground,
    });
  }

  return {
    waits,
    serviceTimes,
    backendEvents,
    lastFinish: Math.max(...availableAt),
    utilization:
      serviceTimes.reduce((sum, value) => sum + value, 0) /
      (operators * Math.max(1, Math.max(...availableAt))),
  };
}

function maxConcurrency(events, endKey = 'end') {
  const points = [];
  for (const event of events) {
    points.push([event.start, 1]);
    points.push([event[endKey], -1]);
  }
  points.sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));

  let current = 0;
  let max = 0;
  for (const [, delta] of points) {
    current += delta;
    if (current > max) max = current;
  }
  return max;
}

function runScenario(cfg) {
  const rand = mulberry32(cfg.seed);
  const itapevi = generateArrivals({ total: cfg.itapevi, location: 'ITAPEVI', rand, cfg });
  const pirapora = generateArrivals({ total: cfg.pirapora, location: 'PIRAPORA', rand, cfg });

  const itapeviResult = simulateLocation(itapevi, cfg.itapeviOperators, rand);
  const piraporaResult = simulateLocation(pirapora, cfg.piraporaOperators, rand);
  const allEvents = [...itapeviResult.backendEvents, ...piraporaResult.backendEvents];
  const allWaits = [...itapeviResult.waits, ...piraporaResult.waits];
  const allService = [...itapeviResult.serviceTimes, ...piraporaResult.serviceTimes];

  return {
    cfg,
    totals: {
      itapevi: itapevi.length,
      pirapora: pirapora.length,
      geral: itapevi.length + pirapora.length,
      picoItapevi: Math.round(cfg.itapevi * cfg.stress * cfg.peakShare),
      picoPirapora: Math.round(cfg.pirapora * cfg.stress * cfg.peakShare),
    },
    waits: {
      avg: allWaits.reduce((a, b) => a + b, 0) / allWaits.length,
      p95: percentile(allWaits, 0.95),
      max: Math.max(...allWaits),
    },
    service: {
      avg: allService.reduce((a, b) => a + b, 0) / allService.length,
      p95: percentile(allService, 0.95),
    },
    backend: {
      maxForegroundConcurrency: maxConcurrency(allEvents, 'foregroundEnd'),
      maxBackgroundConcurrency: maxConcurrency(allEvents, 'end'),
      avgPeakRatePerMin:
        (cfg.itapevi * cfg.stress * cfg.peakShare + cfg.pirapora * cfg.stress * cfg.peakShare) /
        cfg.peakMin,
    },
    locations: {
      itapevi: itapeviResult,
      pirapora: piraporaResult,
    },
  };
}

function printReport(result) {
  const { cfg, totals, waits, service, backend, locations } = result;
  const passQueue = waits.p95 <= 30 && waits.max <= 120;
  const passConcurrency = backend.maxBackgroundConcurrency <= 80;
  const passUtilization = locations.itapevi.utilization <= 0.85 && locations.pirapora.utilization <= 0.85;
  const pass = passQueue && passConcurrency && passUtilization;

  console.log('\nRESULTADO DA SIMULACAO DO EVENTO');
  console.log('================================');
  console.log(`Cenario: Itapevi ${totals.itapevi} + Pirapora ${totals.pirapora} = ${totals.geral} registros`);
  console.log(`Pico 8h40-9h00: Itapevi ${totals.picoItapevi}, Pirapora ${totals.picoPirapora}`);
  console.log(`Atendentes digitando: Itapevi ${cfg.itapeviOperators}, Pirapora ${cfg.piraporaOperators}`);
  console.log(`Stress aplicado: ${cfg.stress.toFixed(2)}x`);
  if (cfg.burstItapevi || cfg.burstPirapora) {
    console.log(`Rajada simultanea extra: Itapevi ${cfg.burstItapevi}, Pirapora ${cfg.burstPirapora}`);
  }

  console.log('\nFILA E ATENDIMENTO');
  console.log(`- Espera media: ${fmtSeconds(waits.avg)}`);
  console.log(`- Espera p95: ${fmtSeconds(waits.p95)}`);
  console.log(`- Maior espera simulada: ${fmtSeconds(waits.max)}`);
  console.log(`- Tempo medio de atendimento: ${fmtSeconds(service.avg)}`);
  console.log(`- Atendimento p95: ${fmtSeconds(service.p95)}`);
  console.log(`- Utilizacao Itapevi: ${fmtPercent(locations.itapevi.utilization)}`);
  console.log(`- Utilizacao Pirapora: ${fmtPercent(locations.pirapora.utilization)}`);

  console.log('\nCARGA TECNICA ESTIMADA');
  console.log(`- Cadastros no pico: ${backend.avgPeakRatePerMin.toFixed(1)} por minuto`);
  console.log(`- Concorrencia maxima em validacao/salvamento local: ${backend.maxForegroundConcurrency}`);
  console.log(`- Concorrencia maxima em sincronizacao background: ${backend.maxBackgroundConcurrency}`);

  console.log('\nCHECKLIST');
  console.log(`${passQueue ? 'OK' : 'ATENCAO'} - Fila dentro do limite operacional`);
  console.log(`${passConcurrency ? 'OK' : 'ATENCAO'} - Concorrencia tecnica dentro do envelope testado`);
  console.log(`${passUtilization ? 'OK' : 'ATENCAO'} - Equipe com folga operacional`);
  console.log(`${pass ? 'OK' : 'ATENCAO'} - Resultado geral do cenario`);

  if (!pass) {
    console.log('\nRecomendacao: aumentar equipe, reduzir cadastros manuais no pico ou fazer warm-up/cache antes das 8h30.');
  }
}

printReport(runScenario(parseArgs()));
