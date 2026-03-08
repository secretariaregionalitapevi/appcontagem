// ============================================
// Script de Importação CSV para Supabase
// Use este script se a importação direta falhar
// ============================================

// CONFIGURAÇÃO
const SUPABASE_URL = "https://wfqehmdawhfjqbqpjapp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcWVobWRhd2hmanFicXBqYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDI0ODIsImV4cCI6MjA3MzAxODQ4Mn0.lFfEZKIVS7dqk48QFW4IvpRcJsgQnMjYE3iUqsrXsFg";

const TABLE_NAME = "cadastro";

// Função para ler CSV e importar
async function importarCSV(csvFilePath) {
  const fs = require('fs');
  const csv = require('csv-parser');
  const { createClient } = require('@supabase/supabase-js');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  // Função para limpar caracteres especiais
  function limparTexto(texto) {
    if (!texto || texto === 'NULL' || texto === 'null' || texto.trim() === '') {
      return null;
    }
    // Remove caracteres especiais unicode problemáticos
    return texto
      .replace(/◆/g, '')
      .replace(/[^\x20-\x7E\xC0-\xFF]/g, '')
      .trim() || null;
  }
  
  // Função para normalizar texto (minúsculas, remover acentos)
  function normalizar(texto) {
    if (!texto) return null;
    return texto
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  const registros = [];
  let linhaNumero = 0;
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv({
        skipEmptyLines: true,
        skipLinesWithError: true,
        mapHeaders: ({ header }) => {
          // Normaliza nomes das colunas (aceita maiúsculas ou minúsculas)
          const headerNormalizado = header.trim().toLowerCase();
          const mapeamento = {
            'nome': 'nome',
            'instrumento': 'instrumento',
            'localidade': 'localidade',
            'cidade': 'cidade',
            'comum': 'comum',
            'cargo': 'cargo',
            'nivel': 'nivel'
          };
          return mapeamento[headerNormalizado] || headerNormalizado;
        }
      }))
      .on('data', (row) => {
        linhaNumero++;
        
        // Pula linhas vazias
        if (!row.nome || row.nome.trim() === '') {
          console.log(`⏭️  Linha ${linhaNumero} pulada (nome vazio)`);
          return;
        }
        
        // Prepara o registro
        const registro = {
          nome: limparTexto(row.nome),
          instrumento: limparTexto(row.instrumento),
          localidade: limparTexto(row.localidade),
          cidade: limparTexto(row.cidade),
          comum: limparTexto(row.comum) || limparTexto(row.localidade), // Copia localidade para comum se vazio
          cargo: limparTexto(row.cargo),
          nivel: limparTexto(row.nivel),
          ativo: true
        };
        
        // Valida nome obrigatório
        if (!registro.nome) {
          console.log(`⚠️  Linha ${linhaNumero} ignorada: nome é obrigatório`);
          return;
        }
        
        registros.push(registro);
        
        if (registros.length % 100 === 0) {
          console.log(`📊 Processadas ${registros.length} linhas...`);
        }
      })
      .on('end', async () => {
        console.log(`\n✅ Total de ${registros.length} registros preparados para importação`);
        console.log(`📤 Iniciando importação em lotes...\n`);
        
        // Importa em lotes de 1000 para evitar timeout
        const BATCH_SIZE = 1000;
        let totalImportados = 0;
        let totalErros = 0;
        
        for (let i = 0; i < registros.length; i += BATCH_SIZE) {
          const lote = registros.slice(i, i + BATCH_SIZE);
          
          try {
            const { data, error } = await supabase
              .from(TABLE_NAME)
              .insert(lote);
            
            if (error) {
              console.error(`❌ Erro ao importar lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
              totalErros += lote.length;
            } else {
              totalImportados += lote.length;
              console.log(`✅ Lote ${Math.floor(i / BATCH_SIZE) + 1} importado: ${lote.length} registros`);
            }
          } catch (err) {
            console.error(`❌ Erro ao importar lote ${Math.floor(i / BATCH_SIZE) + 1}:`, err.message);
            totalErros += lote.length;
          }
        }
        
        console.log(`\n📊 RESUMO FINAL:`);
        console.log(`   ✅ Importados: ${totalImportados}`);
        console.log(`   ❌ Erros: ${totalErros}`);
        console.log(`   📝 Total processado: ${registros.length}`);
        
        resolve({ importados: totalImportados, erros: totalErros });
      })
      .on('error', (err) => {
        console.error('❌ Erro ao ler CSV:', err);
        reject(err);
      });
  });
}

// Executa se chamado diretamente
if (require.main === module) {
  const csvFilePath = process.argv[2] || 'MUSICOS_ORGANISTAS_REG_ITAPEVI_FINAL.csv';
  
  console.log('🚀 Iniciando importação do CSV...');
  console.log(`📁 Arquivo: ${csvFilePath}\n`);
  
  importarCSV(csvFilePath)
    .then(() => {
      console.log('\n✅ Importação concluída!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Erro na importação:', err);
      process.exit(1);
    });
}

module.exports = { importarCSV };

