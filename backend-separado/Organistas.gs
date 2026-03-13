/**
 * ============================================================================
 * PROPRIEDADE INTELECTUAL E DIREITOS AUTORAIS
 * ============================================================================
 * Este sistema foi desenvolvido e arquitetado exclusivamente pela:
 * SECRETARIA DA ADMINISTRAÇÃO MUSICAL - REGIONAL ITAPEVI
 * 
 * Sede da Administração Musical Itapevi:
 * Av. Ana Araújo de Castro, 815 - Jardim Itapevi, Itapevi - SP
 * CEP: 06653-140
 * 
 * É ESTRITAMENTE PROIBIDA a cópia, distribuição, engenharia reversa 
 * ou uso deste código-fonte por outras Regionais ou terceiros sem 
 * autorização prévia e expressa da Secretaria de Itapevi e seu Ministério.
 * ============================================================================
 */

function buscarTodosRegistrosTocou(localEnsaio) {
  try {
    console.log(`🔍 [buscarTodosRegistrosTocou] Iniciando busca para local: "${localEnsaio}"`);
    
    // Se localEnsaio não foi fornecido, tenta extrair da planilha
    if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '') {
      console.log('⚠️ [buscarTodosRegistrosTocou] localEnsaio não fornecido, tentando extrair da planilha...');
      
      try {
        const shDados = openOrCreateSheet(SHEET_NAME);
        const lastRow = shDados.getLastRow();
        const lastCol = shDados.getLastColumn();
        
        if (lastRow >= 2) {
          const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
          const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));
          
          if (idxLocalEnsaio >= 0) {
            // Pega o primeiro local encontrado nos dados
            const data = shDados.getRange(2, 1, 1, lastCol).getDisplayValues()[0];
            const localEncontrado = norm(data[idxLocalEnsaio] || '');
            if (localEncontrado) {
              localEnsaio = localEncontrado;
              console.log(`✅ [buscarTodosRegistrosTocou] Local extraído da planilha: "${localEnsaio}"`);
            }
          }
        }
      } catch (e) {
        console.log(`⚠️ [buscarTodosRegistrosTocou] Erro ao extrair local da planilha: ${e.toString()}`);
      }
    }
    
    if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '') {
      console.log('❌ [buscarTodosRegistrosTocou] localEnsaio ainda está vazio ou nulo após tentativas');
      return [];
    }
    
    const localBusca = String(localEnsaio).toUpperCase().trim();
    if (!localBusca || localBusca === 'UNDEFINED') {
      console.log('⚠️ [buscarTodosRegistrosTocou] localBusca está vazio após trim');
      return [];
    }
    
    console.log(`🔍 [buscarTodosRegistrosTocou] Local normalizado: "${localBusca}"`);
    
    // Busca na tabela organistas_ensaio (último evento)
    // Esta tabela contém o histórico com o campo 'tocou' que indica se a organista tocou
    const localCodificado = encodeURIComponent(localBusca);
    
    // URL do PostgREST: buscar registros do local na tabela organistas_ensaio
    // Ordenado por data_ensaio desc para pegar o registro mais recente primeiro
    const url = SUPABASE_URL + '/rest/v1/organistas_ensaio?local_ensaio=ilike.%2A' + localCodificado + '%2A&order=data_ensaio.desc&limit=500';
    
    console.log(`🔗 [buscarTodosRegistrosTocou] URL: ${url}`);
    
    const options = {
      'method': 'get',
      'headers': {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      'muteHttpExceptions': true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    
    console.log(`📊 [buscarTodosRegistrosTocou] Status HTTP: ${statusCode}`);
    
    if (statusCode !== 200) {
      const errorText = response.getContentText();
      console.log(`❌ [buscarTodosRegistrosTocou] Erro ao buscar registros. Status: ${statusCode}`);
      console.log(`❌ [buscarTodosRegistrosTocou] Resposta: ${errorText}`);
      return [];
    }
    
    const texto = response.getContentText();
    if (!texto || texto.trim() === '') {
      console.log('⚠️ [buscarTodosRegistrosTocou] Resposta vazia do servidor');
      return [];
    }
    
    console.log(`📄 [buscarTodosRegistrosTocou] Tamanho da resposta: ${texto.length} caracteres`);
    
    const registros = JSON.parse(texto);
    if (!Array.isArray(registros)) {
      console.log(`⚠️ [buscarTodosRegistrosTocou] Resposta não é um array. Tipo: ${typeof registros}`);
      console.log(`⚠️ [buscarTodosRegistrosTocou] Conteúdo: ${JSON.stringify(registros).substring(0, 200)}`);
      return [];
    }
    
    console.log(`✅ [buscarTodosRegistrosTocou] Registros encontrados na tabela organistas_ensaio: ${registros.length}`);
    
    // Log dos primeiros registros para debug
    if (registros.length > 0) {
      const primeiroRegistro = registros[0];
      console.log(`📋 [buscarTodosRegistrosTocou] Primeiro registro completo: ${JSON.stringify(primeiroRegistro)}`);
      console.log(`📋 [buscarTodosRegistrosTocou] Campos disponíveis: ${Object.keys(primeiroRegistro).join(', ')}`);
      console.log(`📋 [buscarTodosRegistrosTocou] Campo 'tocou' existe? ${'tocou' in primeiroRegistro}`);
      console.log(`📋 [buscarTodosRegistrosTocou] Valor de 'tocou': ${primeiroRegistro.tocou} (tipo: ${typeof primeiroRegistro.tocou})`);
      
      // Verifica também outros possíveis nomes de campos
      const camposPossiveis = ['organista_nome', 'nome', 'nome_completo', 'nome_organista'];
      camposPossiveis.forEach(campo => {
        if (campo in primeiroRegistro) {
          console.log(`📋 [buscarTodosRegistrosTocou] Campo '${campo}' encontrado: ${primeiroRegistro[campo]}`);
        }
      });
    }
    
    return registros;
  } catch (e) {
    console.log(`❌ [buscarTodosRegistrosTocou] Erro: ${e.toString()}`);
    console.log(`❌ [buscarTodosRegistrosTocou] Stack: ${e.stack || 'N/A'}`);
    return [];
  }
}

// Função para buscar se tocou nos registros já carregados da tabela organistas_ensaio
// Recebe: nome da organista (da tabela presencas de hoje), array de registros da organistas_ensaio (último evento)
// Retorna: 'SIM', 'NÃO' ou '' (vazio se não encontrou)
// A lógica confronta os nomes entre as duas tabelas e verifica o campo 'tocou' em organistas_ensaio

function buscarTocouNosRegistros(organistaNome, registros) {
  try {
    if (!organistaNome) {
      console.log(`⚠️ [buscarTocouNosRegistros] organistaNome está vazio ou nulo`);
      return '';
    }
    
    if (!registros || !Array.isArray(registros)) {
      console.log(`⚠️ [buscarTocouNosRegistros] registros não é um array válido para: ${organistaNome}`);
      return '';
    }
    
    if (registros.length === 0) {
      console.log(`⚠️ [buscarTocouNosRegistros] Array de registros está vazio para: ${organistaNome}`);
      return '';
    }
    
    // Normalizar nome: remover acentos, espaços extras, maiúsculas
    const nomeBusca = normalizarNome(String(organistaNome));
    if (!nomeBusca) {
      console.log(`⚠️ [buscarTocouNosRegistros] Nome normalizado está vazio para: ${organistaNome}`);
      return '';
    }
    
    console.log(`🔍 [buscarTocouNosRegistros] Buscando: "${organistaNome}" -> normalizado: "${nomeBusca}"`);
    console.log(`📊 [buscarTocouNosRegistros] Total de registros para buscar: ${registros.length}`);
    
    // Lista de possíveis nomes de campos na tabela organistas_ensaio
    const camposNomePossiveis = ['organista_nome', 'nome', 'nome_completo', 'nome_organista', 'organista'];
    
    // Procurar o primeiro registro que corresponde ao nome (já está ordenado por data desc)
    // Isso garante que pegamos o registro mais recente de cada organista
    for (let i = 0; i < registros.length; i++) {
      const reg = registros[i];
      if (!reg) {
        continue;
      }
      
      // Tenta encontrar o nome em diferentes campos possíveis
      let regNome = null;
      let campoEncontrado = null;
      
      for (const campo of camposNomePossiveis) {
        if (reg[campo] && String(reg[campo]).trim() !== '') {
          regNome = normalizarNome(String(reg[campo]));
          campoEncontrado = campo;
          break;
        }
      }
      
      if (!regNome) {
        // Se não encontrou em nenhum campo conhecido, pula este registro
        continue;
      }
      
      const tocouValue = reg.tocou;
      
      // Prepara arrays de palavras para uso nas estratégias de comparação
      const palavrasRegNome = regNome.split(' ').filter(p => p.length > 0);
      const palavrasNomeBusca = nomeBusca.split(' ').filter(p => p.length > 0);
      
      // Comparação: nome exato (mais preciso)
      if (regNome === nomeBusca) {
        const resultado = tocouValue === true || tocouValue === 'true' || tocouValue === 1 ? 'SIM' : 'NÃO';
        console.log(`✅ [buscarTocouNosRegistros] Encontrado EXATO: "${organistaNome}" -> "${reg[campoEncontrado]}" (campo: ${campoEncontrado}) -> tocou: ${tocouValue} -> resultado: "${resultado}"`);
        return resultado;
      }
      
      // Se não encontrou exato, tenta parcial (caso tenha variação no nome)
      // Verifica se um nome contém o outro (para casos como "VANESSA DIAS" vs "VANESSA DIAS DE OLIVEIRA GRANGEIRO")
      
      // Estratégia 1: Se o nome do banco está contido no nome da planilha (nome mais completo)
      // Isso é comum quando o banco tem apenas nome e sobrenome, mas a planilha tem nome completo
      // Exemplo: "VANESSA DIAS" (banco) está em "VANESSA DIAS DE OLIVEIRA GRANGEIRO" (planilha)
      if (nomeBusca.indexOf(regNome) >= 0) {
        // Verifica se o nome do banco tem pelo menos 2 palavras (evita falsos positivos com nomes muito curtos)
        if (palavrasRegNome.length >= 2) {
          const resultado = tocouValue === true || tocouValue === 'true' || tocouValue === 1 ? 'SIM' : 'NÃO';
          console.log(`✅ [buscarTocouNosRegistros] Encontrado PARCIAL (banco contido na planilha): "${organistaNome}" -> "${reg[campoEncontrado]}" (campo: ${campoEncontrado}) -> tocou: ${tocouValue} -> resultado: "${resultado}"`);
          console.log(`   📝 Detalhes: nomeBusca="${nomeBusca}", regNome="${regNome}", indexOf=${nomeBusca.indexOf(regNome)}`);
          return resultado;
        }
      }
      
      // Estratégia 1b: Verifica se o nome do banco está no INÍCIO do nome da planilha (mais seguro)
      // Exemplo: "VANESSA DIAS" deve estar no início de "VANESSA DIAS DE OLIVEIRA GRANGEIRO"
      if (palavrasRegNome.length >= 2) {
        const inicioNomeBusca = nomeBusca.substring(0, regNome.length);
        if (inicioNomeBusca === regNome || nomeBusca.startsWith(regNome + ' ')) {
          const resultado = tocouValue === true || tocouValue === 'true' || tocouValue === 1 ? 'SIM' : 'NÃO';
          console.log(`✅ [buscarTocouNosRegistros] Encontrado PARCIAL (banco no início da planilha): "${organistaNome}" -> "${reg[campoEncontrado]}" (campo: ${campoEncontrado}) -> tocou: ${tocouValue} -> resultado: "${resultado}"`);
          return resultado;
        }
      }
      
      // Estratégia 2: Se o nome da planilha está contido no nome do banco (menos comum, mas possível)
      if (regNome.indexOf(nomeBusca) >= 0) {
        if (palavrasNomeBusca.length >= 2) {
          const resultado = tocouValue === true || tocouValue === 'true' || tocouValue === 1 ? 'SIM' : 'NÃO';
          console.log(`✅ [buscarTocouNosRegistros] Encontrado PARCIAL (planilha contida no banco): "${organistaNome}" -> "${reg[campoEncontrado]}" (campo: ${campoEncontrado}) -> tocou: ${tocouValue} -> resultado: "${resultado}"`);
          return resultado;
        }
      }
      
      // Estratégia 3: Comparação por primeiras palavras (ex: "VANESSA DIAS" vs "VANESSA DIAS DE OLIVEIRA")
      // Verifica se as primeiras 2 palavras coincidem
      
      if (palavrasRegNome.length >= 2 && palavrasNomeBusca.length >= 2) {
        const primeiras2Reg = palavrasRegNome.slice(0, 2).join(' ');
        const primeiras2Busca = palavrasNomeBusca.slice(0, 2).join(' ');
        
        if (primeiras2Reg === primeiras2Busca) {
          const resultado = tocouValue === true || tocouValue === 'true' || tocouValue === 1 ? 'SIM' : 'NÃO';
          console.log(`✅ [buscarTocouNosRegistros] Encontrado PARCIAL (primeiras 2 palavras): "${organistaNome}" -> "${reg[campoEncontrado]}" (campo: ${campoEncontrado}) -> tocou: ${tocouValue} -> resultado: "${resultado}"`);
          return resultado;
        }
      }
    }
    
    console.log(`⚠️ [buscarTocouNosRegistros] Nenhum registro encontrado para: "${organistaNome}" (normalizado: "${nomeBusca}")`);
    
    // Log dos primeiros 3 nomes dos registros para debug
    if (registros.length > 0) {
      const primeirosNomes = registros.slice(0, 3).map(r => {
        for (const campo of camposNomePossiveis) {
          if (r[campo]) return `${r[campo]} (${campo})`;
        }
        return '(sem nome encontrado)';
      }).join(', ');
      console.log(`📋 [buscarTocouNosRegistros] Primeiros nomes nos registros: ${primeirosNomes}`);
    }
    
    return '';
  } catch (e) {
    console.log(`❌ [buscarTocouNosRegistros] Erro ao buscar para "${organistaNome}": ${e.toString()}`);
    console.log(`❌ [buscarTocouNosRegistros] Stack: ${e.stack || 'N/A'}`);
    return '';
  }
}

