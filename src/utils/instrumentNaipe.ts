import { normalizeString } from './stringNormalization';

// Mapeamento de instrumentos para naipes (do backupcont/app.js)
// 🚨 CORREÇÃO: Incluir variações com e sem acentos para garantir compatibilidade
export const INSTRUMENT_NAIPES: Record<string, string> = {
  VIOLINO: 'CORDAS',
  VIOLA: 'CORDAS',
  VIOLONCELO: 'CORDAS',
  FLAUTA: 'MADEIRAS',
  OBOÉ: 'MADEIRAS',
  OBOE: 'MADEIRAS', // Variação sem acento
  "OBOÉ D'AMORE": 'MADEIRAS',
  "OBOE D'AMORE": 'MADEIRAS', // Variação sem acento
  'CORNE INGLÊS': 'MADEIRAS',
  'CORNE INGLES': 'MADEIRAS', // Variação sem acento
  CLARINETE: 'MADEIRAS',
  'CLARINETE ALTO': 'MADEIRAS',
  'CLARINETE BAIXO (CLARONE)': 'MADEIRAS',
  'CLARINETE CONTRA BAIXO': 'MADEIRAS',
  FAGOTE: 'MADEIRAS',
  'SAXOFONE SOPRANO (RETO)': 'MADEIRAS',
  'SAXOFONE SOPRANINO': 'MADEIRAS',
  'SAXOFONE ALTO': 'MADEIRAS',
  'SAXOFONE TENOR': 'MADEIRAS',
  'SAXOFONE BARÍTONO': 'MADEIRAS',
  'SAXOFONE BARITONO': 'MADEIRAS', // Variação sem acento
  'SAXOFONE BAIXO': 'MADEIRAS',
  'SAX OCTA CONTRABAIXO': 'MADEIRAS',
  'SAX HORN': 'METAIS',
  TROMPA: 'METAIS',
  TROMPETE: 'METAIS',
  CORNET: 'METAIS',
  FLUGELHORN: 'METAIS',
  TROMBONE: 'METAIS',
  TROMBONITO: 'METAIS',
  EUFÔNIO: 'METAIS',
  EUFONIO: 'METAIS', // 🚨 CORREÇÃO: Variação sem acento para candidatos
  'BARÍTONO (PISTO)': 'METAIS',
  'BARITONO (PISTO)': 'METAIS', // Variação sem acento
  TUBA: 'METAIS',
  ACORDEON: 'TECLADO',
};

/**
 * Obtém o naipe do instrumento (seguindo lógica do app.js)
 * @param instrumento Nome do instrumento
 * @returns Naipe do instrumento (CORDAS, MADEIRAS, METAIS, TECLADO) ou string vazia
 */
export function getNaipeByInstrumento(instrumento: string | null | undefined): string {
  if (!instrumento) return '';

  const instrumentoUpper = instrumento.toUpperCase().trim();

  // 🚨 CORREÇÃO: Busca exata primeiro (com acentos)
  if (INSTRUMENT_NAIPES[instrumentoUpper]) {
    return INSTRUMENT_NAIPES[instrumentoUpper];
  }

  // 🚨 CORREÇÃO: Busca normalizada (sem acentos) para candidatos
  const instrumentoNormalizado = normalizeString(instrumentoUpper);
  for (const [instrumentoKey, naipe] of Object.entries(INSTRUMENT_NAIPES)) {
    const keyNormalizado = normalizeString(instrumentoKey);
    if (instrumentoNormalizado === keyNormalizado) {
      return naipe;
    }
  }

  // Busca parcial para instrumentos com variações (com acentos)
  for (const [instrumentoKey, naipe] of Object.entries(INSTRUMENT_NAIPES)) {
    if (instrumentoUpper.includes(instrumentoKey) || instrumentoKey.includes(instrumentoUpper)) {
      return naipe;
    }
  }

  // Busca parcial normalizada (sem acentos)
  for (const [instrumentoKey, naipe] of Object.entries(INSTRUMENT_NAIPES)) {
    const keyNormalizado = normalizeString(instrumentoKey);
    if (
      instrumentoNormalizado.includes(keyNormalizado) ||
      keyNormalizado.includes(instrumentoNormalizado)
    ) {
      return naipe;
    }
  }

  // Se não encontrou, retornar vazio
  console.warn('⚠️ Naipe não encontrado para instrumento:', instrumento);
  return '';
}
