
import { supabase } from './src/services/supabaseClient';

async function checkSchema() {
    const { data, error } = await supabase
        .from('cadastro')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching sample:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
        console.log('Sample data:', data[0]);
    }
}

checkSchema();