// Função auxiliar para normalizar nomes (remove acentos, espaços extras, converte para maiúscula)

function compararLocaisEnsaio(local1, local2) {
  if (!local1 || !local2) return false;
  
  const l1 = local1.toLowerCase().trim();
  const l2 = local2.toLowerCase().trim();
  
  // Comparação exata
  if (l1 === l2) return true;
  
  // Mapeamento de variações
  const mapeamento = {
    'caucaia': ['caucaia do alto', 'caucaia'],
    'vargemgrande': ['vargem grande', 'vargemgrande', 'vargem grande'],
    'cotia': ['cotia'],
    'itapevi': ['itapevi'],
    'jandira': ['jandira'],
    'fazendinha': ['fazendinha'],
    'pirapora': ['pirapora']
  };
  
  // Verifica se algum dos locais está no mapeamento
  for (const [canonico, variacoes] of Object.entries(mapeamento)) {
    if ((l1 === canonico || variacoes.includes(l1)) && 
        (l2 === canonico || variacoes.includes(l2))) {
      return true;
    }
  }
  
  // Verifica se um contém o outro
  if (l1.includes(l2) || l2.includes(l1)) return true;
  
  return false;
}

// Função principal para processar contagem detalhada por localidade

function criarResumoPorEnsaio() {
  try {
    console.log('📊 Iniciando criação de resumo por ensaio...');
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    console.log(`📊 Dados encontrados: ${lastRow} linhas, ${lastCol} colunas`);
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Mapeia os índices das colunas
    const headerMap = {};
    headerRow.forEach((h, i) => { 
      if (h) headerMap[h.toString().trim()] = i; 
    });

    // Normaliza e processa os dados
    const linhas = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;

      const comum = norm(row[headerMap['COMUM']] || '') || '(Sem comum)';
      const cidade = norm(row[headerMap['CIDADE']] || '') || '(Sem cidade)';
      const localEnsaio = norm(row[headerMap['LOCAL_ENSAIO']] || '') || '(Sem local definido)';
      
      const cargoRaw = norm(row[headerMap['CARGO']] || '');
      const cargoK = key(cargoRaw);
      const cargo = aliasCargo[cargoK] || (cargoK ? cap(cargoRaw) : '');
      
      const instrumento = norm(row[headerMap['INSTRUMENTO']] || '');
      const vaiTocar = norm(row[headerMap['VAI_TOCAR']] || '');
      const nivel = norm(row[headerMap['CLASSE_ORGANISTA']] || '');

      linhas.push({
        nome, comum, cidade, cargo, instrumento, vai_tocar: vaiTocar, nivel, local_ensaio: localEnsaio, _ord: i
      });
    }

    // Agrupa por local de ensaio
    const ensaioMap = {};
    const encarregadosMap = {};
    
    linhas.forEach(x => {
      if (!estevePresente(x)) return; // Só conta os presentes
      
      const local = x.local_ensaio;
      
      // Inicializa o ensaio se não existir
      if (!ensaioMap[local]) {
        ensaioMap[local] = {
          musicos: 0,
          organistas: 0,
          irmaos: 0,
          ministerio: 0,
          apoio: 0,
          total: 0,
          comuns: new Set(),
          comumData: {}, // Estrutura para dados por comum
          encarregados: []
        };
      }
      
      // Adiciona a comum ao conjunto
      ensaioMap[local].comuns.add(x.comum);
      
      // Inicializa dados da comum se não existir
      if (!ensaioMap[local].comumData[x.comum]) {
        ensaioMap[local].comumData[x.comum] = {
          total: 0,
          musicos: 0,
          organistas: 0,
          irmaos: 0,
          ministerio: 0,
          apoio: 0
        };
      }
      
      // Classifica por tipo de cargo
      const cargoLower = x.cargo.toLowerCase();
      
      // PRIMEIRO: Verifica irmandade (antes de classificarCargo)
      if (cargoLower.includes('irmão') || cargoLower.includes('irmã') || 
          cargoLower.includes('irmãos') || cargoLower.includes('irmãs') ||
          cargoLower === 'irmandade') {
        ensaioMap[local].irmaos++; // Irmandade tem sua própria categoria
        ensaioMap[local].comumData[x.comum].irmaos++;
      } else {
        // Só classifica se não for irmandade
        const tipoCargo = classificarCargo(x.cargo);
        
        if (tipoCargo === 'organista') {
          ensaioMap[local].organistas++;
          ensaioMap[local].comumData[x.comum].organistas++;
        } else if (tipoCargo === 'musico' || ehMusico(x)) {
          ensaioMap[local].musicos++;
          ensaioMap[local].comumData[x.comum].musicos++;
        } else if (tipoCargo === 'ministerio') {
          ensaioMap[local].ministerio++;
          ensaioMap[local].comumData[x.comum].ministerio++;
        } else if (tipoCargo === 'apoio') {
          ensaioMap[local].apoio++;
          ensaioMap[local].comumData[x.comum].apoio++;
        }
        // Removido: outros (não faz parte da lógica)
      }
      
      ensaioMap[local].total++;
      ensaioMap[local].comumData[x.comum].total++;
      
      // Verifica se é encarregado local, regional ou examinador
      if (ehEncarregadoLocal(x.cargo) || ehEncarregadoRegional(x.cargo) || ehExaminador(x.cargo)) {
        let tipo;
        if (ehEncarregadoLocal(x.cargo)) {
          tipo = 'local';
        } else if (ehEncarregadoRegional(x.cargo)) {
          tipo = 'regional';
        } else if (ehExaminador(x.cargo)) {
          tipo = 'examinador';
        }
        
        // Debug log
        console.log(`🔍 Encarregado/Examinador encontrado: ${x.nome} (${x.comum}) - ${x.cargo} - Tipo: ${tipo}`);
        
        ensaioMap[local].encarregados.push({
          nome: x.nome,
          comum: x.comum,
          cargo: x.cargo,
          localEnsaio: x.local_ensaio,
          tipo: tipo
        });
        
        // Mapeia encarregados por local
        if (!encarregadosMap[local]) {
          encarregadosMap[local] = [];
        }
        encarregadosMap[local].push({
          nome: x.nome,
          comum: x.comum,
          cargo: x.cargo,
          tipo: tipo
        });
      }
    });

    // Cria a aba de resumo por ensaio
    const shResumoEnsaio = openOrCreateSheet('Resumo por Ensaio');
    shResumoEnsaio.clearContents();
    
    let row = 1;
    
    // Cabeçalho principal
    shResumoEnsaio.getRange(row,1,1,1).setValue('RESUMO POR ENSAIO').setFontWeight('bold').setFontSize(14);
    shResumoEnsaio.getRange(row,1,1,1).setBackground('#4285f4').setFontColor('white');
    row += 2;

    // Ordena ensaios por nome - TODOS os ensaios
    const ensaiosOrdenados = Object.keys(ensaioMap).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    // Processa cada ensaio separadamente (como na aba Comum)
    ensaiosOrdenados.forEach(local => {
      const dados = ensaioMap[local];
      const comunsList = Array.from(dados.comuns).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      
      // Título do ensaio
      shResumoEnsaio.getRange(row,1,1,1).setValue(`📍 ${local}`).setFontWeight('bold').setFontSize(12);
      shResumoEnsaio.getRange(row,1,1,1).setBackground('#e8f0fe');
      row += 2;
      
      // Cabeçalho da tabela para este ensaio
      shResumoEnsaio.getRange(row,1,1,8).setValues([['Comum','Cidade','Músicos','Organistas','Irmandade','Ministério','Apoio','Total']]).setFontWeight('bold');
      shResumoEnsaio.getRange(row,1,1,8).setBackground('#f0f8ff');
      row++;
      
      // Dados por comum neste ensaio
      comunsList.forEach(comum => {
        // Busca dados específicos desta comum neste ensaio
        const comumDados = linhas.filter(x => 
          estevePresente(x) && 
          x.local_ensaio === local && 
          x.comum === comum
        );
        
        // Conta por categoria
        let musicos = 0, organistas = 0, irmaos = 0, ministerio = 0, apoio = 0;
        
        comumDados.forEach(x => {
          const cargoLower = x.cargo.toLowerCase();
          
          // PRIMEIRO: Verifica irmandade (antes de classificarCargo)
          if (cargoLower.includes('irmão') || cargoLower.includes('irmã') || 
              cargoLower.includes('irmãos') || cargoLower.includes('irmãs') ||
              cargoLower === 'irmandade') {
            irmaos++;
            console.log(`🔍 Irmandade identificada: ${x.nome} - ${x.cargo} - ${x.comum}`);
          } else {
            // Só classifica se não for irmandade
            const tipoCargo = classificarCargo(x.cargo);
            
            if (tipoCargo === 'organista') {
              organistas++;
            } else if (tipoCargo === 'musico' || ehMusico(x)) {
              musicos++;
            } else if (tipoCargo === 'ministerio') {
              ministerio++;
            } else if (tipoCargo === 'apoio') {
              apoio++;
            }
            // Removido: outros (não faz parte da lógica)
          }
        });
        
        const total = musicos + organistas + irmaos + ministerio + apoio;
        
        // Busca cidade da primeira pessoa desta comum
        const cidade = comumDados.length > 0 ? comumDados[0].cidade : '(Sem cidade)';
        
        shResumoEnsaio.getRange(row,1,1,8).setValues([[
          comum,
          cidade,
          musicos,
          organistas,
          irmaos,
          ministerio,
          apoio,
          total
        ]]);
        
        // Destaca se tem muitos participantes
        if (total > 10) {
          shResumoEnsaio.getRange(row,1,1,8).setBackground('#e8f5e8');
        } else if (total < 3) {
          shResumoEnsaio.getRange(row,1,1,8).setBackground('#fff3cd');
        }
        
        row++;
      });
      
      // Linha de total para este ensaio
      shResumoEnsaio.getRange(row,1,1,8).setValues([[
        `TOTAL ${local}`,
        '',
        dados.musicos,
        dados.organistas,
        dados.irmaos,
        dados.ministerio,
        dados.apoio,
        dados.total
      ]]).setFontWeight('bold');
      shResumoEnsaio.getRange(row,1,1,8).setBackground('#f0f0f0');
      row += 2;
    });

    // Linha de total geral
    const totalMusicos = ensaiosOrdenados.reduce((sum, local) => sum + ensaioMap[local].musicos, 0);
    const totalOrganistas = ensaiosOrdenados.reduce((sum, local) => sum + ensaioMap[local].organistas, 0);
    const totalIrmandade = ensaiosOrdenados.reduce((sum, local) => sum + ensaioMap[local].irmaos, 0);
    const totalMinisterio = ensaiosOrdenados.reduce((sum, local) => sum + ensaioMap[local].ministerio, 0);
    const totalApoio = ensaiosOrdenados.reduce((sum, local) => sum + ensaioMap[local].apoio, 0);
    const totalGeral = ensaiosOrdenados.reduce((sum, local) => sum + ensaioMap[local].total, 0);
    
    shResumoEnsaio.getRange(row,1,1,8).setValues([[
      'TOTAL GERAL',
      '',
      totalMusicos,
      totalOrganistas,
      totalIrmandade,
      totalMinisterio,
      totalApoio,
      totalGeral
    ]]).setFontWeight('bold');
    shResumoEnsaio.getRange(row,1,1,8).setBackground('#4285f4').setFontColor('white');
    row += 3;

    // Seção de encarregados
    shResumoEnsaio.getRange(row,1,1,1).setValue('ENCARREGADOS POR ENSAIO').setFontWeight('bold').setFontSize(12);
    shResumoEnsaio.getRange(row,1,1,1).setBackground('#e8f0fe');
    row += 2;

    // Cabeçalho da tabela de resumo por comum
    shResumoEnsaio.getRange(row,1,1,7).setValues([['Local do Ensaio', 'Comum', 'Músicos', 'Organistas', 'Encarregado Local', 'Encarregado Regional', 'Examinadora de Organistas']]).setFontWeight('bold');
    shResumoEnsaio.getRange(row,1,1,7).setBackground('#f0f8ff');
    row++;

    // Dados do resumo por comum dentro de cada ensaio - VERSÃO SIMPLIFICADA
    ensaiosOrdenados.forEach(local => {
      const dados = ensaioMap[local];
      const comunsList = Array.from(dados.comuns).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      
      // Para cada comum neste ensaio
      comunsList.forEach(comum => {
        const comumData = dados.comumData[comum];
        
        // Busca encarregados desta comum de forma mais simples
        const encarregadosLocal = [];
        const encarregadosRegional = [];
        const examinadores = [];
        
        // Verifica todos os encarregados do ensaio
        const todosEncarregados = ensaioMap[local].encarregados || [];
        console.log(`🔍 Processando ${local} - ${comum}: ${todosEncarregados.length} encarregados encontrados`);
        
        todosEncarregados.forEach(enc => {
          console.log(`  - ${enc.nome} (${enc.comum}) - Tipo: ${enc.tipo}`);
          if (enc.comum === comum) {
            if (enc.tipo === 'local') {
              encarregadosLocal.push(enc.nome);
            } else if (enc.tipo === 'regional') {
              encarregadosRegional.push(enc.nome);
            } else if (enc.tipo === 'examinador') {
              examinadores.push(enc.nome);
            }
          }
        });
        
        console.log(`  Resultado: Local=${encarregadosLocal.length}, Regional=${encarregadosRegional.length}, Examinador=${examinadores.length}`);
        
        // Conta músicos e organistas desta comum
        const musicos = comumData.musicos || 0;
        const organistas = comumData.organistas || 0;
        
        // Exibe os dados
        shResumoEnsaio.getRange(row,1,1,7).setValues([[
          local,
          comum,
          musicos,
          organistas,
          encarregadosLocal.length > 0 ? encarregadosLocal.join(', ') : '-',
          encarregadosRegional.length > 0 ? encarregadosRegional.join(', ') : '-',
          examinadores.length > 0 ? examinadores.join(', ') : '-'
        ]]);
        
        // Cores diferentes para linhas com/sem encarregados
        if (encarregadosLocal.length > 0 || encarregadosRegional.length > 0 || examinadores.length > 0) {
          shResumoEnsaio.getRange(row,1,1,7).setBackground('#e8f5e8');
        } else {
          shResumoEnsaio.getRange(row,1,1,7).setBackground('#fff3e0');
        }
        
        row++;
      });
      
      // Linha separadora entre ensaios
      if (comunsList.length > 0) {
        shResumoEnsaio.getRange(row,1,1,7).setValues([['', '', '', '', '', '', '']]);
        shResumoEnsaio.getRange(row,1,1,7).setBackground('#f5f5f5');
        row++;
      }
    });

    // Formatação
    shResumoEnsaio.getRange(1, 1, row-1, 7).setBorder(true, true, true, true, true, true);
    try { shResumoEnsaio.getDataRange().setFontFamily('Arial').setFontSize(11); } catch(e){}
    try { shResumoEnsaio.setFrozenRows(1); } catch(e){}
    
    // Define larguras fixas para as colunas
    shResumoEnsaio.setColumnWidth(1, 200); // A - Local do Ensaio
    shResumoEnsaio.setColumnWidth(2, 200); // B - Comum
    shResumoEnsaio.setColumnWidth(3, 80);  // C - Músicos
    shResumoEnsaio.setColumnWidth(4, 80);  // D - Organistas
    shResumoEnsaio.setColumnWidth(5, 200); // E - Encarregado Local
    shResumoEnsaio.setColumnWidth(6, 200); // F - Encarregado Regional
    shResumoEnsaio.setColumnWidth(7, 250); // G - Examinadora de Organistas

    console.log('✅ Resumo por ensaio criado com sucesso!');
    console.log(`📈 Resultado: ${ensaiosOrdenados.length} ensaios, ${totalGeral} participantes`);
    
    return {
      ok: true,
      ensaios: ensaiosOrdenados.length,
      totalParticipantes: totalGeral,
      detalhes: ensaioMap
    };

  } catch (error) {
    console.error('❌ Erro ao criar resumo por ensaio:', error);
    throw error;
  }
}

