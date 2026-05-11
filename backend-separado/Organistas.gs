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
  // Nota: Esta função é mantida para compatibilidade, mas 
  // o ideal é usar o mapa pré-processado na função chamadora.
  try {
    if (!organistaNome || !registros || registros.length === 0) return '';
    
    const nomeBusca = normalizarNome(organistaNome);
    if (!nomeBusca) return '';
    
    const camposNomePossiveis = ['organista_nome', 'nome', 'nome_completo', 'nome_organista', 'organista'];
    
    // 1. Tenta match exato primeiro (mais rápido)
    for (let i = 0; i < registros.length; i++) {
      const reg = registros[i];
      if (!reg) continue;
      
      for (const campo of camposNomePossiveis) {
        if (reg[campo]) {
          const regNome = normalizarNome(reg[campo]);
          if (regNome === nomeBusca) {
            return reg.tocou === true || reg.tocou === 'true' || reg.tocou === 1 ? 'SIM' : 'NÃO';
          }
          break; // Encontrou um campo de nome, não precisa ver os outros deste registro
        }
      }
    }
    
    // 2. Tenta match parcial apenas se o exato falhou
    const palavrasNomeBusca = nomeBusca.split(' ').filter(p => p.length > 0);
    if (palavrasNomeBusca.length < 2) return '';

    for (let i = 0; i < registros.length; i++) {
      const reg = registros[i];
      if (!reg) continue;
      
      let regNome = '';
      for (const campo of camposNomePossiveis) {
        if (reg[campo]) {
          regNome = normalizarNome(reg[campo]);
          break;
        }
      }
      
      if (!regNome) continue;
      
      const palavrasRegNome = regNome.split(' ').filter(p => p.length > 0);
      const tocouValue = reg.tocou === true || reg.tocou === 'true' || reg.tocou === 1 ? 'SIM' : 'NÃO';
      
      // Contido ou Início (mais comum)
      if (nomeBusca.indexOf(regNome) === 0 || regNome.indexOf(nomeBusca) === 0) {
        if (palavrasRegNome.length >= 2 || palavrasNomeBusca.length >= 2) return tocouValue;
      }
      
      // Primeiras 2 palavras batem
      if (palavrasRegNome.length >= 2 && palavrasNomeBusca.length >= 2) {
        if (palavrasRegNome[0] === palavrasNomeBusca[0] && palavrasRegNome[1] === palavrasNomeBusca[1]) {
          return tocouValue;
        }
      }
    }
    
    return '';
  } catch (e) {
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
        // Normaliza os locais para comparação 100% segura
        const localEnsaioBusca = (localEnsaio || '').toString().trim().toLowerCase();
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

// Função principal genérica para alimentar aba Organistas em qualquer planilha destino
function alimentarAbaOrganistasDestino(localEnsaio, ssDestino, nomePlanilha, shSource = null) {
  try {
    console.log(`🏛️ Iniciando alimentação da aba Organistas na planilha externa de ${nomePlanilha} para: ${localEnsaio}`);
    
    // Se localEnsaio não foi fornecido ou está vazio, usa o nome da planilha como padrão
    if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '') {
      localEnsaio = nomePlanilha;
      console.log(`⚠️ [alimentarAbaOrganistasDestino] Usando local padrão: "${localEnsaio}"`);
    }

    // 🚨 AJUSTE: Usar shSource se fornecido (ex: aba Registros da regional)
    const shDados = shSource || openOrCreateSheet(SHEET_NAME);
    const lastRow = shDados.getLastRow();
    const lastCol = shDados.getLastColumn();
    
    if (lastRow < 2) {
      console.warn(`[alimentarAbaOrganistasDestino] Fonte "${shDados.getName()}" está vazia.`);
      return { ok: false, mensagem: 'Sem dados para processar' };
    }

    const headerRow = shDados.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const data = shDados.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

    const headerMap = {};
    headerRow.forEach((h, i) => {
      if (h) headerMap[h.toString().trim().toUpperCase()] = i;
    });

    const idxNome = headerMap['NOME COMPLETO'];
    const idxCargo = headerMap['CARGO'];
    const idxNivel = headerMap['CLASSE_ORGANISTA'] !== undefined ? headerMap['CLASSE_ORGANISTA'] : headerMap['NÍVEL'];
    const idxComum = headerMap['COMUM'];
    const idxCidade = headerMap['CIDADE'];
    const idxLocalEnsaio = headerMap['LOCAL_ENSAIO'];
    const idxVaiTocar = headerMap['VAI_TOCAR'];
    const idxDataEnsaio = headerMap['DATA_ENSAIO'];
    const idxTocou = headerMap['ULTIMO_TOCOU'] !== undefined ? headerMap['ULTIMO_TOCOU'] : headerMap['ÚLTIMO TOCOU'];

    if (idxNome === undefined || idxCargo === undefined) {
      throw new Error('Colunas "NOME COMPLETO" ou "CARGO" não encontradas na aba Dados');
    }
    
    if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '' || localEnsaio === nomePlanilha) {
      if (idxLocalEnsaio >= 0) {
        for (let i = 0; i < Math.min(data.length, 100); i++) {
          const localEncontrado = norm(data[i][idxLocalEnsaio] || '');
          if (localEncontrado && localEncontrado !== '(Sem local definido)' && compararLocaisEnsaio(localEncontrado, nomePlanilha)) {
            localEnsaio = localEncontrado;
            break;
          }
        }
      }
      if (!localEnsaio || localEnsaio === 'undefined' || String(localEnsaio).trim() === '') {
        localEnsaio = nomePlanilha;
      }
    }
    
    console.log(`📍 [alimentarAbaOrganistasDestino] Local de ensaio final: "${localEnsaio}"`);
    
    let dataEnsaioAtual = null;
    if (idxDataEnsaio >= 0) {
      for (let i = 0; i < data.length; i++) {
        const dataEnsaio = norm(data[i][idxDataEnsaio] || '');
        if (dataEnsaio && compararLocaisEnsaio(norm(data[i][idxLocalEnsaio] || ''), localEnsaio)) {
          dataEnsaioAtual = dataEnsaio;
          break;
        }
      }
    }

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
      
      // Na planilha regional (shSource fornecido), ignoramos o filtro de local
      const isLocalCorreto = shSource ? true : compararLocaisEnsaio(localEnsaioRow, localEnsaio);
      
      if (isOrganista && isLocalCorreto) {
        organistas.push({
          nome, cargo, nivel, comum, cidade, localEnsaio: localEnsaioRow, tocou: tocou, _ord: i
        });
      }
    }

    function obterPrioridadeCargo(cargo) {
      const cargoLower = cargo.toLowerCase();
      if (cargoLower.includes('examinadora')) return 1;
      else if ((cargoLower.includes('secretária') || cargoLower.includes('secretaria')) &&
                 (cargoLower.includes('música') || cargoLower.includes('musica')) &&
                 !cargoLower.includes('secretário') && !cargoLower.includes('secretario')) return 2;
      else if (cargoLower.includes('instrutora')) return 3;
      else if (cargoLower.includes('organista')) return 4;
      return 5;
    }

    organistas.sort((a, b) => {
      const prioridadeA = obterPrioridadeCargo(a.cargo);
      const prioridadeB = obterPrioridadeCargo(b.cargo);
      if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;
      return a._ord - b._ord;
    });

    let shOrganistas = ssDestino.getSheetByName('Organistas');
    if (!shOrganistas) {
      shOrganistas = ssDestino.insertSheet('Organistas');
    } else {
      const ultimaLinha = shOrganistas.getLastRow();
      if (ultimaLinha > 4) {
        shOrganistas.getRange(5, 1, ultimaLinha - 4, shOrganistas.getLastColumn()).clearContent();
      }
    }

    const headerExists = shOrganistas.getRange(4, 1, 1, 7).getValues()[0].some(cell => cell && cell.toString().trim());
    
    if (!headerExists) {
      shOrganistas.getRange(4, 1, 1, 7).setValues([[
        'ID', 'Nome', 'Cargo', 'Nível', 'Comum', 'Cidade', 'Tocou no último ensaio?'
      ]]);
      shOrganistas.getRange(4, 1, 1, 7).setFontWeight('bold');
      shOrganistas.getRange(4, 1, 1, 7).setBackground('#e8f0fe');
    }

    if (organistas.length > 0) {
      let registrosTocou = [];
      try {
        registrosTocou = buscarTodosRegistrosTocou(localEnsaio);
      } catch (e) {
        registrosTocou = [];
      }
      
      // OTIMIZAÇÃO: Pré-processa registros em um Mapa para busca O(1)
      const mapaTocouExato = {};
      const camposNomePossiveis = ['organista_nome', 'nome', 'nome_completo', 'nome_organista', 'organista'];
      
      if (registrosTocou.length > 0) {
        registrosTocou.forEach(reg => {
          if (!reg) return;
          const valor = reg.tocou === true || reg.tocou === 'true' || reg.tocou === 1 ? 'SIM' : 'NÃO';
          camposNomePossiveis.forEach(campo => {
            if (reg[campo]) {
              const nomeNorm = normalizarNome(reg[campo]);
              if (nomeNorm && !mapaTocouExato[nomeNorm]) {
                mapaTocouExato[nomeNorm] = valor;
              }
            }
          });
        });
      }
      
      const dadosParaInserir = [];
      
      organistas.forEach((org, index) => {
        let tocou = org.tocou;
        if (!tocou && registrosTocou.length > 0) {
          const nomeNorm = normalizarNome(org.nome);
          // 1. Tenta Match Exato no Mapa (Ultrarápido)
          if (mapaTocouExato[nomeNorm]) {
            tocou = mapaTocouExato[nomeNorm];
          } else {
            // 2. Fallback para busca parcial (Lento, mas só ocorre se o exato falhar)
            const resultadoBusca = buscarTocouNosRegistros(org.nome, registrosTocou);
            if (resultadoBusca) tocou = resultadoBusca;
          }
        }
        
        dadosParaInserir.push([
          index + 1,
          org.nome,
          org.cargo,
          org.nivel,
          org.comum,
          org.cidade,
          tocou
        ]);
      });
      
      shOrganistas.getRange(5, 1, dadosParaInserir.length, 7).setValues(dadosParaInserir);
      
      try {
        shOrganistas.getRange(5, 1, dadosParaInserir.length, 7).setBorder(true, true, true, true, true, true);
        shOrganistas.getRange(5, 7, dadosParaInserir.length, 1).setHorizontalAlignment('center');
        
        const columnWidths = [40, 420, 220, 145, 370, 162, 180];
        columnWidths.forEach((width, index) => {
          shOrganistas.setColumnWidth(index + 1, width);
        });
      } catch (e) { }
    }
    
    return {
      ok: true, abaAtualizada: 'Organistas', planilhaId: ssDestino.getId(), localEnsaio: localEnsaio, totalOrganistas: organistas.length
    };
  } catch (error) {
    console.error(`❌ Erro ao atualizar aba Organistas em ${nomePlanilha}:`, error);
    throw error;
  }
}

