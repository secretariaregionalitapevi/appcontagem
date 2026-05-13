
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wfqehmdawhfjqbqpjapp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcWVobWRhd2hmanFicXBqYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDI0ODIsImV4cCI6MjA3MzAxODQ4Mn0.lFfEZKIVS7dqk48QFW4IvpRcJsgQnMjYE3iUqsrXsFg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('🔍 Fetching all unique comum/cidade from cadastro_fora_regional...');
  const { data, error } = await supabase
    .from('cadastro_fora_regional')
    .select('comum, cidade')
    .not('comum', 'is', null)
    .neq('comum', '');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Total raw records: ${data.length}`);

  const uniqueComuns = new Set();
  data.forEach(r => {
    uniqueComuns.add(`${r.comum}|${r.cidade}`);
  });

  console.log(`📊 Total unique comum/cidade pairs: ${uniqueComuns.size}`);

  const aracRecords = data.filter(r => (r.cidade || '').toUpperCase().includes('ARAÇARIGUAMA'));
  console.log(`📊 Records for Araçariguama: ${aracRecords.length}`);
  aracRecords.forEach(r => console.log(`  - ${r.comum} (${r.cidade})`));
}

checkData();
