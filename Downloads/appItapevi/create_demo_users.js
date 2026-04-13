const { createClient } = require('@supabase/supabase-js');

// ConfiguraÃ§Ãµes do Supabase
const SUPABASE_URL = 'https://sqamxlhfazulrisiptud.supabase.co';
// IMPORTANTE: Para criar usuÃ¡rios programaticamente sem confirmaÃ§Ã£o de e-mail, 
// Ã© necessÃ¡rio usar a SERVICE_ROLE_KEY. PeÃ§a ao usuÃ¡rio se ele tiver.
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYW14bGhmYXp1bHJpc2lwdHVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3NTg4NCwiZXhwIjoyMDgyOTUxODg0fQ.w92yMKGGh5-ewRq0q6Pdl8TstzGlx0sGms1FCRveDYc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createDemoUsers() {
    const users = [
        { email: 'darpe@gmail.com', password: 'admin123', name: 'UsuÃ¡rio DARPE', sector: 'Darpe' },
        { email: 'ebi@gmail.com', password: 'admin123', name: 'UsuÃ¡rio EBI', sector: 'Ebi' }
    ];

    for (const userData of users) {
        console.log(`Criando usuÃ¡rio: ${userData.email}...`);

        // 1. Criar usuÃ¡rio no Auth (Admin API para ignorar confirmaÃ§Ã£o)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true
        });

        if (authError) {
            console.error(`Erro ao criar auth para ${userData.email}:`, authError.message);
            continue;
        }

        console.log(`UsuÃ¡rio ${userData.email} criado com sucesso (ID: ${authData.user.id}).`);

        // 2. Criar perfil na tabela pÃºblica
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                user_id: authData.user.id,
                full_name: userData.name,
                role: 'member',
                sector: userData.sector
            });

        if (profileError) {
            console.error(`Erro ao criar perfil para ${userData.email}:`, profileError.message);
        } else {
            console.log(`Perfil para ${userData.sector} configurado.`);
        }
    }
}

if (SERVICE_ROLE_KEY === 'SUA_SERVICE_ROLE_KEY_AQUI') {
    console.error('ERRO: VocÃª precisa colocar sua SERVICE_ROLE_KEY no script.');
    process.exit(1);
}

createDemoUsers();
