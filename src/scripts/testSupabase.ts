import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
    console.log('Testing fetch from cadastro_fora_regional...');
    const { data, error } = await supabase
        .from('cadastro_fora_regional')
        .select('comum')
        .limit(5);

    console.log('Error:', error);
    console.log('Data:', data);
}

testFetch();
