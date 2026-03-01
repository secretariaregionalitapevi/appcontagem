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

function doPost(e) {
  try {
    const raw = e?.postData?.contents || '{}';
    const body = JSON.parse(raw);

    const op = String(body?.op || '').toLowerCase();
    if (op === 'ping') return jsonResponse({ ok: true, pong: true });
    
    if (op === 'atualizar_resumo') {
      const resultado = processarPresentesPorLocalidade();
      return jsonResponse({ 
        ok: true, 
        op: 'atualizar_resumo', 
        resultado: resultado 
      });
    }
    
    if (op === 'atualizar_sistema_completo') {
      const resultado = atualizarSistemaCompleto();
      return jsonResponse({ 
        ok: resultado.ok, 
        op: 'atualizar_sistema_completo', 
        resultado: resultado 
      });
    }
    
    if (op === 'listar_locais_ensaio') {
      const resultado = listarLocaisEnsaio();
      return jsonResponse({ 
        ok: resultado.ok, 
        op: 'listar_locais_ensaio', 
        resultado: resultado 
      });
    }
    
    if (op === 'exportar_completo_cotia') {
      const localEnsaio = body?.local_ensaio;
      if (!localEnsaio) {
        return jsonResponse({ ok: false, error: 'local_ensaio é obrigatório' });
      }
      
      const resultadoEnsaio = exportarParaPlanilhaCotiaCompleta(localEnsaio);
      const resultadoOrganistas = alimentarAbaOrganistasCotia(localEnsaio);
      const resultadoMinisterio = alimentarAbaMinisterioCotia(localEnsaio);
      
      return jsonResponse({ 
        ok: true, 
        op: 'exportar_completo_cotia', 
        resultado: {
          ensaio: resultadoEnsaio,
          organistas: resultadoOrganistas,
          ministerio: resultadoMinisterio
        }
      });
    }

    if (op === 'exportar_completo_itapevi') {
      const localEnsaio = body?.local_ensaio;
      if (!localEnsaio) {
        return jsonResponse({ ok: false, error: 'local_ensaio é obrigatório' });
      }
      
      const resultadoEnsaio = exportarParaPlanilhaItapeviCompleta(localEnsaio);
      const resultadoOrganistas = alimentarAbaOrganistasItapevi(localEnsaio);
      const resultadoMinisterio = alimentarAbaMinisterioItapevi(localEnsaio);
      
      return jsonResponse({ 
        ok: true, 
        op: 'exportar_completo_itapevi', 
        resultado: {
          ensaio: resultadoEnsaio,
          organistas: resultadoOrganistas,
          ministerio: resultadoMinisterio
        }
      });
    }

    if (op === 'exportar_completo_caucaia') {
      const localEnsaio = body?.local_ensaio;
      if (!localEnsaio) {
        return jsonResponse({ ok: false, error: 'local_ensaio é obrigatório' });
      }
      
      const resultadoEnsaio = exportarParaPlanilhaCaucaiaCompleta(localEnsaio);
      const resultadoOrganistas = alimentarAbaOrganistasCaucaia(localEnsaio);
      const resultadoMinisterio = alimentarAbaMinisterioCaucaia(localEnsaio);
      
      return jsonResponse({ 
        ok: true, 
        op: 'exportar_completo_caucaia', 
        resultado: {
          ensaio: resultadoEnsaio,
          organistas: resultadoOrganistas,
          ministerio: resultadoMinisterio
        }
      });
    }

    if (op === 'exportar_completo_jandira') {
      const localEnsaio = body?.local_ensaio;
      if (!localEnsaio) {
        return jsonResponse({ ok: false, error: 'local_ensaio é obrigatório' });
      }
      
      const resultadoEnsaio = exportarParaPlanilhaJandiraCompleta(localEnsaio);
      const resultadoOrganistas = alimentarAbaOrganistasJandira(localEnsaio);
      const resultadoMinisterio = alimentarAbaMinisterioJandira(localEnsaio);
      
      return jsonResponse({ 
        ok: true, 
        op: 'exportar_completo_jandira', 
        resultado: {
          ensaio: resultadoEnsaio,
          organistas: resultadoOrganistas,
          ministerio: resultadoMinisterio
        }
      });
    }

    if (op === 'exportar_completo_fazendinha') {
      const localEnsaio = body?.local_ensaio;
      if (!localEnsaio) {
        return jsonResponse({ ok: false, error: 'local_ensaio é obrigatório' });
      }
      
      const resultadoEnsaio = exportarParaPlanilhaFazendinhaCompleta(localEnsaio);
      const resultadoOrganistas = alimentarAbaOrganistasFazendinha(localEnsaio);
      const resultadoMinisterio = alimentarAbaMinisterioFazendinha(localEnsaio);
      
      return jsonResponse({ 
        ok: true, 
        op: 'exportar_completo_fazendinha', 
        resultado: {
          ensaio: resultadoEnsaio,
          organistas: resultadoOrganistas,
          ministerio: resultadoMinisterio
        }
      });
    }

    if (op === 'exportar_completo_pirapora') {
      const localEnsaio = body?.local_ensaio;
      if (!localEnsaio) {
        return jsonResponse({ ok: false, error: 'local_ensaio é obrigatório' });
      }
      
      const resultadoEnsaio = exportarParaPlanilhaPiraporaCompleta(localEnsaio);
      const resultadoOrganistas = alimentarAbaOrganistasPirapora(localEnsaio);
      const resultadoMinisterio = alimentarAbaMinisterioPirapora(localEnsaio);
      
      return jsonResponse({ 
        ok: true, 
        op: 'exportar_completo_pirapora', 
        resultado: {
          ensaio: resultadoEnsaio,
          organistas: resultadoOrganistas,
          ministerio: resultadoMinisterio
        }
      });
    }

    if (op === 'exportar_completo_vargemgrande') {
      const localEnsaio = body?.local_ensaio;
      if (!localEnsaio) {
        return jsonResponse({ ok: false, error: 'local_ensaio é obrigatório' });
      }
      
      const resultadoEnsaio = exportarParaPlanilhaVargemGrandeCompleta(localEnsaio);
      const resultadoOrganistas = alimentarAbaOrganistasVargemGrande(localEnsaio);
      const resultadoMinisterio = alimentarAbaMinisterioVargemGrande(localEnsaio);
      
      return jsonResponse({ 
        ok: true, 
        op: 'exportar_completo_vargemgrande', 
        resultado: {
          ensaio: resultadoEnsaio,
          organistas: resultadoOrganistas,
          ministerio: resultadoMinisterio
        }
      });
    }

    if (op === 'exportar_todas_planilhas') {
      const localEnsaio = body?.local_ensaio;
      if (!localEnsaio) {
        return jsonResponse({ ok: false, error: 'local_ensaio é obrigatório' });
      }
      
      // Executa a exportação para todas as planilhas
      executarExportarTodasPlanilhas();
      
      return jsonResponse({ 
        ok: true, 
        op: 'exportar_todas_planilhas', 
        mensagem: 'Exportação para todas as planilhas iniciada'
      });
    }

    // 🚨 CRÍTICO: Operação 'append' para receber dados do modal de novo registro
    if (op === 'append') {
      const sheetName = body?.sheet || SHEET_NAME;
      const data = body?.data || {};
      
      const sh = openOrCreateSheet(sheetName);
      
      // Garantir UUID e SYNC_STATUS se não existirem
      if (!data['UUID']) data['UUID'] = Utilities.getUuid();
      if (!data['SYNC_STATUS']) data['SYNC_STATUS'] = 'ATUALIZADO';

      // --- FUNÇÃO INTERNA PARA MAPEAMENTO DINÂMICO ---
      const buildRow = (shTarget, record) => {
        const lastCol = shTarget.getLastColumn();
        if (lastCol === 0) return []; 
        const targetHeaders = shTarget.getRange(1, 1, 1, lastCol).getValues()[0].map(h => (h || '').toString().trim());
        
        // Criar um mapa do record com chaves em uppercase para busca insensível
        const recordUpCase = {};
        Object.keys(record).forEach(k => {
          recordUpCase[k.toUpperCase()] = record[k];
        });

        return targetHeaders.map(h => {
          const hUpper = h.toUpperCase();
          return recordUpCase[hUpper] != null ? recordUpCase[hUpper] : '';
        });
      };

      // 1. Salvar na Planilha Mestra
      ensureHeaders(sh);
      
      // --- VERIFICAÇÃO ANTI-DUPLICATA ---
      const uuidReq = data['UUID'];
      const nomeReq = (data['NOME COMPLETO'] || '').toString().trim().toUpperCase();
      const localReq = (data['LOCAL_ENSAIO'] || '').toString().trim().toUpperCase();
      const cargoReq = (data['CARGO'] || '').toString().trim().toUpperCase();
      const dataReq = (data['DATA_ENSAIO'] || '').toString().trim(); // assumindo mesmo formato

      let isDuplicate = false;
      const lastRow = sh.getLastRow();
      if (lastRow > 1) {
        // Obter ultimas 50 linhas para verificar duplicata no dia
        const startRow = Math.max(2, lastRow - 50);
        const numRows = lastRow - startRow + 1;
        const lastCol = sh.getLastColumn();
        const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(h => (h || '').toString().trim().toUpperCase());
        
        const idxUuid = headers.indexOf('UUID');
        const idxNome = headers.indexOf('NOME COMPLETO');
        const idxLocal = headers.indexOf('LOCAL_ENSAIO');
        const idxCargo = headers.indexOf('CARGO');
        const idxData = headers.indexOf('DATA_ENSAIO');
        
        if (idxNome >= 0 && idxData >= 0) {
          const recentData = sh.getRange(startRow, 1, numRows, lastCol).getValues();
          for (let i = recentData.length - 1; i >= 0; i--) {
            const row = recentData[i];
            const rowUuid = idxUuid >= 0 ? (row[idxUuid] || '').toString().trim() : '';
            const rowNome = (row[idxNome] || '').toString().trim().toUpperCase();
            const rowLocal = idxLocal >= 0 ? (row[idxLocal] || '').toString().trim().toUpperCase() : '';
            const rowCargo = idxCargo >= 0 ? (row[idxCargo] || '').toString().trim().toUpperCase() : '';
            const rowData = (row[idxData] || '').toString().trim();
            
            // É duplicata se o UUID bate OU se Nome, Local, Cargo e Data batem perfeitamente.
            if ((uuidReq && rowUuid === uuidReq) || 
                (nomeReq && nomeReq === rowNome && localReq === rowLocal && cargoReq === rowCargo && dataReq === rowData)) {
              isDuplicate = true;
              console.log(`⚠️ Duplicata ignorada no Code.gs para Mestra: Nome=${nomeReq}, Local=${localReq}, Data=${dataReq}`);
              break;
            }
          }
        }
      }

      const rowMaster = buildRow(sh, data);
      
      // Se não for duplicata, faz o append
      if (!isDuplicate && rowMaster.length > 0) sh.appendRow(rowMaster);
      
      const diag = {
        master: { ok: true, id: sh.getParent().getId(), sheet: sh.getName() },
        regional: { ok: false, attempted: false }
      };
      
      // 2. Determinar Regional (Com Fallback Robusto)
      // Normalizar chaves do record para busca insensível
      const recordUpper = {};
      Object.keys(data).forEach(k => recordUpper[k.toUpperCase()] = data[k]);
      
      const localEnsaioValue = (recordUpper['LOCAL_ENSAIO'] || recordUpper['LOCAL-ENSAIO'] || '').toString().trim();
      const cidadeValue = (recordUpper['CIDADE'] || '').toString().trim();
      const comumValue = (recordUpper['COMUM'] || '').toString().trim();
      
      console.log(`📍 [ROUTING] Local="${localEnsaioValue}", Cidade="${cidadeValue}", Comum="${comumValue}"`);

      let regionalId = getRegionalId(localEnsaioValue);
      
      // Fallback: Se não identificou pelo local, tenta pela cidade ou comum
      if (!regionalId) {
        regionalId = getRegionalId(cidadeValue) || getRegionalId(comumValue);
        if (regionalId) console.log(`🔍 Regional via fallback: ${regionalId}`);
      }
      
      let debugMsg = `Local="${localEnsaioValue}" Cidade="${cidadeValue}"`;
      
      if (regionalId) {
        diag.regional.attempted = true;
        diag.regional.targetId = regionalId;
        diag.regional.local = localEnsaioValue;
        
        try {
          const regionalSheetName = 'Registros';
          const shRegional = openOrCreateSheet(regionalSheetName, regionalId);
          ensureHeaders(shRegional);
          
          if (!recordUpper['SYNCED_AT']) {
            data['SYNCED_AT'] = new Date().toISOString();
          }

          const rowRegional = buildRow(shRegional, data);
          console.log(`📋 Colunas regional: ${shRegional.getLastColumn()}, Linha: [${rowRegional.join('|')}]`);
          if (!isDuplicate && rowRegional.length > 0) {
            shRegional.appendRow(rowRegional);
            diag.regional.ok = true;
            diag.regional.sheetUsed = shRegional.getName();
            debugMsg += ` → ✅ Regional OK (${regionalId})`;
            console.log(`✅ Espelhamento concluído para regional [${shRegional.getName()}] - ${regionalId}`);
          } else if (isDuplicate) {
            diag.regional.ok = true; // Simula sucesso para não encadear novos retries
            diag.regional.sheetUsed = shRegional.getName();
            debugMsg += ` → ✅ Regional Ignorou Duplicata (${regionalId})`;
            console.log(`⚠️ Duplicata ignorada também para regional [${shRegional.getName()}] - ${regionalId}`);
          } else {
            diag.regional.error = 'Linha vazia (0 colunas na regional)';
            debugMsg += ` → ❌ Linha vazia na regional`;
            console.warn(`⚠️ Linha vazia para regional: ${regionalId}`);
          }
        } catch (regError) {
          diag.regional.error = regError.message;
          debugMsg += ` → ❌ ERRO: ${regError.message}`;
          console.error(`❌ Erro regional (${regionalId}): ${regError.message}`);
        }
      } else {
        debugMsg += ` → ❌ Sem regional (LOCAL não mapeado)`;
        console.warn(`⚠️ Sem regional para Local="${localEnsaioValue}", Cidade="${cidadeValue}"`);
      }
      
      // 🔍 ESCREVER DEBUG NA PLANILHA MESTRE (aba "Debug")
      try {
        const shDebug = openOrCreateSheet('Debug');
        if (shDebug.getLastColumn() === 0) {
          shDebug.getRange(1,1,1,5).setValues([['TIMESTAMP','UUID','LOCAL_ENSAIO','CIDADE','RESULTADO']]);
        }
        shDebug.appendRow([
          new Date().toLocaleString('pt-BR'),
          data['UUID'] || '',
          localEnsaioValue,
          cidadeValue,
          debugMsg
        ]);
      } catch(debugErr) {
        console.warn('Debug tab write failed:', debugErr.message);
      }
      
      return jsonResponse({ 
        ok: true, 
        op: 'append', 
        version: '1.3.0_debug',
        uuid: data['UUID'],
        diag: diag
      });
    }

    return jsonResponse({ ok: false, error: 'Operação não reconhecida' });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return jsonResponse({ ok: false, error: error.message });
  }
}

/**
 * =====================================================================
 *  FUNÇÃO DE DIAGNÓSTICO - Execute esta função diretamente no editor
 *  Apps Script para descobrir por que a regional não está gravando.
 *  Resultado aparece nos logs (Executar > Registros de execução).
 * =====================================================================
 */
