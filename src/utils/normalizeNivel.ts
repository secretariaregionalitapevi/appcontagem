/**
 * Normalização do campo NÍVEL baseado em regras específicas:
 * - Para qualquer instrumento masculino: substituir "oficializado(a)" por "oficializado"
 * - Para órgão: substituir "oficializado(a)" por "oficializada"
 * - Para cargos femininos (Organista, Instrutora, Examinadora, Secretária da Música): substituir "oficializado(a)" por "oficializada"
 * - Se tiver prefixo "rjm /": manter o prefixo e substituir apenas "oficializado(a)"
 *
 * Exemplos:
 * - "oficializado(a)" + violino → "oficializado"
 * - "oficializado(a)" + órgão → "oficializada"
 * - "oficializado(a)" + organista → "oficializada"
 * - "rjm / oficializado(a)" + violino → "rjm / oficializado"
 * - "rjm / oficializado(a)" + órgão → "rjm / oficializada"
 */

import { isCargoFemininoOrganista } from './normalizeCargoFeminino';

/**
 * Normaliza o campo nivel baseado no instrumento e cargo
 * @param nivelOriginal - Nível original da pessoa (pode ser null ou string)
 * @param instrumentoNome - Nome do instrumento (ex: "VIOLINO", "ÓRGÃO")
 * @param cargoNome - Nome do cargo (ex: "MÚSICO", "ORGANISTA")
 * @returns Nível normalizado
 */
export function normalizarNivel(
  nivelOriginal: string | null | undefined,
  instrumentoNome: string | null | undefined,
  cargoNome: string | null | undefined
): string | null {
  // Se não há nivel original, retornar null
  if (!nivelOriginal || !nivelOriginal.trim()) {
    return null;
  }

  const instrumentoUpper = instrumentoNome?.toUpperCase().trim() || '';
  const cargoUpper = cargoNome?.toUpperCase().trim() || '';
  const nivelUpper = nivelOriginal.toUpperCase().trim();

  // Verificar se é órgão ou cargo feminino (feminino)
  const isOrgao = instrumentoUpper === 'ÓRGÃO' || instrumentoUpper === 'ORGAO';
  const isCargoFem = isCargoFemininoOrganista(cargoUpper);
  const isFeminino = isOrgao || isCargoFem;

  // Verificar se tem prefixo "rjm /" ou similar
  const matchPrefix = nivelUpper.match(/^(.+?)\s*\/\s*(.+)$/);

  if (matchPrefix) {
    // Tem prefixo (ex: "rjm / oficializado(a)")
    const prefixo = matchPrefix[1].trim();
    const sufixo = matchPrefix[2].trim();

    // Verificar se o sufixo contém "oficializado(a)"
    if (sufixo.includes('OFICIALIZADO') || sufixo.includes('OFICIALIZADA')) {
      // Remover "(a)" do sufixo
      let sufixoNormalizado = sufixo
        .replace(/\s*\(a\)\s*/gi, '')
        .replace(/\s*\(A\)\s*/g, '')
        .trim();

      // Se for feminino (órgão ou organista), usar "OFICIALIZADA"
      if (isFeminino) {
        sufixoNormalizado = sufixoNormalizado.replace(/OFICIALIZADO/gi, 'OFICIALIZADA');
        return `${prefixo} / ${sufixoNormalizado}`;
      } else {
        // Se for masculino (qualquer outro instrumento), usar "OFICIALIZADO"
        sufixoNormalizado = sufixoNormalizado.replace(/OFICIALIZADA/gi, 'OFICIALIZADO');
        return `${prefixo} / ${sufixoNormalizado}`;
      }
    }

    // 🚨 CORREÇÃO CRÍTICA: Se o sufixo não contém "oficializado" mas é cargo feminino e o sufixo é "OFICIALIZADO", converter
    if (isFeminino && sufixo.toUpperCase().trim() === 'OFICIALIZADO') {
      return `${prefixo} / OFICIALIZADA`;
    }

    // Se o sufixo não contém "oficializado", manter como está
    return nivelOriginal.trim();
  }

  // Não tem prefixo - normalizar diretamente
  if (nivelUpper.includes('OFICIALIZADO') || nivelUpper.includes('OFICIALIZADA')) {
    // Remover "(a)"
    let nivelNormalizado = nivelUpper
      .replace(/\s*\(a\)\s*/gi, '')
      .replace(/\s*\(A\)\s*/g, '')
      .trim();

    // Se for feminino (órgão ou cargo feminino), usar "OFICIALIZADA"
    if (isFeminino) {
      nivelNormalizado = nivelNormalizado.replace(/OFICIALIZADO/gi, 'OFICIALIZADA');
      return nivelNormalizado;
    } else {
      // Se for masculino (qualquer outro instrumento), usar "OFICIALIZADO"
      nivelNormalizado = nivelNormalizado.replace(/OFICIALIZADA/gi, 'OFICIALIZADO');
      return nivelNormalizado;
    }
  }

  // 🚨 CORREÇÃO CRÍTICA: Se não contém "oficializado" mas é cargo feminino e o nivel é exatamente "OFICIALIZADO", converter para "OFICIALIZADA"
  if (isFeminino && nivelUpper === 'OFICIALIZADO') {
    return 'OFICIALIZADA';
  }

  // Se não contém "oficializado", retornar original
  return nivelOriginal.trim();
}
