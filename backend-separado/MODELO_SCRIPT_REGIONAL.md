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
  exibirModalSincronizacao('LOCAL');
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
      </style>
    </head>
    <body>
      <div class="card">
        <div id="statusBox">
          <div class="spinner"></div>
          <h2>${desc}</h2>
          <p>Localidade: <b>${LOCAL_ENSAIO}</b></p>
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
          
          google.script.run
            .withSuccessHandler(function(resJson) {
              const res = JSON.parse(resJson);
              if(res.sucesso) {
                document.getElementById('statusBox').style.display = 'none';
                document.getElementById('sucessoBox').style.display = 'flex';
                
                setTimeout(function() { google.script.host.close(); }, 3000);
              } else {
                alert('Erro: ' + res.mensagem);
                google.script.host.close();
              }
            })
            .withFailureHandler(function(err) {
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


/**
 * Função de ponte para execução segura
 */
function executarAcaoSincronizacao(tipo) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let resultado;
    
    if (tipo === 'LOCAL') {
      resultado = SistemaSAM_Biblioteca.sincronizarLocalmenteDesdeRegistros(ss);
    } else {
      // MODO PULL: Busca da matriz e depois atualiza local
      resultado = SistemaSAM_Biblioteca.processarDadosRegionaisCentral(LOCAL_ENSAIO, ss);
    }
    
    return JSON.stringify(resultado);
  } catch(e) {
    return JSON.stringify({ sucesso: false, mensagem: e.message });
  }
}
```

```
