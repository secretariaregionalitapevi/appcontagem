require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function diagnose() {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("No Supabase URL/Key found in .env.local");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Testando Select em Profiles para ver colunas disponíveis...');

    // Teste 1: Query com 'local_autorizado'
    const res1 = await supabase.from('profiles').select('id, email, name, role, local_autorizado, created_at, updated_at').limit(1);
    if (res1.error) {
        console.error('❌ GET Profile Detail failed:', res1.error.message);
    } else {
        console.log('✅ GET Profile Detail OK!', res1.data);
    }

    // Teste 2: Query apenas com coisas simples
    const res2 = await supabase.from('profiles').select('*').limit(1);
    if (res2.error) {
        console.error('❌ GET * profiles failed:', res2.error.message);
    } else {
        console.log('✅ GET * profiles OK! Columns detected:', Object.keys(res2.data[0] || {}));
    }
}

diagnose();
