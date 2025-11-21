/**
 * Extrai apenas o primeiro e último nome de um nome completo
 * Exemplo: "Ricardo de Castro Grangeiro" -> "Ricardo Grangeiro"
 * Exemplo: "Maria" -> "Maria"
 */
export const extractFirstAndLastName = (fullName: string): string => {
  if (!fullName || !fullName.trim()) {
    return '';
  }

  const partesNome = fullName
    .trim()
    .split(' ')
    .filter(p => p.trim());

  if (partesNome.length === 0) {
    return '';
  }

  if (partesNome.length === 1) {
    return partesNome[0];
  }

  // Retornar primeiro e último nome
  return `${partesNome[0]} ${partesNome[partesNome.length - 1]}`;
};

/**
 * Extrai primeiro e último nome e converte para maiúscula
 * Usado para o campo REGISTRADO_POR no Google Sheets
 */
export const formatRegistradoPor = (fullName: string): string => {
  return extractFirstAndLastName(fullName).toUpperCase();
};