// Função para criar resumo apenas dos encarregados

function listarLocaisEnsaio() {
  try {
    console.log('🏛️ Listando locais de ensaio disponíveis...');
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      return {
        ok: true,
        locais: [],
        total: 0
      };
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Mapeia os índices das colunas
    const headerMap = {};
    headerRow.forEach((h, i) => { 
      if (h) headerMap[h.toString().trim()] = i; 
    });

    // Coleta todos os locais únicos
    const locaisSet = new Set();
    const locaisComContagem = {};

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[headerMap['NOME COMPLETO']] || '');
      if (!nome) continue;

      const comum = norm(row[headerMap['COMUM']] || '') || '(Sem comum)';
      const cidade = norm(row[headerMap['CIDADE']] || '') || '(Sem cidade)';
      const localEnsaio = norm(row[headerMap['LOCAL_ENSAIO']] || '') || '(Sem local definido)';
      
      const cargoRaw = norm(row[headerMap['CARGO']] || '');
      const cargoK = key(cargoRaw);
      const cargo = aliasCargo[cargoK] || (cargoK ? cap(cargoRaw) : '');
      
      const instrumento = norm(row[headerMap['INSTRUMENTO']] || '');
      const vaiTocar = norm(row[headerMap['VAI_TOCAR']] || '');
      const nivel = norm(row[headerMap['CLASSE_ORGANISTA']] || '');

      const linha = {
        nome, comum, cidade, cargo, instrumento, vai_tocar: vaiTocar, nivel, local_ensaio: localEnsaio, _ord: i
      };

      if (estevePresente(linha)) {
        locaisSet.add(localEnsaio);
        if (!locaisComContagem[localEnsaio]) {
          locaisComContagem[localEnsaio] = 0;
        }
        locaisComContagem[localEnsaio]++;
      }
    }

    const locais = Array.from(locaisSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    
    console.log(`📊 Encontrados ${locais.length} locais de ensaio:`, locais);
    
    return {
      ok: true,
      locais: locais,
      contagem: locaisComContagem,
      total: locais.length
    };

  } catch (error) {
    console.error('❌ Erro ao listar locais de ensaio:', error);
    throw error;
  }
}

// Função para obter atualizações de progresso (chamada pelo HTML)