// Função para alimentar aba Organistas na planilha externa de Itapevi
function alimentarAbaOrganistasItapevi(localEnsaio = 'Itapevi') {
  return alimentarAbaOrganistasDestino(localEnsaio, openItapeviSheet(), 'Itapevi');
}

// Função para alimentar aba Ministério da planilha de Itapevi

function alimentarAbaOrganistasVargemGrande(localEnsaio = 'VargemGrande') {
  return alimentarAbaOrganistasDestino(localEnsaio, openVargemGrandeSheet(), 'VargemGrande');
}

// Função para alimentar aba Organistas da planilha de Pirapora

function alimentarAbaOrganistasPirapora(localEnsaio = 'Pirapora') {
  return alimentarAbaOrganistasDestino(localEnsaio, openPiraporaSheet(), 'Pirapora');
}

// Função para alimentar aba Organistas da planilha de Fazendinha

function alimentarAbaOrganistasFazendinha(localEnsaio = 'Fazendinha') {
  return alimentarAbaOrganistasDestino(localEnsaio, openFazendinhaSheet(), 'Fazendinha');
}

// Função para alimentar aba Organistas da planilha de Jandira

function alimentarAbaOrganistasJandira(localEnsaio = 'Jandira') {
  return alimentarAbaOrganistasDestino(localEnsaio, openJandiraSheet(), 'Jandira');
}

// Função para alimentar aba Organistas da planilha de Caucaia

function alimentarAbaOrganistasCaucaia(localEnsaio = 'Caucaia') {
  return alimentarAbaOrganistasDestino(localEnsaio, openCaucaiaSheet(), 'Caucaia');
}

// Função para alimentar aba Organistas da planilha de Cotia

function alimentarAbaOrganistasCotia(localEnsaio = 'Cotia') {
  return alimentarAbaOrganistasDestino(localEnsaio, openCotiaSheet(), 'Cotia');
}

// Função principal para executar exportação para Itapevi
