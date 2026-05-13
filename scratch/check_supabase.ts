
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wfqehmdawhfjqbqpjapp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcWVobWRhd2hmanFicXBqYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDI0ODIsImV4cCI6MjA3MzAxODQ4Mn0.lFfEZKIVS7dqk48QFW4IvpRcJsgQnMjYE3iUqsrXsFg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('🔍 Checking cadastro_fora_regional...');
  const { data, error, count } = await supabase
    .from('cadastro_fora_regional')
    .select('comum, cidade', { count: 'exact' })
    .limit(20);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Total records in table: ${count}`);
  console.log('✅ Sample Data (first 20):', JSON.stringify(data, null, 2));

  console.log('\n🔍 Searching for Araçariguama in cidade...');
  const { data: arac, error: aracErr } = await supabase
    .from('cadastro_fora_regional')
    .select('*')
    .ilike('cidade', '%Araçariguama%');

  if (aracErr) {
    console.error('❌ Error searching Araçariguama:', aracErr);
  } else {
    console.log(`✅ Found ${arac?.length} records for Araçariguama in cidade`);
    if (arac && arac.length > 0) {
       // List all unique comuni for Araçariguama
       const comunsArac = [...new Set(arac.map(a => a.comum))];
       console.log('Comuns for Araçariguama:', comunsArac);
    }
  }

  console.log('\n🔍 Searching for Araçariguama in comum...');
  const { data: aracComum, error: aracComumErr } = await supabase
    .from('cadastro_fora_regional')
    .select('*')
    .ilike('comum', '%Araçariguama%');

  if (aracComumErr) {
    console.error('❌ Error searching Araçariguama in comum:', aracComumErr);
  } else {
    console.log(`✅ Found ${aracComum?.length} records for Araçariguama in comum`);
  }
}

checkData();