function alimentarAbaOrganistasItapevi(localEnsaio = 'Itapevi') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Organistas na planilha externa de Itapevi para: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Busca flexível pelos headers
    const idxNome = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nome'));
    const idxCargo = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('cargo'));
    const idxNivel = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nivel') || h.toString().toLowerCase().includes('classe'));
    const idxComum = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('comum'));
    const idxCidade = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('cidade') || 
      h.toString().toLowerCase().includes('municipio') || 
      h.toString().toLowerCase().includes('município') ||
      h.toString().toLowerCase().includes('localidade')
    ));
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));
    const idxVaiTocar = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('vai_tocar'));
    const idxDataEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('data_ensaio'));
    // Busca flexível pelo campo "tocou no último ensaio"
    const idxTocou = headerRow.findIndex(h => {
      if (!h) return false;
      const hLower = h.toString().toLowerCase();
      return hLower.includes('tocou') && (hLower.includes('ultimo') || hLower.includes('último') || hLower.includes('ultima') || hLower.includes('última'));
    });

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }
    
    // Se localEnsaio não foi fornecido ou está vazio, tenta extrair da planilha
    if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '' || localEnsaio === 'Itapevi') {
      console.log(`⚠️ [alimentarAbaOrganistasItapevi] localEnsaio não fornecido ou padrão, tentando extrair da planilha...`);
      
      if (idxLocalEnsaio >= 0) {
        // Pega o primeiro local encontrado nos dados que pertence a esta localidade
        for (let i = 0; i < Math.min(data.length, 100); i++) {
          const localEncontrado = norm(data[i][idxLocalEnsaio] || '');
          if (localEncontrado && localEncontrado !== '(Sem local definido)' && compararLocaisEnsaio(localEncontrado, 'Itapevi')) {
            localEnsaio = localEncontrado;
            console.log(`✅ [alimentarAbaOrganistasItapevi] Local extraído da planilha: "${localEnsaio}"`);
            break;
          }
        }
      }
      
      // Se ainda não encontrou, usa o padrão
      if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '') {
        localEnsaio = 'Itapevi';
        console.log(`⚠️ [alimentarAbaOrganistasItapevi] Usando local padrão: "${localEnsaio}"`);
      }
    }
    
    console.log(`📍 [alimentarAbaOrganistasItapevi] Local de ensaio final: "${localEnsaio}"`);
    
    // Buscar a data do ensaio (pegar a primeira data encontrada nos dados deste local)
    let dataEnsaioAtual = null;
    if (idxDataEnsaio >= 0) {
      for (let i = 0; i < data.length; i++) {
        const dataEnsaio = norm(data[i][idxDataEnsaio] || '');
        if (dataEnsaio && compararLocaisEnsaio(norm(data[i][idxLocalEnsaio] || ''), localEnsaio)) {
          dataEnsaioAtual = dataEnsaio;
          break; // Usar a primeira data encontrada para este local
        }
      }
    }
    
    if (!dataEnsaioAtual) {
      console.log(`⚠️ Data do ensaio não encontrada para o local ${localEnsaio}`);
    } else {
      console.log(`📅 Data do ensaio atual: ${dataEnsaioAtual}`);
    }

    // Filtra dados para organistas, examinadoras, instrutoras e secretárias da música do local especificado
    const organistas = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const nivel = norm(row[idxNivel] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      const tocou = idxTocou >= 0 ? norm(row[idxTocou] || '') : '';
      
      const cargoLower = cargo.toLowerCase();
      const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                                 (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                                 !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
      const isOrganista = cargoLower.includes('organista') || 
                         cargoLower.includes('examinadora') || 
                         cargoLower.includes('instrutora') ||
                         isSecretariaMusica;
      
      const isLocalCorreto = compararLocaisEnsaio(localEnsaioRow, localEnsaio);
      
      // LÓGICA SIMPLES: Se está registrado na planilha principal com o local correto, esteve presente
      if (isOrganista && isLocalCorreto) {
        organistas.push({
          nome,
          cargo,
          nivel,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          tocou: tocou,
          _ord: i
        });
        console.log(`🎹 Organista encontrada: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontradas ${organistas.length} organistas para o local: ${localEnsaio}`);

    // Função para determinar a prioridade de ordenação do cargo
    // Ordem: 1-Examinadoras, 2-Secretárias da Música, 3-Instrutoras, 4-Organistas
    function obterPrioridadeCargo(cargo) {
      const cargoLower = cargo.toLowerCase();
      if (cargoLower.includes('examinadora')) {
        return 1; // Examinadoras primeiro
      } else if ((cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                 (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                 !cargoLower.includes('secretário') && !cargoLower.includes('secretario')) {
        return 2; // Secretárias da Música segundo
      } else if (cargoLower.includes('instrutora')) {
        return 3; // Instrutoras terceiro
      } else if (cargoLower.includes('organista')) {
        return 4; // Organistas por último
      }
      return 5; // Outros (não deveria acontecer, mas por segurança)
    }

    // Ordena as organistas: primeiro por prioridade do cargo, depois por ordem de chegada (_ord)
    organistas.sort((a, b) => {
      const prioridadeA = obterPrioridadeCargo(a.cargo);
      const prioridadeB = obterPrioridadeCargo(b.cargo);
      
      // Se as prioridades são diferentes, ordena por prioridade
      if (prioridadeA !== prioridadeB) {
        return prioridadeA - prioridadeB;
      }
      
      // Se as prioridades são iguais, mantém a ordem de chegada (ordem original)
      return a._ord - b._ord;
    });

    console.log(`📋 Organistas ordenadas: Examinadoras → Secretárias da Música → Instrutoras → Organistas (mantendo ordem de chegada dentro de cada categoria)`);

    // Acessa a planilha externa de Itapevi
    const ssItapevi = openItapeviSheet();
    
    // Cria ou limpa a aba Organistas
    let shOrganistas = ssItapevi.getSheetByName('Organistas');
    if (!shOrganistas) {
      shOrganistas = ssItapevi.insertSheet('Organistas');
      console.log(`✅ Nova aba Organistas criada na planilha externa de Itapevi`);
    } else {
      // Só limpa se não há organistas para inserir (otimização)
      if (organistas.length === 0) {
        const ultimaLinha = shOrganistas.getLastRow();
        if (ultimaLinha > 4) {
          shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
          console.log(`✅ Dados limpos na aba Organistas (nenhum organista encontrado para ${localEnsaio})`);
        }
      } else {
        // Se há organistas, limpa apenas o necessário para evitar conflitos
        const ultimaLinha = shOrganistas.getLastRow();
        if (ultimaLinha > 4) {
          shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
          console.log(`✅ Dados limpos na aba Organistas (preparando para inserir ${organistas.length} organistas)`);
        }
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shOrganistas.getRange(4, 1, 1, 7).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shOrganistas.getRange(4, 1, 1, 7).setValues([[
        'ID', 'Nome', 'Cargo', 'Nível', 'Comum', 'Cidade', 'Tocou no último ensaio?'
      ]]);
      shOrganistas.getRange(4, 1, 1, 7).setFontWeight('bold');
      shOrganistas.getRange(4, 1, 1, 7).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 7 colunas (incluindo ID)`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (organistas.length > 0) {
      // BUSCAR TODOS OS REGISTROS DE UMA VEZ (evita múltiplas chamadas HTTP)
      let registrosTocou = [];
      try {
        console.log(`🔍 [alimentarAbaOrganistasItapevi] Buscando registros de "tocou" para local: "${localEnsaio}"`);
        registrosTocou = buscarTodosRegistrosTocou(localEnsaio);
        console.log(`📊 [alimentarAbaOrganistasItapevi] Total de registros retornados: ${registrosTocou.length}`);
      } catch (e) {
        // Se falhar, continua sem os registros (coluna ficará vazia)
        console.log(`❌ [alimentarAbaOrganistasItapevi] Erro ao buscar registros: ${e.toString()}`);
        registrosTocou = [];
      }
      
      const dadosParaInserir = organistas.map((org, index) => {
        // Nível automático para Instrutoras, Examinadora e Secretárias da Música (feminino)
        const cargoLower = org.cargo.toLowerCase();
        const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                                   (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                                   !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
        const nivelAuto = (cargoLower.includes('instrutora') || 
                          cargoLower.includes('examinadora') || 
                          isSecretariaMusica)
                         ? 'OFICIALIZADA' : (org.nivel || '');
        
        // Buscar se tocou nos registros já carregados (sem fazer nova chamada HTTP)
        let tocouFormatado = '';
        try {
          console.log(`🔍 [alimentarAbaOrganistasItapevi] Buscando "tocou" para organista ${index + 1}/${organistas.length}: "${org.nome}"`);
          tocouFormatado = buscarTocouNosRegistros(org.nome, registrosTocou);
          console.log(`📝 [alimentarAbaOrganistasItapevi] Resultado para "${org.nome}": "${tocouFormatado}"`);
        } catch (e) {
          // Se falhar, deixa vazio
          console.log(`⚠️ [alimentarAbaOrganistasItapevi] Erro ao buscar "tocou" para ${org.nome}: ${e.toString()}`);
          tocouFormatado = '';
        }
        
        const linhaDados = [
          index + 1, // ID sequencial
          org.nome,
          org.cargo,
          nivelAuto,
          org.comum,
          org.cidade,
          tocouFormatado // Tocou no último ensaio? ('SIM', 'NÃO' ou '')
        ];
        
        console.log(`📋 [alimentarAbaOrganistasItapevi] Linha ${index + 1} preparada: ID=${linhaDados[0]}, Nome="${linhaDados[1]}", Tocou="${linhaDados[6]}"`);
        
        return linhaDados;
      });

      console.log(`📊 [alimentarAbaOrganistasItapevi] Preparando para inserir ${dadosParaInserir.length} linhas na planilha`);
      console.log(`📊 [alimentarAbaOrganistasItapevi] Primeira linha de dados: ${JSON.stringify(dadosParaInserir[0])}`);
      
      shOrganistas.getRange(5, 1, dadosParaInserir.length, 7).setValues(dadosParaInserir);
      console.log(`✅ ${organistas.length} organistas inseridas a partir da linha 5 com IDs sequenciais`);
      
      // Verificar o que foi realmente inserido
      const dadosInseridos = shOrganistas.getRange(5, 1, dadosParaInserir.length, 7).getValues();
      console.log(`🔍 [alimentarAbaOrganistasItapevi] Dados verificados após inserção - Primeira linha: ${JSON.stringify(dadosInseridos[0])}`);
      
      // Contar quantos tiveram "tocou" preenchido
      const tocouPreenchidos = dadosParaInserir.filter(row => row[6] && row[6].trim() !== '').length;
      console.log(`📊 [alimentarAbaOrganistasItapevi] Total de organistas com "tocou" preenchido: ${tocouPreenchidos} de ${organistas.length}`);
      
      // Log detalhado de cada organista
      dadosParaInserir.forEach((row, idx) => {
        if (row[6] && row[6].trim() !== '') {
          console.log(`✅ [alimentarAbaOrganistasItapevi] Organista ${idx + 1}: "${row[1]}" -> Tocou: "${row[6]}"`);
        } else {
          console.log(`⚠️ [alimentarAbaOrganistasItapevi] Organista ${idx + 1}: "${row[1]}" -> Tocou: (vazio)`);
        }
      });
    }

    // Formatação
    shOrganistas.getRange(4, 1, 1, 7).setBorder(true, true, true, true, true, true);
    
    // Autoajusta as colunas APÓS inserir os dados
    shOrganistas.autoResizeColumns(1, 7);
    
     // Define larguras específicas para colunas B, C, D, E e G
     shOrganistas.setColumnWidth(2, 405); // Coluna B (Nome)
     shOrganistas.setColumnWidth(3, 220); // Coluna C (Cargo)
     shOrganistas.setColumnWidth(4, 134); // Coluna D (Nível da organista)
     shOrganistas.setColumnWidth(5, 315); // Coluna E (Comum)
     shOrganistas.setColumnWidth(6, 180); // Coluna F (Cidade) - ajustado para 180px
     shOrganistas.setColumnWidth(7, 180); // Coluna G (Tocou no último ensaio?)
    
    console.log(`✅ Aba Organistas da planilha externa de Itapevi alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Organistas',
      planilhaId: ITAPEVI_SHEET_ID,
      totalOrganistas: organistas.length,
      organistas: organistas.map(org => org.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Organistas da planilha externa de Itapevi para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Ministério da planilha de Itapevi

function alimentarAbaOrganistasVargemGrande(localEnsaio = 'VargemGrande') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Organistas na planilha externa de VargemGrande para: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Busca flexível pelos headers
    const idxNome = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nome'));
    const idxCargo = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('cargo'));
    const idxNivel = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nivel') || h.toString().toLowerCase().includes('classe'));
    const idxComum = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('comum'));
    const idxCidade = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('cidade') || 
      h.toString().toLowerCase().includes('municipio') || 
      h.toString().toLowerCase().includes('município') ||
      h.toString().toLowerCase().includes('localidade')
    ));
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));
    const idxVaiTocar = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('vai_tocar'));
    const idxDataEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('data_ensaio'));
    // Busca flexível pelo campo "tocou no último ensaio"
    const idxTocou = headerRow.findIndex(h => {
      if (!h) return false;
      const hLower = h.toString().toLowerCase();
      return hLower.includes('tocou') && (hLower.includes('ultimo') || hLower.includes('último') || hLower.includes('ultima') || hLower.includes('última'));
    });

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Se localEnsaio não foi fornecido ou está vazio, tenta extrair da planilha
    if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '' || localEnsaio === 'VargemGrande') {
      console.log(`⚠️ [alimentarAbaOrganistasVargemGrande] localEnsaio não fornecido ou padrão, tentando extrair da planilha...`);
      
      if (idxLocalEnsaio >= 0) {
        // Pega o primeiro local encontrado nos dados que pertence a esta localidade
        for (let i = 0; i < Math.min(data.length, 100); i++) {
          const localEncontrado = norm(data[i][idxLocalEnsaio] || '');
          if (localEncontrado && localEncontrado !== '(Sem local definido)' && compararLocaisEnsaio(localEncontrado, 'VargemGrande')) {
            localEnsaio = localEncontrado;
            console.log(`✅ [alimentarAbaOrganistasVargemGrande] Local extraído da planilha: "${localEnsaio}"`);
            break;
          }
        }
      }
      
      // Se ainda não encontrou, usa o padrão
      if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '') {
        localEnsaio = 'VargemGrande';
        console.log(`⚠️ [alimentarAbaOrganistasVargemGrande] Usando local padrão: "${localEnsaio}"`);
      }
    }
    
    // Buscar a data do ensaio (pegar a primeira data encontrada nos dados deste local)
    let dataEnsaioAtual = null;
    if (idxDataEnsaio >= 0) {
      for (let i = 0; i < data.length; i++) {
        const dataEnsaio = norm(data[i][idxDataEnsaio] || '');
        if (dataEnsaio && compararLocaisEnsaio(norm(data[i][idxLocalEnsaio] || ''), localEnsaio)) {
          dataEnsaioAtual = dataEnsaio;
          break; // Usar a primeira data encontrada para este local
        }
      }
    }
    
    if (!dataEnsaioAtual) {
      console.log(`⚠️ Data do ensaio não encontrada para o local ${localEnsaio}`);
    } else {
      console.log(`📅 Data do ensaio atual: ${dataEnsaioAtual}`);
    }

    // Filtra dados para organistas, examinadoras, instrutoras e secretárias da música do local especificado
    const organistas = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const nivel = norm(row[idxNivel] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      const tocou = idxTocou >= 0 ? norm(row[idxTocou] || '') : '';
      
      const cargoLower = cargo.toLowerCase();
      const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                                 (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                                 !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
      const isOrganista = cargoLower.includes('organista') || 
                         cargoLower.includes('examinadora') || 
                         cargoLower.includes('instrutora') ||
                         isSecretariaMusica;
      
      const isLocalCorreto = compararLocaisEnsaio(localEnsaioRow, localEnsaio);
      
      // LÓGICA SIMPLES: Se está registrado na planilha principal com o local correto, esteve presente
      if (isOrganista && isLocalCorreto) {
        organistas.push({
          nome,
          cargo,
          nivel,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          tocou: tocou,
          _ord: i
        });
        console.log(`🎹 Organista encontrada: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontradas ${organistas.length} organistas para o local: ${localEnsaio}`);

    // Função para determinar a prioridade de ordenação do cargo
    // Ordem: 1-Examinadoras, 2-Secretárias da Música, 3-Instrutoras, 4-Organistas
    function obterPrioridadeCargo(cargo) {
      const cargoLower = cargo.toLowerCase();
      if (cargoLower.includes('examinadora')) {
        return 1; // Examinadoras primeiro
      } else if ((cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                 (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                 !cargoLower.includes('secretário') && !cargoLower.includes('secretario')) {
        return 2; // Secretárias da Música segundo
      } else if (cargoLower.includes('instrutora')) {
        return 3; // Instrutoras terceiro
      } else if (cargoLower.includes('organista')) {
        return 4; // Organistas por último
      }
      return 5; // Outros (não deveria acontecer, mas por segurança)
    }

    // Ordena as organistas: primeiro por prioridade do cargo, depois por ordem de chegada (_ord)
    organistas.sort((a, b) => {
      const prioridadeA = obterPrioridadeCargo(a.cargo);
      const prioridadeB = obterPrioridadeCargo(b.cargo);
      
      // Se as prioridades são diferentes, ordena por prioridade
      if (prioridadeA !== prioridadeB) {
        return prioridadeA - prioridadeB;
      }
      
      // Se as prioridades são iguais, mantém a ordem de chegada (ordem original)
      return a._ord - b._ord;
    });

    console.log(`📋 Organistas ordenadas: Examinadoras → Secretárias da Música → Instrutoras → Organistas (mantendo ordem de chegada dentro de cada categoria)`);

    // Acessa a planilha externa de VargemGrande
    const ssVargemGrande = openVargemGrandeSheet();
    
    // Cria ou limpa a aba Organistas
    let shOrganistas = ssVargemGrande.getSheetByName('Organistas');
    if (!shOrganistas) {
      shOrganistas = ssVargemGrande.insertSheet('Organistas');
      console.log(`✅ Nova aba Organistas criada na planilha externa de VargemGrande`);
    } else {
      // Só limpa se não há organistas para inserir (otimização)
      if (organistas.length === 0) {
        const ultimaLinha = shOrganistas.getLastRow();
        if (ultimaLinha > 4) {
          shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
          console.log(`✅ Dados limpos na aba Organistas (nenhum organista encontrado para ${localEnsaio})`);
        }
      } else {
        // Se há organistas, limpa apenas o necessário para evitar conflitos
        const ultimaLinha = shOrganistas.getLastRow();
        if (ultimaLinha > 4) {
          shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
          console.log(`✅ Dados limpos na aba Organistas (preparando para inserir ${organistas.length} organistas)`);
        }
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shOrganistas.getRange(4, 1, 1, 7).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shOrganistas.getRange(4, 1, 1, 7).setValues([[
        'ID', 'Nome', 'Cargo', 'Nível', 'Comum', 'Cidade', 'Tocou no último ensaio?'
      ]]);
      shOrganistas.getRange(4, 1, 1, 7).setFontWeight('bold');
      shOrganistas.getRange(4, 1, 1, 7).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 7 colunas (incluindo ID)`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (organistas.length > 0) {
      // BUSCAR TODOS OS REGISTROS DE UMA VEZ (evita múltiplas chamadas HTTP)
      let registrosTocou = [];
      try {
        registrosTocou = buscarTodosRegistrosTocou(localEnsaio);
      } catch (e) {
        // Se falhar, continua sem os registros (coluna ficará vazia)
        registrosTocou = [];
      }
      
      const dadosParaInserir = organistas.map((org, index) => {
        // Nível automático para Instrutoras, Examinadora e Secretárias da Música (feminino)
        const cargoLower = org.cargo.toLowerCase();
        const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                                   (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                                   !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
        const nivelAuto = (cargoLower.includes('instrutora') || 
                          cargoLower.includes('examinadora') || 
                          isSecretariaMusica)
                         ? 'OFICIALIZADA' : (org.nivel || '');
        
        // Buscar se tocou nos registros já carregados (sem fazer nova chamada HTTP)
        let tocouFormatado = '';
        try {
          tocouFormatado = buscarTocouNosRegistros(org.nome, registrosTocou);
        } catch (e) {
          // Se falhar, deixa vazio
          tocouFormatado = '';
        }
        
        return [
          index + 1, // ID sequencial
          org.nome,
          org.cargo,
          nivelAuto,
          org.comum,
          org.cidade,
          tocouFormatado // Tocou no último ensaio? ('SIM', 'NÃO' ou '')
        ];
      });

      shOrganistas.getRange(5, 1, dadosParaInserir.length, 7).setValues(dadosParaInserir);
      console.log(`✅ ${organistas.length} organistas inseridas a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shOrganistas.getRange(4, 1, 1, 7).setBorder(true, true, true, true, true, true);
    
    // Autoajusta as colunas APÓS inserir os dados
    shOrganistas.autoResizeColumns(1, 7);
    
     // Define larguras específicas para colunas B, C, D, E e G
     shOrganistas.setColumnWidth(2, 405); // Coluna B (Nome)
     shOrganistas.setColumnWidth(3, 220); // Coluna C (Cargo)
     shOrganistas.setColumnWidth(4, 134); // Coluna D (Nível da organista)
     shOrganistas.setColumnWidth(5, 315); // Coluna E (Comum)
     shOrganistas.setColumnWidth(6, 180); // Coluna F (Cidade) - ajustado para 180px
     shOrganistas.setColumnWidth(7, 180); // Coluna G (Tocou no último ensaio?)
    
    console.log(`✅ Aba Organistas da planilha externa de VargemGrande alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Organistas',
      planilhaId: VARGEMGRANDE_SHEET_ID,
      totalOrganistas: organistas.length,
      organistas: organistas.map(org => org.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Organistas da planilha externa de VargemGrande para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Organistas da planilha de Pirapora

function alimentarAbaOrganistasPirapora(localEnsaio = 'Pirapora') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Organistas na planilha externa de Pirapora para: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Busca flexível pelos headers
    const idxNome = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nome'));
    const idxCargo = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('cargo'));
    const idxNivel = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nivel') || h.toString().toLowerCase().includes('classe'));
    const idxComum = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('comum'));
    const idxCidade = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('cidade') || 
      h.toString().toLowerCase().includes('municipio') || 
      h.toString().toLowerCase().includes('município') ||
      h.toString().toLowerCase().includes('localidade')
    ));
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));
    const idxVaiTocar = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('vai_tocar'));
    const idxDataEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('data_ensaio'));
    // Busca flexível pelo campo "tocou no último ensaio"
    const idxTocou = headerRow.findIndex(h => {
      if (!h) return false;
      const hLower = h.toString().toLowerCase();
      return hLower.includes('tocou') && (hLower.includes('ultimo') || hLower.includes('último') || hLower.includes('ultima') || hLower.includes('última'));
    });

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Se localEnsaio não foi fornecido ou está vazio, tenta extrair da planilha
    if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '' || localEnsaio === 'Pirapora') {
      console.log(`⚠️ [alimentarAbaOrganistasPirapora] localEnsaio não fornecido ou padrão, tentando extrair da planilha...`);
      
      if (idxLocalEnsaio >= 0) {
        // Pega o primeiro local encontrado nos dados que pertence a esta localidade
        for (let i = 0; i < Math.min(data.length, 100); i++) {
          const localEncontrado = norm(data[i][idxLocalEnsaio] || '');
          if (localEncontrado && localEncontrado !== '(Sem local definido)' && compararLocaisEnsaio(localEncontrado, 'Pirapora')) {
            localEnsaio = localEncontrado;
            console.log(`✅ [alimentarAbaOrganistasPirapora] Local extraído da planilha: "${localEnsaio}"`);
            break;
          }
        }
      }
      
      // Se ainda não encontrou, usa o padrão
      if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '') {
        localEnsaio = 'Pirapora';
        console.log(`⚠️ [alimentarAbaOrganistasPirapora] Usando local padrão: "${localEnsaio}"`);
      }
    }
    
    // Buscar a data do ensaio (pegar a primeira data encontrada nos dados deste local)
    let dataEnsaioAtual = null;
    if (idxDataEnsaio >= 0) {
      for (let i = 0; i < data.length; i++) {
        const dataEnsaio = norm(data[i][idxDataEnsaio] || '');
        if (dataEnsaio && compararLocaisEnsaio(norm(data[i][idxLocalEnsaio] || ''), localEnsaio)) {
          dataEnsaioAtual = dataEnsaio;
          break; // Usar a primeira data encontrada para este local
        }
      }
    }
    
    if (!dataEnsaioAtual) {
      console.log(`⚠️ Data do ensaio não encontrada para o local ${localEnsaio}`);
    } else {
      console.log(`📅 Data do ensaio atual: ${dataEnsaioAtual}`);
    }

    // Filtra dados para organistas, examinadoras, instrutoras e secretárias da música do local especificado
    const organistas = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const nivel = norm(row[idxNivel] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      const tocou = idxTocou >= 0 ? norm(row[idxTocou] || '') : '';
      
      const cargoLower = cargo.toLowerCase();
      const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                                 (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                                 !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
      const isOrganista = cargoLower.includes('organista') || 
                         cargoLower.includes('examinadora') || 
                         cargoLower.includes('instrutora') ||
                         isSecretariaMusica;
      
      const isLocalCorreto = compararLocaisEnsaio(localEnsaioRow, localEnsaio);
      
      // LÓGICA SIMPLES: Se está registrado na planilha principal com o local correto, esteve presente
      if (isOrganista && isLocalCorreto) {
        organistas.push({
          nome,
          cargo,
          nivel,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          tocou: tocou,
          _ord: i
        });
        console.log(`🎹 Organista encontrada: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontradas ${organistas.length} organistas para o local: ${localEnsaio}`);

    // Função para determinar a prioridade de ordenação do cargo
    // Ordem: 1-Examinadoras, 2-Secretárias da Música, 3-Instrutoras, 4-Organistas
    function obterPrioridadeCargo(cargo) {
      const cargoLower = cargo.toLowerCase();
      if (cargoLower.includes('examinadora')) {
        return 1; // Examinadoras primeiro
      } else if ((cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                 (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                 !cargoLower.includes('secretário') && !cargoLower.includes('secretario')) {
        return 2; // Secretárias da Música segundo
      } else if (cargoLower.includes('instrutora')) {
        return 3; // Instrutoras terceiro
      } else if (cargoLower.includes('organista')) {
        return 4; // Organistas por último
      }
      return 5; // Outros (não deveria acontecer, mas por segurança)
    }

    // Ordena as organistas: primeiro por prioridade do cargo, depois por ordem de chegada (_ord)
    organistas.sort((a, b) => {
      const prioridadeA = obterPrioridadeCargo(a.cargo);
      const prioridadeB = obterPrioridadeCargo(b.cargo);
      
      // Se as prioridades são diferentes, ordena por prioridade
      if (prioridadeA !== prioridadeB) {
        return prioridadeA - prioridadeB;
      }
      
      // Se as prioridades são iguais, mantém a ordem de chegada (ordem original)
      return a._ord - b._ord;
    });

    console.log(`📋 Organistas ordenadas: Examinadoras → Secretárias da Música → Instrutoras → Organistas (mantendo ordem de chegada dentro de cada categoria)`);

    // Acessa a planilha externa de Pirapora
    const ssPirapora = openPiraporaSheet();
    
    // Cria ou limpa a aba Organistas
    let shOrganistas = ssPirapora.getSheetByName('Organistas');
    if (!shOrganistas) {
      shOrganistas = ssPirapora.insertSheet('Organistas');
      console.log(`✅ Nova aba Organistas criada na planilha externa de Pirapora`);
    } else {
      // Só limpa se não há organistas para inserir (otimização)
      if (organistas.length === 0) {
        const ultimaLinha = shOrganistas.getLastRow();
        if (ultimaLinha > 4) {
          shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
          console.log(`✅ Dados limpos na aba Organistas (nenhum organista encontrado para ${localEnsaio})`);
        }
      } else {
        // Se há organistas, limpa apenas o necessário para evitar conflitos
        const ultimaLinha = shOrganistas.getLastRow();
        if (ultimaLinha > 4) {
          shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
          console.log(`✅ Dados limpos na aba Organistas (preparando para inserir ${organistas.length} organistas)`);
        }
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shOrganistas.getRange(4, 1, 1, 7).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shOrganistas.getRange(4, 1, 1, 7).setValues([[
        'ID', 'Nome', 'Cargo', 'Nível', 'Comum', 'Cidade', 'Tocou no último ensaio?'
      ]]);
      shOrganistas.getRange(4, 1, 1, 7).setFontWeight('bold');
      shOrganistas.getRange(4, 1, 1, 7).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 7 colunas (incluindo ID)`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (organistas.length > 0) {
      // BUSCAR TODOS OS REGISTROS DE UMA VEZ (evita múltiplas chamadas HTTP)
      let registrosTocou = [];
      try {
        registrosTocou = buscarTodosRegistrosTocou(localEnsaio);
      } catch (e) {
        // Se falhar, continua sem os registros (coluna ficará vazia)
        registrosTocou = [];
      }
      
      const dadosParaInserir = organistas.map((org, index) => {
        // Nível automático para Instrutoras, Examinadora e Secretárias da Música (feminino)
        const cargoLower = org.cargo.toLowerCase();
        const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                                   (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                                   !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
        const nivelAuto = (cargoLower.includes('instrutora') || 
                          cargoLower.includes('examinadora') || 
                          isSecretariaMusica)
                         ? 'OFICIALIZADA' : (org.nivel || '');
        
        // Buscar se tocou nos registros já carregados (sem fazer nova chamada HTTP)
        let tocouFormatado = '';
        try {
          tocouFormatado = buscarTocouNosRegistros(org.nome, registrosTocou);
        } catch (e) {
          // Se falhar, deixa vazio
          tocouFormatado = '';
        }
        
        return [
          index + 1, // ID sequencial
          org.nome,
          org.cargo,
          nivelAuto,
          org.comum,
          org.cidade,
          tocouFormatado // Tocou no último ensaio? ('SIM', 'NÃO' ou '')
        ];
      });

      shOrganistas.getRange(5, 1, dadosParaInserir.length, 7).setValues(dadosParaInserir);
      console.log(`✅ ${organistas.length} organistas inseridas a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shOrganistas.getRange(4, 1, 1, 7).setBorder(true, true, true, true, true, true);
    
    // Autoajusta as colunas APÓS inserir os dados
    shOrganistas.autoResizeColumns(1, 7);
    
     // Define larguras específicas para colunas B, C, D, E e G
     shOrganistas.setColumnWidth(2, 405); // Coluna B (Nome)
     shOrganistas.setColumnWidth(3, 220); // Coluna C (Cargo)
     shOrganistas.setColumnWidth(4, 134); // Coluna D (Nível da organista)
     shOrganistas.setColumnWidth(5, 315); // Coluna E (Comum)
     shOrganistas.setColumnWidth(6, 180); // Coluna F (Cidade) - ajustado para 180px
     shOrganistas.setColumnWidth(7, 180); // Coluna G (Tocou no último ensaio?)
    
    console.log(`✅ Aba Organistas da planilha externa de Pirapora alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Organistas',
      planilhaId: PIRAPORA_SHEET_ID,
      totalOrganistas: organistas.length,
      organistas: organistas.map(org => org.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Organistas da planilha externa de Pirapora para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Organistas da planilha de Fazendinha

function alimentarAbaOrganistasFazendinha(localEnsaio = 'Fazendinha') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Organistas na planilha externa de Fazendinha para: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Busca flexível pelos headers
    const idxNome = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nome'));
    const idxCargo = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('cargo'));
    const idxNivel = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nivel') || h.toString().toLowerCase().includes('classe'));
    const idxComum = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('comum'));
    const idxCidade = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('cidade') || 
      h.toString().toLowerCase().includes('municipio') || 
      h.toString().toLowerCase().includes('município') ||
      h.toString().toLowerCase().includes('localidade')
    ));
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));
    const idxVaiTocar = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('vai_tocar'));
    const idxDataEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('data_ensaio'));
    // Busca flexível pelo campo "tocou no último ensaio"
    const idxTocou = headerRow.findIndex(h => {
      if (!h) return false;
      const hLower = h.toString().toLowerCase();
      return hLower.includes('tocou') && (hLower.includes('ultimo') || hLower.includes('último') || hLower.includes('ultima') || hLower.includes('última'));
    });

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Se localEnsaio não foi fornecido ou está vazio, tenta extrair da planilha
    if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '' || localEnsaio === 'Fazendinha') {
      console.log(`⚠️ [alimentarAbaOrganistasFazendinha] localEnsaio não fornecido ou padrão, tentando extrair da planilha...`);
      
      if (idxLocalEnsaio >= 0) {
        // Pega o primeiro local encontrado nos dados que pertence a esta localidade
        for (let i = 0; i < Math.min(data.length, 100); i++) {
          const localEncontrado = norm(data[i][idxLocalEnsaio] || '');
          if (localEncontrado && localEncontrado !== '(Sem local definido)' && compararLocaisEnsaio(localEncontrado, 'Fazendinha')) {
            localEnsaio = localEncontrado;
            console.log(`✅ [alimentarAbaOrganistasFazendinha] Local extraído da planilha: "${localEnsaio}"`);
            break;
          }
        }
      }
      
      // Se ainda não encontrou, usa o padrão
      if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '') {
        localEnsaio = 'Fazendinha';
        console.log(`⚠️ [alimentarAbaOrganistasFazendinha] Usando local padrão: "${localEnsaio}"`);
      }
    }
    
    // Buscar a data do ensaio (pegar a primeira data encontrada nos dados deste local)
    let dataEnsaioAtual = null;
    if (idxDataEnsaio >= 0) {
      for (let i = 0; i < data.length; i++) {
        const dataEnsaio = norm(data[i][idxDataEnsaio] || '');
        if (dataEnsaio && compararLocaisEnsaio(norm(data[i][idxLocalEnsaio] || ''), localEnsaio)) {
          dataEnsaioAtual = dataEnsaio;
          break; // Usar a primeira data encontrada para este local
        }
      }
    }
    
    if (!dataEnsaioAtual) {
      console.log(`⚠️ Data do ensaio não encontrada para o local ${localEnsaio}`);
    } else {
      console.log(`📅 Data do ensaio atual: ${dataEnsaioAtual}`);
    }

    // Filtra dados para organistas, examinadoras, instrutoras e secretárias da música do local especificado
    const organistas = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const nivel = norm(row[idxNivel] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      const tocou = idxTocou >= 0 ? norm(row[idxTocou] || '') : '';
      
      const cargoLower = cargo.toLowerCase();
      const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                                 (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                                 !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
      const isOrganista = cargoLower.includes('organista') || 
                         cargoLower.includes('examinadora') || 
                         cargoLower.includes('instrutora') ||
                         isSecretariaMusica;
      
      const isLocalCorreto = compararLocaisEnsaio(localEnsaioRow, localEnsaio);
      
      // LÓGICA SIMPLES: Se está registrado na planilha principal com o local correto, esteve presente
      if (isOrganista && isLocalCorreto) {
        organistas.push({
          nome,
          cargo,
          nivel,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          tocou: tocou,
          _ord: i
        });
        console.log(`🎹 Organista encontrada: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontradas ${organistas.length} organistas para o local: ${localEnsaio}`);

    // Função para determinar a prioridade de ordenação do cargo
    // Ordem: 1-Examinadoras, 2-Secretárias da Música, 3-Instrutoras, 4-Organistas
    function obterPrioridadeCargo(cargo) {
      const cargoLower = cargo.toLowerCase();
      if (cargoLower.includes('examinadora')) {
        return 1; // Examinadoras primeiro
      } else if ((cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                 (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                 !cargoLower.includes('secretário') && !cargoLower.includes('secretario')) {
        return 2; // Secretárias da Música segundo
      } else if (cargoLower.includes('instrutora')) {
        return 3; // Instrutoras terceiro
      } else if (cargoLower.includes('organista')) {
        return 4; // Organistas por último
      }
      return 5; // Outros (não deveria acontecer, mas por segurança)
    }

    // Ordena as organistas: primeiro por prioridade do cargo, depois por ordem de chegada (_ord)
    organistas.sort((a, b) => {
      const prioridadeA = obterPrioridadeCargo(a.cargo);
      const prioridadeB = obterPrioridadeCargo(b.cargo);
      
      // Se as prioridades são diferentes, ordena por prioridade
      if (prioridadeA !== prioridadeB) {
        return prioridadeA - prioridadeB;
      }
      
      // Se as prioridades são iguais, mantém a ordem de chegada (ordem original)
      return a._ord - b._ord;
    });

    console.log(`📋 Organistas ordenadas: Examinadoras → Secretárias da Música → Instrutoras → Organistas (mantendo ordem de chegada dentro de cada categoria)`);

    // Acessa a planilha externa de Fazendinha
    const ssFazendinha = openFazendinhaSheet();
    
    // Cria ou limpa a aba Organistas
    let shOrganistas = ssFazendinha.getSheetByName('Organistas');
    if (!shOrganistas) {
      shOrganistas = ssFazendinha.insertSheet('Organistas');
      console.log(`✅ Nova aba Organistas criada na planilha externa de Fazendinha`);
    } else {
      // Só limpa se não há organistas para inserir (otimização)
      if (organistas.length === 0) {
        const ultimaLinha = shOrganistas.getLastRow();
        if (ultimaLinha > 4) {
          shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
          console.log(`✅ Dados limpos na aba Organistas (nenhum organista encontrado para ${localEnsaio})`);
        }
      } else {
        // Se há organistas, limpa apenas o necessário para evitar conflitos
        const ultimaLinha = shOrganistas.getLastRow();
        if (ultimaLinha > 4) {
          shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
          console.log(`✅ Dados limpos na aba Organistas (preparando para inserir ${organistas.length} organistas)`);
        }
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shOrganistas.getRange(4, 1, 1, 7).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shOrganistas.getRange(4, 1, 1, 7).setValues([[
        'ID', 'Nome', 'Cargo', 'Nível', 'Comum', 'Cidade', 'Tocou no último ensaio?'
      ]]);
      shOrganistas.getRange(4, 1, 1, 7).setFontWeight('bold');
      shOrganistas.getRange(4, 1, 1, 7).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 7 colunas (incluindo ID)`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (organistas.length > 0) {
      // BUSCAR TODOS OS REGISTROS DE UMA VEZ (evita múltiplas chamadas HTTP)
      let registrosTocou = [];
      try {
        registrosTocou = buscarTodosRegistrosTocou(localEnsaio);
      } catch (e) {
        // Se falhar, continua sem os registros (coluna ficará vazia)
        registrosTocou = [];
      }
      
      const dadosParaInserir = organistas.map((org, index) => {
        // Nível automático para Instrutoras, Examinadora e Secretárias da Música (feminino)
        const cargoLower = org.cargo.toLowerCase();
        const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                                   (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                                   !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
        const nivelAuto = (cargoLower.includes('instrutora') || 
                          cargoLower.includes('examinadora') || 
                          isSecretariaMusica)
                         ? 'OFICIALIZADA' : (org.nivel || '');
        
        // Buscar se tocou nos registros já carregados (sem fazer nova chamada HTTP)
        let tocouFormatado = '';
        try {
          tocouFormatado = buscarTocouNosRegistros(org.nome, registrosTocou);
        } catch (e) {
          // Se falhar, deixa vazio
          tocouFormatado = '';
        }
        
        return [
          index + 1, // ID sequencial
          org.nome,
          org.cargo,
          nivelAuto,
          org.comum,
          org.cidade,
          tocouFormatado // Tocou no último ensaio? ('SIM', 'NÃO' ou '')
        ];
      });

      shOrganistas.getRange(5, 1, dadosParaInserir.length, 7).setValues(dadosParaInserir);
      console.log(`✅ ${organistas.length} organistas inseridas a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shOrganistas.getRange(4, 1, 1, 7).setBorder(true, true, true, true, true, true);
    
    // Autoajusta as colunas APÓS inserir os dados
    shOrganistas.autoResizeColumns(1, 7);
    
     // Define larguras específicas para colunas B, C, D, E e G
     shOrganistas.setColumnWidth(2, 405); // Coluna B (Nome)
     shOrganistas.setColumnWidth(3, 220); // Coluna C (Cargo)
     shOrganistas.setColumnWidth(4, 134); // Coluna D (Nível da organista)
     shOrganistas.setColumnWidth(5, 315); // Coluna E (Comum)
     shOrganistas.setColumnWidth(6, 180); // Coluna F (Cidade) - ajustado para 180px
     shOrganistas.setColumnWidth(7, 180); // Coluna G (Tocou no último ensaio?)
    
    console.log(`✅ Aba Organistas da planilha externa de Fazendinha alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Organistas',
      planilhaId: FAZENDINHA_SHEET_ID,
      totalOrganistas: organistas.length,
      organistas: organistas.map(org => org.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Organistas da planilha externa de Fazendinha para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Organistas da planilha de Jandira

function alimentarAbaOrganistasJandira(localEnsaio = 'Jandira') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Organistas na planilha externa de Jandira para: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Busca flexível pelos headers
    const idxNome = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nome'));
    const idxCargo = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('cargo'));
    const idxNivel = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nivel') || h.toString().toLowerCase().includes('classe'));
    const idxComum = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('comum'));
    const idxCidade = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('cidade') || 
      h.toString().toLowerCase().includes('municipio') || 
      h.toString().toLowerCase().includes('município') ||
      h.toString().toLowerCase().includes('localidade')
    ));
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));
    const idxVaiTocar = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('vai_tocar'));
    const idxDataEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('data_ensaio'));
    // Busca flexível pelo campo "tocou no último ensaio"
    const idxTocou = headerRow.findIndex(h => {
      if (!h) return false;
      const hLower = h.toString().toLowerCase();
      return hLower.includes('tocou') && (hLower.includes('ultimo') || hLower.includes('último') || hLower.includes('ultima') || hLower.includes('última'));
    });

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Se localEnsaio não foi fornecido ou está vazio, tenta extrair da planilha
    if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '' || localEnsaio === 'Jandira') {
      console.log(`⚠️ [alimentarAbaOrganistasJandira] localEnsaio não fornecido ou padrão, tentando extrair da planilha...`);
      
      if (idxLocalEnsaio >= 0) {
        // Pega o primeiro local encontrado nos dados que pertence a esta localidade
        for (let i = 0; i < Math.min(data.length, 100); i++) {
          const localEncontrado = norm(data[i][idxLocalEnsaio] || '');
          if (localEncontrado && localEncontrado !== '(Sem local definido)' && compararLocaisEnsaio(localEncontrado, 'Jandira')) {
            localEnsaio = localEncontrado;
            console.log(`✅ [alimentarAbaOrganistasJandira] Local extraído da planilha: "${localEnsaio}"`);
            break;
          }
        }
      }
      
      // Se ainda não encontrou, usa o padrão
      if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '') {
        localEnsaio = 'Jandira';
        console.log(`⚠️ [alimentarAbaOrganistasJandira] Usando local padrão: "${localEnsaio}"`);
      }
    }
    
    // Buscar a data do ensaio (pegar a primeira data encontrada nos dados deste local)
    let dataEnsaioAtual = null;
    if (idxDataEnsaio >= 0) {
      for (let i = 0; i < data.length; i++) {
        const dataEnsaio = norm(data[i][idxDataEnsaio] || '');
        if (dataEnsaio && compararLocaisEnsaio(norm(data[i][idxLocalEnsaio] || ''), localEnsaio)) {
          dataEnsaioAtual = dataEnsaio;
          break; // Usar a primeira data encontrada para este local
        }
      }
    }
    
    if (!dataEnsaioAtual) {
      console.log(`⚠️ Data do ensaio não encontrada para o local ${localEnsaio}`);
    } else {
      console.log(`📅 Data do ensaio atual: ${dataEnsaioAtual}`);
    }

    // Filtra dados para organistas, examinadoras, instrutoras e secretárias da música do local especificado
    const organistas = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const nivel = norm(row[idxNivel] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      const tocou = idxTocou >= 0 ? norm(row[idxTocou] || '') : '';
      
      const cargoLower = cargo.toLowerCase();
      const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                                 (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                                 !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
      const isOrganista = cargoLower.includes('organista') || 
                         cargoLower.includes('examinadora') || 
                         cargoLower.includes('instrutora') ||
                         isSecretariaMusica;
      
      const isLocalCorreto = compararLocaisEnsaio(localEnsaioRow, localEnsaio);
      
      // LÓGICA SIMPLES: Se está registrado na planilha principal com o local correto, esteve presente
      if (isOrganista && isLocalCorreto) {
        organistas.push({
          nome,
          cargo,
          nivel,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          tocou: tocou,
          _ord: i
        });
        console.log(`🎹 Organista encontrada: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontradas ${organistas.length} organistas para o local: ${localEnsaio}`);

    // Função para determinar a prioridade de ordenação do cargo
    // Ordem: 1-Examinadoras, 2-Secretárias da Música, 3-Instrutoras, 4-Organistas
    function obterPrioridadeCargo(cargo) {
      const cargoLower = cargo.toLowerCase();
      if (cargoLower.includes('examinadora')) {
        return 1; // Examinadoras primeiro
      } else if ((cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                 (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                 !cargoLower.includes('secretário') && !cargoLower.includes('secretario')) {
        return 2; // Secretárias da Música segundo
      } else if (cargoLower.includes('instrutora')) {
        return 3; // Instrutoras terceiro
      } else if (cargoLower.includes('organista')) {
        return 4; // Organistas por último
      }
      return 5; // Outros (não deveria acontecer, mas por segurança)
    }

    // Ordena as organistas: primeiro por prioridade do cargo, depois por ordem de chegada (_ord)
    organistas.sort((a, b) => {
      const prioridadeA = obterPrioridadeCargo(a.cargo);
      const prioridadeB = obterPrioridadeCargo(b.cargo);
      
      // Se as prioridades são diferentes, ordena por prioridade
      if (prioridadeA !== prioridadeB) {
        return prioridadeA - prioridadeB;
      }
      
      // Se as prioridades são iguais, mantém a ordem de chegada (ordem original)
      return a._ord - b._ord;
    });

    console.log(`📋 Organistas ordenadas: Examinadoras → Secretárias da Música → Instrutoras → Organistas (mantendo ordem de chegada dentro de cada categoria)`);

    // Acessa a planilha externa de Jandira
    const ssJandira = openJandiraSheet();
    
    // Cria ou limpa a aba Organistas
    let shOrganistas = ssJandira.getSheetByName('Organistas');
    if (!shOrganistas) {
      shOrganistas = ssJandira.insertSheet('Organistas');
      console.log(`✅ Nova aba Organistas criada na planilha externa de Jandira`);
    } else {
      // Só limpa se não há organistas para inserir (otimização)
      if (organistas.length === 0) {
        const ultimaLinha = shOrganistas.getLastRow();
        if (ultimaLinha > 4) {
          shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
          console.log(`✅ Dados limpos na aba Organistas (nenhum organista encontrado para ${localEnsaio})`);
        }
      } else {
        // Se há organistas, limpa apenas o necessário para evitar conflitos
        const ultimaLinha = shOrganistas.getLastRow();
        if (ultimaLinha > 4) {
          shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
          console.log(`✅ Dados limpos na aba Organistas (preparando para inserir ${organistas.length} organistas)`);
        }
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shOrganistas.getRange(4, 1, 1, 7).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shOrganistas.getRange(4, 1, 1, 7).setValues([[
        'ID', 'Nome', 'Cargo', 'Nível', 'Comum', 'Cidade', 'Tocou no último ensaio?'
      ]]);
      shOrganistas.getRange(4, 1, 1, 7).setFontWeight('bold');
      shOrganistas.getRange(4, 1, 1, 7).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 7 colunas (incluindo ID)`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (organistas.length > 0) {
      // BUSCAR TODOS OS REGISTROS DE UMA VEZ (evita múltiplas chamadas HTTP)
      let registrosTocou = [];
      try {
        registrosTocou = buscarTodosRegistrosTocou(localEnsaio);
      } catch (e) {
        // Se falhar, continua sem os registros (coluna ficará vazia)
        registrosTocou = [];
      }
      
      const dadosParaInserir = organistas.map((org, index) => {
        // Nível automático para Instrutoras, Examinadora e Secretárias da Música (feminino)
        const cargoLower = org.cargo.toLowerCase();
        const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                                   (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                                   !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
        const nivelAuto = (cargoLower.includes('instrutora') || 
                          cargoLower.includes('examinadora') || 
                          isSecretariaMusica)
                         ? 'OFICIALIZADA' : (org.nivel || '');
        
        // Buscar se tocou nos registros já carregados (sem fazer nova chamada HTTP)
        let tocouFormatado = '';
        try {
          tocouFormatado = buscarTocouNosRegistros(org.nome, registrosTocou);
        } catch (e) {
          // Se falhar, deixa vazio
          tocouFormatado = '';
        }
        
        return [
          index + 1, // ID sequencial
          org.nome,
          org.cargo,
          nivelAuto,
          org.comum,
          org.cidade,
          tocouFormatado // Tocou no último ensaio? ('SIM', 'NÃO' ou '')
        ];
      });

      shOrganistas.getRange(5, 1, dadosParaInserir.length, 7).setValues(dadosParaInserir);
      console.log(`✅ ${organistas.length} organistas inseridas a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shOrganistas.getRange(4, 1, 1, 7).setBorder(true, true, true, true, true, true);
    
    // Autoajusta as colunas APÓS inserir os dados
    shOrganistas.autoResizeColumns(1, 7);
    
     // Define larguras específicas para colunas B, C, D, E e G
     shOrganistas.setColumnWidth(2, 405); // Coluna B (Nome)
     shOrganistas.setColumnWidth(3, 220); // Coluna C (Cargo)
     shOrganistas.setColumnWidth(4, 134); // Coluna D (Nível da organista)
     shOrganistas.setColumnWidth(5, 315); // Coluna E (Comum)
     shOrganistas.setColumnWidth(6, 180); // Coluna F (Cidade) - ajustado para 180px
     shOrganistas.setColumnWidth(7, 180); // Coluna G (Tocou no último ensaio?)
    
    console.log(`✅ Aba Organistas da planilha externa de Jandira alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Organistas',
      planilhaId: JANDIRA_SHEET_ID,
      totalOrganistas: organistas.length,
      organistas: organistas.map(org => org.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Organistas da planilha externa de Jandira para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Organistas da planilha de Caucaia

function alimentarAbaOrganistasCaucaia(localEnsaio = 'Caucaia') {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Organistas na planilha externa de Caucaia para: ${localEnsaio}`);
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Busca flexível pelos headers
    const idxNome = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nome'));
    const idxCargo = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('cargo'));
    const idxNivel = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nivel') || h.toString().toLowerCase().includes('classe'));
    const idxComum = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('comum'));
    const idxCidade = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('cidade') || 
      h.toString().toLowerCase().includes('municipio') || 
      h.toString().toLowerCase().includes('município') ||
      h.toString().toLowerCase().includes('localidade')
    ));
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));
    const idxVaiTocar = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('vai_tocar'));
    const idxDataEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('data_ensaio'));
    // Busca flexível pelo campo "tocou no último ensaio"
    const idxTocou = headerRow.findIndex(h => {
      if (!h) return false;
      const hLower = h.toString().toLowerCase();
      return hLower.includes('tocou') && (hLower.includes('ultimo') || hLower.includes('último') || hLower.includes('ultima') || hLower.includes('última'));
    });

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Se localEnsaio não foi fornecido ou está vazio, tenta extrair da planilha
    if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '' || localEnsaio === 'Caucaia') {
      console.log(`⚠️ [alimentarAbaOrganistasCaucaia] localEnsaio não fornecido ou padrão, tentando extrair da planilha...`);
      
      if (idxLocalEnsaio >= 0) {
        // Pega o primeiro local encontrado nos dados que pertence a esta localidade
        for (let i = 0; i < Math.min(data.length, 100); i++) {
          const localEncontrado = norm(data[i][idxLocalEnsaio] || '');
          if (localEncontrado && localEncontrado !== '(Sem local definido)' && compararLocaisEnsaio(localEncontrado, 'Caucaia')) {
            localEnsaio = localEncontrado;
            console.log(`✅ [alimentarAbaOrganistasCaucaia] Local extraído da planilha: "${localEnsaio}"`);
            break;
          }
        }
      }
      
      // Se ainda não encontrou, usa o padrão
      if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '') {
        localEnsaio = 'Caucaia';
        console.log(`⚠️ [alimentarAbaOrganistasCaucaia] Usando local padrão: "${localEnsaio}"`);
      }
    }
    
    // Buscar a data do ensaio (pegar a primeira data encontrada nos dados deste local)
    let dataEnsaioAtual = null;
    if (idxDataEnsaio >= 0) {
      for (let i = 0; i < data.length; i++) {
        const dataEnsaio = norm(data[i][idxDataEnsaio] || '');
        if (dataEnsaio && compararLocaisEnsaio(norm(data[i][idxLocalEnsaio] || ''), localEnsaio)) {
          dataEnsaioAtual = dataEnsaio;
          break; // Usar a primeira data encontrada para este local
        }
      }
    }
    
    if (!dataEnsaioAtual) {
      console.log(`⚠️ Data do ensaio não encontrada para o local ${localEnsaio}`);
    } else {
      console.log(`📅 Data do ensaio atual: ${dataEnsaioAtual}`);
    }

    // Filtra dados para organistas, examinadoras, instrutoras e secretárias da música do local especificado
    const organistas = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const nivel = norm(row[idxNivel] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      const tocou = idxTocou >= 0 ? norm(row[idxTocou] || '') : '';
      
      const cargoLower = cargo.toLowerCase();
      const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                                 (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                                 !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
      const isOrganista = cargoLower.includes('organista') || 
                         cargoLower.includes('examinadora') || 
                         cargoLower.includes('instrutora') ||
                         isSecretariaMusica;
      
      const isLocalCorreto = compararLocaisEnsaio(localEnsaioRow, localEnsaio);
      
      // LÓGICA SIMPLES: Se está registrado na planilha principal com o local correto, esteve presente
      if (isOrganista && isLocalCorreto) {
        organistas.push({
          nome,
          cargo,
          nivel,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          tocou: tocou,
          _ord: i
        });
        console.log(`🎹 Organista encontrada: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontradas ${organistas.length} organistas para o local: ${localEnsaio}`);

    // Função para determinar a prioridade de ordenação do cargo
    // Ordem: 1-Examinadoras, 2-Secretárias da Música, 3-Instrutoras, 4-Organistas
    function obterPrioridadeCargo(cargo) {
      const cargoLower = cargo.toLowerCase();
      if (cargoLower.includes('examinadora')) {
        return 1; // Examinadoras primeiro
      } else if ((cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                 (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                 !cargoLower.includes('secretário') && !cargoLower.includes('secretario')) {
        return 2; // Secretárias da Música segundo
      } else if (cargoLower.includes('instrutora')) {
        return 3; // Instrutoras terceiro
      } else if (cargoLower.includes('organista')) {
        return 4; // Organistas por último
      }
      return 5; // Outros (não deveria acontecer, mas por segurança)
    }

    // Ordena as organistas: primeiro por prioridade do cargo, depois por ordem de chegada (_ord)
    organistas.sort((a, b) => {
      const prioridadeA = obterPrioridadeCargo(a.cargo);
      const prioridadeB = obterPrioridadeCargo(b.cargo);
      
      // Se as prioridades são diferentes, ordena por prioridade
      if (prioridadeA !== prioridadeB) {
        return prioridadeA - prioridadeB;
      }
      
      // Se as prioridades são iguais, mantém a ordem de chegada (ordem original)
      return a._ord - b._ord;
    });

    console.log(`📋 Organistas ordenadas: Examinadoras → Secretárias da Música → Instrutoras → Organistas (mantendo ordem de chegada dentro de cada categoria)`);

    // Acessa a planilha externa de Caucaia
    const ssCaucaia = openCaucaiaSheet();
    
    // Cria ou limpa a aba Organistas
    let shOrganistas = ssCaucaia.getSheetByName('Organistas');
    if (!shOrganistas) {
      shOrganistas = ssCaucaia.insertSheet('Organistas');
      console.log(`✅ Nova aba Organistas criada na planilha externa de Caucaia`);
    } else {
      // Só limpa se não há organistas para inserir (otimização)
      if (organistas.length === 0) {
        const ultimaLinha = shOrganistas.getLastRow();
        if (ultimaLinha > 4) {
          shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
          console.log(`✅ Dados limpos na aba Organistas (nenhum organista encontrado para ${localEnsaio})`);
        }
      } else {
        // Se há organistas, limpa apenas o necessário para evitar conflitos
        const ultimaLinha = shOrganistas.getLastRow();
        if (ultimaLinha > 4) {
          shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
          console.log(`✅ Dados limpos na aba Organistas (preparando para inserir ${organistas.length} organistas)`);
        }
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shOrganistas.getRange(4, 1, 1, 7).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shOrganistas.getRange(4, 1, 1, 7).setValues([[
        'ID', 'Nome', 'Cargo', 'Nível', 'Comum', 'Cidade', 'Tocou no último ensaio?'
      ]]);
      shOrganistas.getRange(4, 1, 1, 7).setFontWeight('bold');
      shOrganistas.getRange(4, 1, 1, 7).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 7 colunas (incluindo ID)`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (organistas.length > 0) {
      // BUSCAR TODOS OS REGISTROS DE UMA VEZ (evita múltiplas chamadas HTTP)
      let registrosTocou = [];
      try {
        registrosTocou = buscarTodosRegistrosTocou(localEnsaio);
      } catch (e) {
        // Se falhar, continua sem os registros (coluna ficará vazia)
        registrosTocou = [];
      }
      
      const dadosParaInserir = organistas.map((org, index) => {
        // Nível automático para Instrutoras, Examinadora e Secretárias da Música (feminino)
        const cargoLower = org.cargo.toLowerCase();
        const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                                   (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                                   !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
        const nivelAuto = (cargoLower.includes('instrutora') || 
                          cargoLower.includes('examinadora') || 
                          isSecretariaMusica)
                         ? 'OFICIALIZADA' : (org.nivel || '');
        
        // Buscar se tocou nos registros já carregados (sem fazer nova chamada HTTP)
        let tocouFormatado = '';
        try {
          tocouFormatado = buscarTocouNosRegistros(org.nome, registrosTocou);
        } catch (e) {
          // Se falhar, deixa vazio
          tocouFormatado = '';
        }
        
        return [
          index + 1, // ID sequencial
          org.nome,
          org.cargo,
          nivelAuto,
          org.comum,
          org.cidade,
          tocouFormatado // Tocou no último ensaio? ('SIM', 'NÃO' ou '')
        ];
      });

      shOrganistas.getRange(5, 1, dadosParaInserir.length, 7).setValues(dadosParaInserir);
      console.log(`✅ ${organistas.length} organistas inseridas a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shOrganistas.getRange(4, 1, 1, 7).setBorder(true, true, true, true, true, true);
    
    // Autoajusta as colunas APÓS inserir os dados
    shOrganistas.autoResizeColumns(1, 7);
    
     // Define larguras específicas para colunas B, C, D, E e G
     shOrganistas.setColumnWidth(2, 405); // Coluna B (Nome)
     shOrganistas.setColumnWidth(3, 220); // Coluna C (Cargo)
     shOrganistas.setColumnWidth(4, 134); // Coluna D (Nível da organista)
     shOrganistas.setColumnWidth(5, 315); // Coluna E (Comum)
     shOrganistas.setColumnWidth(6, 180); // Coluna F (Cidade) - ajustado para 180px
     shOrganistas.setColumnWidth(7, 180); // Coluna G (Tocou no último ensaio?)
    
    console.log(`✅ Aba Organistas da planilha externa de Caucaia alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Organistas',
      planilhaId: CAUCAIA_SHEET_ID,
      totalOrganistas: organistas.length,
      organistas: organistas.map(org => org.nome)
    };

  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Organistas da planilha externa de Caucaia para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função para alimentar aba Organistas da planilha de Cotia

function alimentarAbaOrganistasCotia(localEnsaio = 'Cotia') {
  try {
    console.log('🎹 Iniciando alimentação da aba Organistas da planilha de Cotia...');
    
    const shDados = openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      throw new Error('Não há dados abaixo do cabeçalho em "Dados".');
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    // Busca flexível pelos headers
    const idxNome = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nome'));
    const idxCargo = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('cargo'));
    const idxNivel = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('nivel') || h.toString().toLowerCase().includes('classe'));
    const idxComum = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('comum'));
    const idxCidade = headerRow.findIndex(h => h && (
      h.toString().toLowerCase().includes('cidade') || 
      h.toString().toLowerCase().includes('municipio') || 
      h.toString().toLowerCase().includes('município') ||
      h.toString().toLowerCase().includes('localidade')
    ));
    const idxLocalEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('local_ensaio'));
    const idxVaiTocar = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('vai_tocar'));
    const idxDataEnsaio = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('data_ensaio'));
    // Busca flexível pelo campo "tocou no último ensaio"
    const idxTocou = headerRow.findIndex(h => {
      if (!h) return false;
      const hLower = h.toString().toLowerCase();
      return hLower.includes('tocou') && (hLower.includes('ultimo') || hLower.includes('último') || hLower.includes('ultima') || hLower.includes('última'));
    });

    if (idxNome < 0 || idxCargo < 0) {
      throw new Error('Colunas "nome" ou "cargo" não encontradas');
    }

    // Se localEnsaio não foi fornecido ou está vazio, tenta extrair da planilha
    if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '' || localEnsaio === 'Cotia') {
      console.log(`⚠️ [alimentarAbaOrganistasCotia] localEnsaio não fornecido ou padrão, tentando extrair da planilha...`);
      
      if (idxLocalEnsaio >= 0) {
        // Pega o primeiro local encontrado nos dados que pertence a esta localidade
        for (let i = 0; i < Math.min(data.length, 100); i++) {
          const localEncontrado = norm(data[i][idxLocalEnsaio] || '');
          if (localEncontrado && localEncontrado !== '(Sem local definido)' && compararLocaisEnsaio(localEncontrado, 'Cotia')) {
            localEnsaio = localEncontrado;
            console.log(`✅ [alimentarAbaOrganistasCotia] Local extraído da planilha: "${localEnsaio}"`);
            break;
          }
        }
      }
      
      // Se ainda não encontrou, usa o padrão
      if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '') {
        localEnsaio = 'Cotia';
        console.log(`⚠️ [alimentarAbaOrganistasCotia] Usando local padrão: "${localEnsaio}"`);
      }
    }
    
    // Buscar a data do ensaio (pegar a primeira data encontrada nos dados deste local)
    let dataEnsaioAtual = null;
    if (idxDataEnsaio >= 0) {
      for (let i = 0; i < data.length; i++) {
        const dataEnsaio = norm(data[i][idxDataEnsaio] || '');
        if (dataEnsaio && compararLocaisEnsaio(norm(data[i][idxLocalEnsaio] || ''), localEnsaio)) {
          dataEnsaioAtual = dataEnsaio;
          break; // Usar a primeira data encontrada para este local
        }
      }
    }
    
    if (!dataEnsaioAtual) {
      console.log(`⚠️ Data do ensaio não encontrada para o local ${localEnsaio}`);
    } else {
      console.log(`📅 Data do ensaio atual: ${dataEnsaioAtual}`);
    }

    // Filtra dados para organistas, examinadoras, instrutoras e secretárias da música do local especificado
    const organistas = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nome = norm(row[idxNome] || '');
      if (!nome) continue;

      const cargo = norm(row[idxCargo] || '');
      const nivel = norm(row[idxNivel] || '');
      const comum = norm(row[idxComum] || '') || '(Sem comum)';
      const cidade = norm(row[idxCidade] || '') || localEnsaio;
      const localEnsaioRow = norm(row[idxLocalEnsaio] || '') || '(Sem local definido)';
      const tocou = idxTocou >= 0 ? norm(row[idxTocou] || '') : '';
      
      const cargoLower = cargo.toLowerCase();
      const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                                 (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                                 !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
      const isOrganista = cargoLower.includes('organista') || 
                         cargoLower.includes('examinadora') || 
                         cargoLower.includes('instrutora') ||
                         isSecretariaMusica;
      
      const isLocalCorreto = compararLocaisEnsaio(localEnsaioRow, localEnsaio);
      
      // LÓGICA SIMPLES: Se está registrado na planilha principal com o local correto, esteve presente
      if (isOrganista && isLocalCorreto) {
        organistas.push({
          nome,
          cargo,
          nivel,
          comum,
          cidade,
          localEnsaio: localEnsaioRow,
          tocou: tocou,
          _ord: i
        });
        console.log(`🎹 Organista encontrada: ${nome} (${cargo}) - ${localEnsaioRow}`);
      }
    }

    console.log(`📊 Encontradas ${organistas.length} organistas para o local: ${localEnsaio}`);

    // Função para determinar a prioridade de ordenação do cargo
    // Ordem: 1-Examinadoras, 2-Secretárias da Música, 3-Instrutoras, 4-Organistas
    function obterPrioridadeCargo(cargo) {
      const cargoLower = cargo.toLowerCase();
      if (cargoLower.includes('examinadora')) {
        return 1; // Examinadoras primeiro
      } else if ((cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                 (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                 !cargoLower.includes('secretário') && !cargoLower.includes('secretario')) {
        return 2; // Secretárias da Música segundo
      } else if (cargoLower.includes('instrutora')) {
        return 3; // Instrutoras terceiro
      } else if (cargoLower.includes('organista')) {
        return 4; // Organistas por último
      }
      return 5; // Outros (não deveria acontecer, mas por segurança)
    }

    // Ordena as organistas: primeiro por prioridade do cargo, depois por ordem de chegada (_ord)
    organistas.sort((a, b) => {
      const prioridadeA = obterPrioridadeCargo(a.cargo);
      const prioridadeB = obterPrioridadeCargo(b.cargo);
      
      // Se as prioridades são diferentes, ordena por prioridade
      if (prioridadeA !== prioridadeB) {
        return prioridadeA - prioridadeB;
      }
      
      // Se as prioridades são iguais, mantém a ordem de chegada (ordem original)
      return a._ord - b._ord;
    });

    console.log(`📋 Organistas ordenadas: Examinadoras → Secretárias da Música → Instrutoras → Organistas (mantendo ordem de chegada dentro de cada categoria)`);

    // Acessa a planilha externa de Cotia
    const ssCotia = openCotiaSheet();
    
    // Cria ou limpa a aba Organistas
    let shOrganistas = ssCotia.getSheetByName('Organistas');
    if (!shOrganistas) {
      shOrganistas = ssCotia.insertSheet('Organistas');
      console.log(`✅ Nova aba Organistas criada na planilha externa de Cotia`);
    } else {
      // Só limpa se não há organistas para inserir (otimização)
      if (organistas.length === 0) {
        const ultimaLinha = shOrganistas.getLastRow();
        if (ultimaLinha > 4) {
          shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
          console.log(`✅ Dados limpos na aba Organistas (nenhum organista encontrado para ${localEnsaio})`);
        }
      } else {
        // Se há organistas, limpa apenas o necessário para evitar conflitos
        const ultimaLinha = shOrganistas.getLastRow();
        if (ultimaLinha > 4) {
          shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
          console.log(`✅ Dados limpos na aba Organistas (preparando para inserir ${organistas.length} organistas)`);
        }
      }
    }

    // Verifica se existe cabeçalho na linha 4
    const headerExists = shOrganistas.getRange(4, 1, 1, 7).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shOrganistas.getRange(4, 1, 1, 7).setValues([[
        'ID', 'Nome', 'Cargo', 'Nível', 'Comum', 'Cidade', 'Tocou no último ensaio?'
      ]]);
      shOrganistas.getRange(4, 1, 1, 7).setFontWeight('bold');
      shOrganistas.getRange(4, 1, 1, 7).setBackground('#e8f0fe');
      console.log(`✅ Cabeçalho criado na linha 4 com 7 colunas (incluindo ID)`);
    } else {
      console.log(`✅ Cabeçalho já existe na linha 4, preservando`);
    }

    // Popula dados a partir da linha 5
    if (organistas.length > 0) {
      // BUSCAR TODOS OS REGISTROS DE UMA VEZ (evita múltiplas chamadas HTTP)
      let registrosTocou = [];
      try {
        registrosTocou = buscarTodosRegistrosTocou(localEnsaio);
      } catch (e) {
        // Se falhar, continua sem os registros (coluna ficará vazia)
        registrosTocou = [];
      }
      
      const dadosParaInserir = organistas.map((org, index) => {
        // Nível automático para Instrutoras, Examinadora e Secretárias da Música (feminino)
        const cargoLower = org.cargo.toLowerCase();
        const isSecretariaMusica = (cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                                   (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                                   !cargoLower.includes('secretário') && !cargoLower.includes('secretario');
        const nivelAuto = (cargoLower.includes('instrutora') || 
                          cargoLower.includes('examinadora') || 
                          isSecretariaMusica)
                         ? 'OFICIALIZADA' : (org.nivel || '');
        
        // Buscar se tocou nos registros já carregados (sem fazer nova chamada HTTP)
        let tocouFormatado = '';
        try {
          tocouFormatado = buscarTocouNosRegistros(org.nome, registrosTocou);
        } catch (e) {
          // Se falhar, deixa vazio
          tocouFormatado = '';
        }
        
        return [
          index + 1, // ID sequencial
          org.nome,
          org.cargo,
          nivelAuto,
          org.comum,
          org.cidade,
          tocouFormatado // Tocou no último ensaio? ('SIM', 'NÃO' ou '')
        ];
      });

      shOrganistas.getRange(5, 1, dadosParaInserir.length, 7).setValues(dadosParaInserir);
      console.log(`✅ ${organistas.length} organistas inseridas a partir da linha 5 com IDs sequenciais`);
    }

    // Formatação
    shOrganistas.getRange(4, 1, 1, 7).setBorder(true, true, true, true, true, true);
    
    // Autoajusta as colunas APÓS inserir os dados
    shOrganistas.autoResizeColumns(1, 7);
    
     // Define larguras específicas para colunas B, C, D, E e G
     shOrganistas.setColumnWidth(2, 405); // Coluna B (Nome)
     shOrganistas.setColumnWidth(3, 220); // Coluna C (Cargo)
     shOrganistas.setColumnWidth(4, 134); // Coluna D (Nível da organista)
     shOrganistas.setColumnWidth(5, 315); // Coluna E (Comum)
     shOrganistas.setColumnWidth(6, 180); // Coluna F (Cidade) - ajustado para 180px
     shOrganistas.setColumnWidth(7, 180); // Coluna G (Tocou no último ensaio?)
    
    console.log(`✅ Aba Organistas da planilha externa de Cotia alimentada com sucesso para: ${localEnsaio}`);
    
    return {
      ok: true,
      localEnsaio: localEnsaio,
      abaAtualizada: 'Organistas',
      planilhaId: COTIA_SHEET_ID,
      totalOrganistas: organistas.length,
      organistas: organistas.map(org => org.nome)
    };
    
  } catch (error) {
    console.error(`❌ Erro ao alimentar aba Organistas da planilha externa de Cotia para ${localEnsaio}:`, error);
    throw error;
  }
}

// Função principal para executar exportação para Itapevi
