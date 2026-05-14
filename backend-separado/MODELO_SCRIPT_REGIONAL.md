# Script Modelo para Planilhas Regionais (Arquitetura Pull)

Este é o script que deve ser colado no **Editor de Scripts (Extensões > Apps Script)** de CADA planilha regional (Itapevi, Cotia, Jandira, etc).

## Requisitos Prévios
1. A Matriz (Backend) deve ser implantada (Deploy) como uma **Biblioteca** ou ter seu ID de Script copiado.
2. Na Planilha Regional, vá no Editor de Scripts, clique em "Bibliotecas" (+) e adicione o ID do script da Matriz.
3. Dê o nome do identificador como `SistemaSAM_Biblioteca`.

## Código para a Regional

```javascript
/**
 * ============================================================================
 * SCRIPT DA PLANILHA REGIONAL (AUTONOMIA)
 * ============================================================================
 */

// NOME DA SUA REGIONAL AQUI (ex: 'Itapevi', 'Cotia', 'Caucaia', 'Jandira', etc)
const LOCAL_ENSAIO = 'Itapevi';

/**
 * Cria o menu personalizado quando a planilha é aberta
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Sistema SAM')
    .addItem('Atualizar Painel', 'atualizarPainel')
    .addToUi();
}

/**
 * Função unificada: Atualiza Dashboards e Listas.
 */
function atualizarPainel() {
  updateLocalProgress(5, 'Iniciando...', 'Preparando atualização');
  exibirModalSincronizacao('PULL');
}

/**
 * Função principal que abre a interface de carregamento premium
 */
function exibirModalSincronizacao(tipo) {
  const titulo = 'Atualização do Painel';
  const desc = tipo === 'LOCAL' ? 'Atualizando Dashboards...' : 'Puxando dados da Matriz...';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <base target="_top">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap');
        
        body { margin: 0; padding: 0; font-family: 'Poppins', sans-serif; overflow: hidden; background: #fff; }
        .card { width: 100%; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
        
        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #005ea2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 25px auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        h2 { margin: 0 0 10px 0; font-size: 18px; color: #333; font-weight: 600; }
        p { margin: 0; font-size: 13px; color: #666; }
        
        #statusBox, #sucessoBox { 
          width: 100%; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center;
        }
        #sucessoBox { display: none; }
        .success-icon { color: #27ae60; font-size: 36px; margin-bottom: 10px; }
        
        #resultado {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 12px;
          font-size: 12px;
          text-align: left;
          color: #444;
          margin-top: 15px;
          border: 1px solid #eee;
          width: 85%;
          max-width: 280px;
        }
        .progress-wrap {
          width: 76%;
          max-width: 260px;
          height: 6px;
          background: #edf0f2;
          border-radius: 999px;
          overflow: hidden;
          margin-top: 18px;
        }
        #progressBar {
          width: 5%;
          height: 100%;
          background: #005ea2;
          border-radius: 999px;
          transition: width .35s ease;
        }
        #percentText {
          margin-top: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #005ea2;
        }
        #stepText {
          min-height: 16px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div id="statusBox">
          <div class="spinner"></div>
          <h2>${desc}</h2>
          <p id="stepText">Localidade: <b>${LOCAL_ENSAIO}</b></p>
          <div class="progress-wrap"><div id="progressBar"></div></div>
          <p id="percentText">5%</p>
          <p style="font-size: 11px; margin-top: 5px; color: #999;">Aguarde alguns segundos...</p>
        </div>

        <div id="sucessoBox">
          <div class="success-icon">✓</div>
          <h2>Concluído!</h2>
          <p>O painel foi atualizado com sucesso.</p>
          <p style="font-size: 11px; margin-top: 15px; color: #999;">Esta janela fechará sozinha.</p>
        </div>
      </div>

      <script>
        window.onload = function() {
          const tipoSync = '${tipo}';
          const progressBar = document.getElementById('progressBar');
          const percentText = document.getElementById('percentText');
          const stepText = document.getElementById('stepText');
          let currentPercent = 5;
          let serverPercent = 5;

          function paintProgress(value, allowComplete) {
            const limit = allowComplete ? 100 : 98;
            const next = Math.max(currentPercent, Math.min(limit, Number(value) || 5));
            currentPercent = next;
            progressBar.style.width = next + '%';
            percentText.textContent = Math.round(next) + '%';
          }

          const motionTimer = setInterval(function() {
            let ceiling = 28;
            if (serverPercent >= 82) {
              ceiling = 96;
            } else if (serverPercent >= 62) {
              ceiling = 78;
            } else if (serverPercent >= 42) {
              ceiling = 58;
            }
            if (currentPercent < ceiling) {
              const step = Math.max(0.25, (ceiling - currentPercent) * 0.04);
              paintProgress(currentPercent + step, false);
            }
          }, 450);

          const pollTimer = setInterval(function() {
            google.script.run
              .withSuccessHandler(function(progress) {
                if (!progress) return;
                const percent = Math.max(5, Math.min(100, progress.percent || 5));
                serverPercent = percent;
                paintProgress(percent, percent >= 100);
                if (progress.status) {
                  stepText.textContent = progress.status;
                }
              })
              .getLocalProgressUpdate();
          }, 650);
          
          google.script.run
            .withSuccessHandler(function(resJson) {
              clearInterval(pollTimer);
              clearInterval(motionTimer);
              const res = JSON.parse(resJson);
              if(res.sucesso) {
                paintProgress(100, true);
                document.getElementById('statusBox').style.display = 'none';
                document.getElementById('sucessoBox').style.display = 'flex';
                
                setTimeout(function() { google.script.host.close(); }, 3000);
              } else {
                alert('Erro: ' + res.mensagem);
                google.script.host.close();
              }
            })
            .withFailureHandler(function(err) {
              clearInterval(pollTimer);
              clearInterval(motionTimer);
              alert('Erro crítico: ' + err);
              google.script.host.close();
            })
            .executarAcaoSincronizacao(tipoSync);
        };
      </script>
    </body>
    </html>
  `;

  const htmlOutput = HtmlService.createHtmlOutput(htmlContent)
    .setWidth(350)
    .setHeight(320)
    .setTitle('Sistema SAM - Versão 1.4.7');

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, titulo);
}

