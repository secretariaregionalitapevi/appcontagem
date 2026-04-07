# Arquitetura Autônoma para Planilhas Regionais (Modelo Pull)

Este documento descreve o conceito e a estratégia para transformar o sistema atual de exportação centralizada (Matriz empurrando dados) em um sistema autônomo e distribuído (Regionais puxando dados).

## 1. O Problema do Modelo Atual (Push / Empurrar)
Atualmente, o script principal (Matriz) processa todas as informações e envia os dados para as planilhas de Cotia, Itapevi, Pirapora, etc.
- **Limites de Tempo (Timeouts):** O Google Apps Script corta execuções que duram mais de 6 minutos. Se a base crescer e a Matriz tentar exportar para 8 regionais juntas, o script vai falhar e não terminará o trabalho.
- **Falha em Cascata:** Se a planilha de uma regional estiver com problema (ex: nome de aba alterado), pode parar a execução de todas as outras.
- **Gargalo Central:** O encarregado regional não tem controle sobre quando os dados chegam; ele depende de um administrador da Matriz apertar o botão de sincronizar.

## 2. A Solução: Modelo Autônomo (Pull / Puxar)
Nesta nova arquitetura, a planilha "Matriz" funciona apenas como Banco de Dados passivo. Cada planilha Regional terá seu próprio botão e seu próprio Script para ir lá, ler os dados e atualizar a si mesma.

### Como funciona:
1. **Gatilho Local:** O usuário (ex: encarregado de Cotia) abre a planilha dele e clica em "Sincronizar Meus Dados".
2. **Busca Ativa:** O script inserido *dentro* da planilha de Cotia abre a planilha Matriz usando `SpreadsheetApp.openById(ID_DA_MATRIZ)`.
3. **Download Rápido:** Ele lê todas as linhas da matriz, mas filtra na memória apenas aquelas onde a coluna "Local" for igual a "Cotia".
4. **Cálculo Local:** O script local faz as contas e atualiza as abas de "Resumo" e "Organistas" da sua própria planilha.

### Benefícios:
- **Imune a Timeouts:** O processamento para apenas uma regional leva segundos. É impossível estourar o limite de 6 minutos do Google.
- **Isolamento Total:** Se o encarregado de Pirapora quebrar a planilha dele, não afeta em absolutamente nada a planilha de Cotia ou da Matriz.
- **Autonomia Total:** Cada encarregado regional sincroniza na hora que quiser e quantas vezes quiser.

---

## 3. O Ponto de Atenção (Gargalo de Manutenção)
Se colocarmos um código de 3.000 linhas solto dentro da planilha de Cotia, Itapevi, Jandira, etc... e um dia precisarmos corrigir um simples detalhe (como as regras de contagem das "Examinadoras"), nós teríamos que **abrir 8 planilhas diferentes, ir em 8 painéis de código diferentes e colar a alteração 8 vezes.** Isso tornaria a manutenção de software um pesadelo.

## 4. A Ouro-Padrão: Bibliotecas (Libraries) no Apps Script
Para manter a autonomia elogiada acima, mas sem sofrer com o pesadelo da manutenção, o Google Apps Script permite criar **Libraries**.

### O que é?
A biblioteca é colocar toda a "inteligência do sistema" (aquelas milhares de linhas de código que acabamos de ajustar no `Registros.gs` e `Helpers.gs`) armazenadas em apenas **um único arquivo central**.

### A Estrutura da Biblioteca:
1. **O Código-Fonte Central (Biblioteca):**
   Existe um projeto pai no Apps Script (o Backend principal). Lá ficam as funções como `ProcessadorRegional.sincronizar('Cotia')`.
2. **A Planilha Regional (Ex: Cotia):**
   Dentro da planilha de Cotia, o script realterado pelo encarregado terá apenas 3 a 5 linhas.
   ```javascript
   // Código dentro da planilha de Cotia
   function atualizarMeusDados() {
     // Chama a função lá da Biblioteca Central passando o nome da cidade
     SistemaSAM_Biblioteca.processarDadosRegionais('Cotia', SpreadsheetApp.getActiveSpreadsheet());
   }
   ```

### Vantagem Definitiva
Quando você encontrar um "bug" na forma como o sistema conta as instrutoras, você corrige o código em **um único lugar** (na Biblioteca Central). Na mesma hora, as 8 planilhas regionais já passam a usar o cálculo corrigido na próxima vez que alguém clicar no botão "Atualizar", porque todas elas estão puxando o comportamento dessa biblioteca unificada.

## 5. Passos para a Futura Transição
Quando decidirmos implementar essa melhoria:
1. Criar e publicar o nosso projeto atual como uma **"Biblioteca"** no Google Apps Script.
2. Criar um menu customizado (`onOpen`) que crie um botão "Sincronizar Dados" e injeta-lo no Apps Script de *cada* planilha regional.
3. Configurar cada planilha regional para referenciar o ID da nossa Biblioteca.
4. Desligar gradativamente as exportações forçadas oriundas da aba Matriz.
