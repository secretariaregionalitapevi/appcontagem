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
      
      return jsonResponse({ 
        ok: true, 
        op: 'append', 
        version: '1.3.0_clean',
        uuid: data['UUID'],
        diag: diag
      });
    }

    if (op === 'update' || op === 'delete') {
      const targetSheetName = body?.sheet || body?.Sheet || SHEET_NAME;
      const match = body?.match || {};
      const uuid = (match.UUID || '').toString().trim().toLowerCase();
      
      if (!uuid) return jsonResponse({ ok: false, error: 'UUID é obrigatório' });

      // --- ESTRATÉGIA DE BUSCA ROBUSTA ---
      let shMaster = null;
      let ssMaster = SpreadsheetApp.openById(DEFAULT_SHEET_ID);
      
      // 1. Tenta pela aba solicitada
      shMaster = ssMaster.getSheetByName(targetSheetName);
      
      // 2. Fallback: Procura qualquer aba que tenha "UUID" na primeira linha
      if (!shMaster) {
        const allSheets = ssMaster.getSheets();
        for (const s of allSheets) {
          const firstRow = s.getRange(1, 1, 1, Math.min(s.getLastColumn(), 20)).getValues()[0];
          if (firstRow.some(h => String(h).toUpperCase().trim() === 'UUID')) {
            shMaster = s;
            break;
          }
        }
      }
      
      if (!shMaster) return jsonResponse({ ok: false, error: 'Aba de dados não encontrada ou sem coluna UUID' });

      const lastRow = shMaster.getLastRow();
      let affectedMaster = 0;
      let regionalId = null;
      let details = `TargetSheet=${shMaster.getName()}, LastRow=${lastRow}`;

      if (lastRow > 1) {
        const headers = shMaster.getRange(1, 1, 1, shMaster.getLastColumn()).getValues()[0].map(h => (h || '').toString().trim().toUpperCase());
        const idxUuid = headers.indexOf('UUID');
        const idxLocal = headers.indexOf('LOCAL_ENSAIO');

        if (idxUuid >= 0) {
          const values = shMaster.getRange(2, 1, lastRow - 1, headers.length).getValues();
          
          for (let i = values.length - 1; i >= 0; i--) {
            const rowUuid = (values[i][idxUuid] || '').toString().trim().toLowerCase();
            
            if (rowUuid === uuid) {
              const rowNum = i + 2;
              if (idxLocal >= 0) regionalId = getRegionalId(values[i][idxLocal]);
              
              if (op === 'update') {
                const patch = body?.data || {};
                Object.keys(patch).forEach(k => {
                  const idx = headers.indexOf(k.toUpperCase());
                  if (idx >= 0) shMaster.getRange(rowNum, idx + 1).setValue(patch[k]);
                });
                affectedMaster++;
              } else {
                shMaster.deleteRow(rowNum);
                affectedMaster++;
              }
            }
          }
        } else {
          details += " | ERROR_COL_UUID_NOT_FOUND";
        }
      }

      // Sincronizar com Regional
      let affectedRegional = 0;
      if (regionalId) {
        try {
          const shRegional = openOrCreateSheet('Registros', regionalId);
          const regLastRow = shRegional.getLastRow();
          if (regLastRow > 1) {
            const regHeaders = shRegional.getRange(1, 1, 1, shRegional.getLastColumn()).getValues()[0].map(h => (h || '').toString().trim().toUpperCase());
            const regIdxUuid = regHeaders.indexOf('UUID');
            
            if (regIdxUuid >= 0) {
              const regValues = shRegional.getRange(2, 1, regLastRow - 1, regHeaders.length).getValues();
              for (let i = regValues.length - 1; i >= 0; i--) {
                const regRowUuid = (regValues[i][regIdxUuid] || '').toString().trim().toLowerCase();
                
                if (regRowUuid === uuid) {
                  const regRowNum = i + 2;
                  if (op === 'update') {
                    const patch = body?.data || {};
                    Object.keys(patch).forEach(k => {
                      const idx = regHeaders.indexOf(k.toUpperCase());
                      if (idx >= 0) shRegional.getRange(regRowNum, idx + 1).setValue(patch[k]);
                    });
                    affectedRegional++;
                  } else {
                    shRegional.deleteRow(regRowNum);
                    affectedRegional++;
                  }
                }
              }
            }
          }
        } catch(e) { 
          details += ` | REGIONAL_SYNC_ERR=${e.message}`;
        }
      }

      // Log de Auditoria (Apenas para Deletion/Update)
      try {
        const shLog = openOrCreateSheet('Log_Sync');
        if (shLog.getLastColumn() === 0) {
          shLog.appendRow(['Data', 'Op', 'UUID', 'Nome', 'Responsável']);
        }
        
        const metaNome = body?.meta?.nome || '';
        const metaResp = body?.meta?.responsavel || '';
        
        shLog.appendRow([
          new Date().toLocaleString('pt-BR'), 
          op, 
          uuid, 
          metaNome, 
          metaResp
        ]);
      } catch(logErr) {}

      return jsonResponse({ 
        ok: true, 
        op: op, 
        master: affectedMaster, 
        regional: affectedRegional,
        sheet: shMaster.getName()
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
