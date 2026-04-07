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
const LOCAL_ENSAIO = 'SuaRegionalAqui';

/**
 * Cria o menu personalizado quando a planilha é aberta
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔄 Atualizar Dados')
    .addItem('⚡ Sincronizar Dados', 'sincronizarDados')
    .addToUi();
}

/**
 * Função acionada pelo menu que abre a interface de carregamento
 */
function sincronizarDados() {
  const htmlString = `
  <!DOCTYPE html>
  <html>
  <head>
    <base target="_top">
    <style>
      body, html {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        font-family: Arial, sans-serif;
        background-color: #f8f9fa;
        color: #333;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        overflow: hidden;
      }
      .spinner {
        border: 4px solid rgba(0, 0, 0, 0.1);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border-left-color: #1a73e8;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      h2 { margin: 0 0 10px 0; font-size: 20px; color: #202124; }
      p { margin: 0; font-size: 14px; color: #5f6368; }
      #resultado { display: none; margin-top: 15px; font-size: 14px; text-align: left; display: inline-block; background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #ddd; }
    </style>
  </head>
  <body>
    
    <div id="loadingBox">
      <div style="display:flex; justify-content:center;"><div class="spinner"></div></div>
      <h2>Sincronizando...</h2>
      <p>Puxando dados de ` + LOCAL_ENSAIO + `</p>
      <p style="font-size: 12px; margin-top: 5px;">Aguarde alguns segundos...</p>
    </div>

    <div id="sucessoBox" style="display:none;">
      <h2 style="color: #0f9d58;">✓ Sucesso!</h2>
      <p>Painel localizado e atualizado.</p>
      <div id="resultado" style="display:none;"></div>
      <p style="font-size: 12px; margin-top: 15px; color: #999;">Fechando janela...</p>
    </div>

    <div id="erroBox" style="display:none;">
      <h2 style="color: #d93025;">Erro</h2>
      <p id="erroMensagem">Ocorreu um problema.</p>
      <button onclick="google.script.host.close()" style="margin-top:20px; padding: 8px 16px; background:#1a73e8; color:white; border:none; border-radius:4px; cursor:pointer;">Fechar</button>
    </div>

    <script>
      document.addEventListener("DOMContentLoaded", function() {
        // Solicita ao Google Apps Script processar no backend
        google.script.run
          .withSuccessHandler(onSuccess)
          .withFailureHandler(onFailure)
          .executarSincronizacaoSegura();
      });

      function onSuccess(resultadoJson) {
        document.getElementById('loadingBox').style.display = 'none';
        
        try {
          const resultado = JSON.parse(resultadoJson);
          
          if(resultado.sucesso) {
            document.getElementById('sucessoBox').style.display = 'block';
            
            const resBox = document.getElementById('resultado');
            resBox.innerHTML = 
              '<b>Membros:</b> ' + (resultado.detalhes?.resumo?.totalMembros || 0) + '<br>' +
              '<b>Organistas:</b> ' + (resultado.detalhes?.organistas?.totalOrganistas || 0) + '<br>' +
              '<b>Ministério:</b> ' + (resultado.detalhes?.ministerio?.totalMinisterio || 0);
            resBox.style.display = 'inline-block';

            // Fecha sozinho em 3 segundos
            setTimeout(function() {
              google.script.host.close();
            }, 3000);
          } else {
            throw new Error(resultado.mensagem || "Erro inesperado.");
          }
        } catch(e) {
          onFailure(e);
        }
      }

      function onFailure(erro) {
        document.getElementById('loadingBox').style.display = 'none';
        document.getElementById('erroBox').style.display = 'block';
        document.getElementById('erroMensagem').innerText = erro.message || 'Falha na conexão com a Matriz.';
      }
    </script>
  </body>
  </html>
  `;

  const htmlOutput = HtmlService.createHtmlOutput(htmlString)
    .setWidth(300)
    .setHeight(220);

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Atualização de Dados');
}

/**
 * Função Segura: empacota o retorno em JSON
 */
function executarSincronizacaoSegura() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const resultado = SistemaSAM_Biblioteca.processarDadosRegionaisCentral(LOCAL_ENSAIO, ss);
    return JSON.stringify(resultado);
  } catch(e) {
    return JSON.stringify({
      sucesso: false,
      mensagem: e.message
    });
  }
}
```
