const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://wfqehmdawhfjqbqpjapp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcWVobWRhd2hmanFicXBqYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDI0ODIsImV4cCI6MjA3MzAxODQ4Mn0.lFfEZKIVS7dqk48QFW4IvpRcJsgQnMjYE3iUqsrXsFg";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mocking the normalization functions (matching supabaseDataService.ts)
const removeAccents = (str) => {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
};

const normalizeString = (str) => {
    if (!str) return '';
    let normalized = str.trim();
    normalized = removeAccents(normalized);
    normalized = normalized.replace(/\s+/g, ' ').trim();
    return normalized;
};

const extrairNomeComum = (comumCompleto) => {
    if (!comumCompleto) return '';
    if (comumCompleto.includes(' - ')) {
        const partes = comumCompleto.split(' - ');
        return partes.slice(1).join(' - ').trim();
    }
    if (comumCompleto.includes(' -')) {
        const partes = comumCompleto.split(' -');
        return partes.slice(1).join(' -').trim();
    }
    return comumCompleto.trim();
};

async function run() {
    console.log('Fetching ALL data from Supabase (with pagination)...');

    let allData = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000;

    while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data, error } = await supabase
            .from('cadastro')
            .select('comum')
            .not('comum', 'is', null)
            .neq('comum', '')
            .range(from, to);

        if (error) {
            console.error('Error fetching data:', error);
            break;
        }

        if (data && data.length > 0) {
            allData = allData.concat(data);
            console.log(`Fetched page ${page + 1}: ${data.length} records...`);
            hasMore = data.length === pageSize;
            page++;
        } else {
            hasMore = false;
        }
    }

    console.log(`\nTotal records fetched: ${allData.length}`);

    // --- NEW LOGIC FROM SUPABASEDATASERVICE.TS ---
    const mapComuns = new Map();

    allData.forEach((record) => {
        const original = record.comum;
        if (original && typeof original === 'string') {
            const display = extrairNomeComum(original);

            const matchCodigo = original.match(/BR-\d{2}-\d+/);
            const codigoKey = matchCodigo ? matchCodigo[0] : null;

            const key = codigoKey || normalizeString(display.toUpperCase());

            if (key) {
                const existing = mapComuns.get(key);

                let isBetter = !existing;
                if (existing && codigoKey) {
                    const displayNovo = display.trim();
                    const displayVelho = existing.display.trim();

                    const temParentesesVelho = displayVelho.includes('(');
                    const temParentesesNovo = displayNovo.includes('(');

                    if (temParentesesVelho && !temParentesesNovo) {
                        isBetter = true;
                    } else if (!temParentesesVelho && !temParentesesNovo && displayNovo.length < displayVelho.length) {
                        isBetter = true;
                    }
                }

                if (isBetter) {
                    mapComuns.set(key, { original, display });
                }
            }
        }
    });

    console.log(`Unique congregations (after new deduplication): ${mapComuns.size}`);

    const sortedKeys = Array.from(mapComuns.keys()).sort();

    // Only log if count is still suspicious, or just to verify
    if (mapComuns.size !== 183) {
        console.log('\n--- LIST OF FINAL CONGREGATIONS ---');
        sortedKeys.forEach((key, index) => {
            const item = mapComuns.get(key);
            console.log(`${(index + 1).toString().padStart(3, ' ')}. [${key.padEnd(40, ' ')}] -> Display: ${item.display} | Original: ${item.original}`);
        });
    } else {
        console.log('\n✅ SUCCESS: Congregation count is exactly 183!');
    }
}

run();
