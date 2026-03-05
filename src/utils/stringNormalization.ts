/**
 * Normalização robusta de strings para todas as plataformas
 * Baseado nas melhores práticas do projeto backupcont
 */

/**
 * Remove acentos de uma string de forma robusta
 * Funciona em todas as plataformas, incluindo Xiaomi/MIUI
 */
export const removeAccents = (str: string): string => {
  if (!str || typeof str !== 'string') {
    return '';
  }

  try {
    // Método 1: Usar normalize (mais moderno e confiável)
    if (typeof String.prototype.normalize === 'function') {
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    }

    // Método 2: Fallback manual para navegadores antigos
    const accentMap: { [key: string]: string } = {
      á: 'a',
      à: 'a',
      ã: 'a',
      â: 'a',
      ä: 'a',
      é: 'e',
      è: 'e',
      ê: 'e',
      ë: 'e',
      í: 'i',
      ì: 'i',
      î: 'i',
      ï: 'i',
      ó: 'o',
      ò: 'o',
      õ: 'o',
      ô: 'o',
      ö: 'o',
      ú: 'u',
      ù: 'u',
      û: 'u',
      ü: 'u',
      ç: 'c',
      ñ: 'n',
      Á: 'A',
      À: 'A',
      Ã: 'A',
      Â: 'A',
      Ä: 'A',
      É: 'E',
      È: 'E',
      Ê: 'E',
      Ë: 'E',
      Í: 'I',
      Ì: 'I',
      Î: 'I',
      Ï: 'I',
      Ó: 'O',
      Ò: 'O',
      Õ: 'O',
      Ô: 'O',
      Ö: 'O',
      Ú: 'U',
      Ù: 'U',
      Û: 'U',
      Ü: 'U',
      Ç: 'C',
      Ñ: 'N',
    };

    return str
      .split('')
      .map(char => accentMap[char] || char)
      .join('')
      .trim();
  } catch (error) {
    console.warn('⚠️ Erro ao remover acentos, retornando string original:', error);
    return str.trim();
  }
};

/**
 * Normaliza uma string para busca (remove acentos, converte para maiúscula, remove espaços extras)
 */
export const normalizeForSearch = (str: string): string => {
  if (!str || typeof str !== 'string') {
    return '';
  }

  try {
    return removeAccents(str).toUpperCase().replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.warn('⚠️ Erro ao normalizar string para busca:', error);
    return str.trim().toUpperCase();
  }
};

/**
 * Remove caracteres de controle e invisíveis
 */
export const removeControlChars = (str: string): string => {
  if (!str || typeof str !== 'string') {
    return '';
  }

  try {
    // Remove caracteres de controle (0x00-0x1F, exceto \n, \r, \t)
    // Remove caracteres invisíveis (zero-width spaces, etc)
    return str
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Controle
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width
      .trim();
  } catch (error) {
    console.warn('⚠️ Erro ao remover caracteres de controle:', error);
    return str.trim();
  }
};

/**
 * Normalização completa de string (remove acentos, caracteres de controle, normaliza espaços)
 */
export const normalizeString = (str: string): string => {
  if (!str || typeof str !== 'string') {
    return '';
  }

  try {
    let normalized = str.trim();

    // Remover caracteres de controle
    normalized = removeControlChars(normalized);

    // Remover acentos
    normalized = removeAccents(normalized);

    // Normalizar espaços múltiplos
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  } catch (error) {
    console.warn('⚠️ Erro ao normalizar string completa:', error);
    return str.trim();
  }
};

/**
 * Capitaliza primeira letra de cada palavra
 */
export const capitalizeWords = (str: string): string => {
  if (!str || typeof str !== 'string') {
    return '';
  }

  try {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ')
      .trim();
  } catch (error) {
    console.warn('⚠️ Erro ao capitalizar palavras:', error);
    return str.trim();
  }
};

/**
 * Valida se uma string é válida para processamento
 */
export const isValidString = (str: unknown): str is string => {
  return typeof str === 'string' && str.trim().length > 0;
};

/**
 * Sanitiza uma string removendo caracteres perigosos e normalizando
 */
export const sanitizeString = (str: string): string => {
  if (!isValidString(str)) {
    return '';
  }

  try {
    let sanitized = str.trim();
    sanitized = removeControlChars(sanitized);
    // Normalizar espaços múltiplos
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized.replace(/[<>]/g, ''); // Remove < e >
  } catch (error) {
    console.warn('⚠️ Erro ao sanitizar string:', error);
    return str.trim();
  }
};
