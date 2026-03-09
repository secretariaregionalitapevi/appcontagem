const fs = require('fs');
const path = require('path');
const https = require('https');

// Read .env file
const envPath = path.resolve(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
    if (line.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) {
        supabaseKey = line.split('=')[1].trim();
    }
});

if (!supabaseUrl || !supabaseKey) {
    console.error('Credentials not found');
    process.exit(1);
}

const url = `${supabaseUrl}/rest/v1/cadastro_fora_regional?select=comum&limit=5`;

console.log('Fetching from:', url);

const options = {
    headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
    }
};

https.get(url, options, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', data);
    });
}).on('error', err => {
    console.error('Error:', err.message);
});
