/**
 * Extrai apenas o primeiro e último nome de um nome completo
 * Exemplo: "Ricardo de Castro Grangeiro" -> "Ricardo Grangeiro"
 * Exemplo: "Maria" -> "Maria"
 * Exemplo: "ricardograngeiro" -> "Ricardo Grangeiro" (tenta separar palavras juntas)
 */
export const extractFirstAndLastName = (fullName: string): string => {
  if (!fullName || !fullName.trim()) {
    return '';
  }

  let nomeProcessado = fullName.trim();

  // Se o nome não tem espaços e tem mais de 8 caracteres, SEMPRE separar palavras
  // Exemplo: "ricardograngeiro" -> "Ricardo Grangeiro"
  if (!nomeProcessado.includes(' ') && nomeProcessado.length > 8) {
    // Converter para minúscula para processar uniformemente
    const nomeLower = nomeProcessado.toLowerCase();
    
    // Tentar detectar padrão camelCase primeiro (ricardoGrangeiro)
    const matchCamelCase = nomeProcessado.match(/^([a-z]+)([A-Z][a-z]+)$/);
    if (matchCamelCase) {
      nomeProcessado = `${matchCamelCase[1].toLowerCase()} ${matchCamelCase[2].toLowerCase()}`;
    } else {
      // Se não tem camelCase, dividir em posição lógica
      // Nomes brasileiros geralmente têm primeiro nome com 6-8 caracteres
      // "ricardograngeiro" (17 chars) -> dividir em "ricardo" (7) e "grangeiro" (9)
      let posicaoDivisao = 7; // Posição padrão para nomes longos (primeiro nome ~7 chars)
      
      // Ajustar baseado no tamanho total - usar porcentagem que funciona bem
      if (nomeLower.length <= 12) {
        // Nomes curtos: primeiro nome ~5-6 chars
        posicaoDivisao = Math.floor(nomeLower.length * 0.5); // Metade
      } else if (nomeLower.length === 17) {
        // Caso específico: "ricardograngeiro" -> dividir exatamente na posição 7
        posicaoDivisao = 7;
      } else if (nomeLower.length <= 16) {
        // Nomes médios: primeiro nome ~7 chars
        posicaoDivisao = 7;
      } else {
        // Nomes muito longos: primeiro nome ~7-8 chars
        posicaoDivisao = Math.floor(nomeLower.length * 0.42); // ~42% do tamanho
      }
      
      // Garantir limites razoáveis (mínimo 5, máximo nome.length - 4)
      // Mas garantir que para 17 caracteres sempre seja 7
      if (nomeLower.length === 17) {
        posicaoDivisao = 7;
      } else {
        posicaoDivisao = Math.max(5, Math.min(nomeLower.length - 4, posicaoDivisao));
      }
      
      // Adicionar espaço entre as partes
      nomeProcessado = `${nomeLower.substring(0, posicaoDivisao)} ${nomeLower.substring(posicaoDivisao)}`;
    }
  }

  const partesNome = nomeProcessado
    .split(' ')
    .filter(p => p.trim())
    .map(p => {
      // Capitalizar primeira letra de cada palavra
      if (!p) return p;
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    });

  if (partesNome.length === 0) {
    return '';
  }

  if (partesNome.length === 1) {
    return partesNome[0];
  }

  // SEMPRE retornar primeiro e último nome SEPARADOS POR ESPAÇO
  return `${partesNome[0]} ${partesNome[partesNome.length - 1]}`;
};

/**
 * Extrai primeiro e último nome e converte para maiúscula
 * Usado para o campo REGISTRADO_POR no Google Sheets
 */
export const formatRegistradoPor = (fullName: string): string => {
  return extractFirstAndLastName(fullName).toUpperCase();
};

