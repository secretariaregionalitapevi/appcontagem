import fs from 'fs';
import path from 'path';

const inputPath = 'C:\\Users\\Usuário\\OneDrive\\REGIONAL ITAPEVI\\DB_APLICATIVO\\IGREJAS_FORA_REGIONAL.csv';
const outputPath = 'C:\\Users\\Usuário\\OneDrive\\REGIONAL ITAPEVI\\DB_APLICATIVO\\IGREJAS_FORA_REGIONAL_FIXED.csv';

try {
    const content = fs.readFileSync(inputPath, 'utf8');
    const lines = content.split('\n');
    
    const fixedLines = lines.map((line, index) => {
        if (!line.trim()) return '';
        
        // Split by semicolon
        const parts = line.split(';');
        
        // If it's the header
        if (index === 0) {
            return ['id', ...parts].join(',');
        }
        
        // For data rows, add a numeric ID (or leave empty if Supabase should generate)
        // Let's add a numeric ID to be safe
        return [index, ...parts.map(p => {
            // Escape commas and quotes for CSV
            let val = p.trim();
            if (val.includes(',') || val.includes('"')) {
                val = `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        })].join(',');
    });
    
    fs.writeFileSync(outputPath, fixedLines.join('\n'), 'utf8');
    console.log('✅ Planilha corrigida criada em:', outputPath);
} catch (error) {
    console.error('❌ Erro ao converter planilha:', error);
}