function updateLocalProgress(percent, status, timeInfo) {
  try {
    SistemaSAM_Biblioteca.updateExportProgress(percent, status, timeInfo);
  } catch(e) {}

  try {
    CacheService.getScriptCache().put('SAM_LOCAL_PROGRESS', JSON.stringify({
      percent: percent,
      status: status,
      timeInfo: timeInfo
    }), 300);
  } catch(e) {}
}

function getLocalProgressUpdate() {
  try {
    const fromLibrary = SistemaSAM_Biblioteca.getProgressUpdate();
    if (fromLibrary && fromLibrary.percent != null) return fromLibrary;
  } catch(e) {}

  try {
    const cached = CacheService.getScriptCache().get('SAM_LOCAL_PROGRESS');
    return cached ? JSON.parse(cached) : { percent: 5, status: 'Iniciando...' };
  } catch(e) {
    return { percent: 5, status: 'Iniciando...' };
  }
}


/**
 * Função de ponte para execução segura
 */
function executarAcaoSincronizacao(tipo) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let resultado;
    
    // MODO PULL: a planilha local busca a fonte remota, espelha a aba Registros
    // e depois recalcula Resumo, Organistas e Ministerio.
    resultado = SistemaSAM_Biblioteca.processarDadosRegionaisCentral(LOCAL_ENSAIO, ss);
    
    return JSON.stringify(resultado);
  } catch(e) {
    return JSON.stringify({ sucesso: false, mensagem: e.message });
  }
}
```

```
