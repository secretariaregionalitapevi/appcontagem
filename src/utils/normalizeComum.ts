import { normalizeString } from './stringNormalization';

const COMUNS_CANONICAS_POR_CODIGO: Record<string, string> = {
  'BR-22-0423': 'BR-22-0423 - CENTRAL - CAUCAIA DO ALTO',
  'BR-22-0272': 'BR-22-0272 - FAZENDINHA - STNA DE PARNA\u00cdBA',
};

// Exceções históricas nas quais o mesmo código foi usado por comuns distintas.
// Nesses casos, o nome continua obrigatório para evitar misturar cadastros.
const CODIGOS_COMPARTILHADOS = new Set(['BR-21-1251']);

export const canonicalizeComum = (comum: string): string => {
  const texto = (comum || '').replace(/\s+/g, ' ').trim();
  const nomeNormalizado = normalizeString(texto);

  // Identidades oficiais confirmadas pelo relatorio da CCB. O nome vem antes
  // do codigo para recuperar importacoes antigas em que Capela Velha recebeu
  // incorretamente o codigo de Alphaville.
  if (nomeNormalizado.includes('ALPHAVILLE')) {
    return 'BR-21-1251 - ALPHAVILLE';
  }
  if (nomeNormalizado.includes('CAPELA VELHA') && nomeNormalizado.includes('SURU')) {
    return 'BR-21-1303 - CAPELA VELHA - SURU';
  }

  const codigo = texto.match(/^(?:BR-)?\d{2}-\d{3,6}/i)?.[0]?.toUpperCase() || '';
  return COMUNS_CANONICAS_POR_CODIGO[codigo] || texto;
};

/**
 * Remove apenas a cidade repetida no fim do nome exibido da comum.
 * A cidade continua sendo parte da chave de agrupamento, portanto igrejas
 * homonimas em municipios diferentes permanecem separadas.
 */
export const normalizeComumDisplay = (display: string, cidade?: string): string => {
  const nome = (display || '').replace(/\s+/g, ' ').trim();
  const cidadeLimpa = (cidade || '').replace(/\s+/g, ' ').trim();
  if (!nome || !cidadeLimpa) return nome;

  const partes = nome.split(/\s+-\s+/);
  const ultimoTrecho = partes[partes.length - 1] || '';
  if (partes.length > 1 && normalizeString(ultimoTrecho) === normalizeString(cidadeLimpa)) {
    const nomeSemCidade = partes.slice(0, -1).join(' - ').trim();
    // Nunca remover quando nao sobra um nome real. CAUCAIA DO ALTO e
    // CAUCAIA DO ALTO - CENTRAL, por exemplo, sao comuns distintas.
    if (normalizeString(nomeSemCidade).replace(/[^A-Z0-9]/g, '')) {
      return nomeSemCidade;
    }
  }

  const parenteses = nome.match(/^(.*)\s+\(([^)]+)\)$/);
  if (parenteses && normalizeString(parenteses[2]) === normalizeString(cidadeLimpa)) {
    const nomeSemCidade = parenteses[1].trim();
    if (normalizeString(nomeSemCidade).replace(/[^A-Z0-9]/g, '')) {
      return nomeSemCidade;
    }
  }

  return nome;
};

const extractComumParts = (comum: string): { codigo: string; display: string } => {
  const texto = canonicalizeComum(comum);
  const codigo = texto.match(/^(?:BR-)?\d{2}-\d{3,6}/i)?.[0] || '';
  const display = codigo
    ? texto.slice(codigo.length).replace(/^\s*[-:]\s*/, '').trim()
    : texto;
  return { codigo: normalizeString(codigo), display };
};

type ComumLike = {
  id: string;
  nome: string;
  displayName?: string;
  cidade?: string;
};

const toIdSlug = (value: string): string =>
  normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/** Gera um ID deterministico: inserir/reordenar comuns nao invalida registros pendentes. */
export const createStableComumId = (nome: string, displayName?: string, cidade?: string): string => {
  const canonical = canonicalizeComum(nome);
  const { codigo, display } = extractComumParts(canonical);
  const identity = [codigo, displayName || display, cidade || ''].map(toIdSlug).filter(Boolean).join('_');
  return `comum_${identity}`;
};

/**
 * Resolve IDs atuais e IDs posicionais antigos (ex.: comum_102_vila_belizario).
 * O fallback so e aceito quando identifica uma unica comum, evitando associacoes erradas.
 */
export const resolveComumById = <T extends ComumLike>(comuns: T[], comumId: string): T | undefined => {
  const exact = comuns.find(comum => String(comum.id) === String(comumId));
  if (exact) return exact;

  const stable = comuns.filter(
    comum => createStableComumId(comum.nome, comum.displayName, comum.cidade) === comumId
  );
  if (stable.length === 1) return stable[0];

  const legacyMatch = comumId.match(/^comum_\d+_(.+)$/i);
  if (!legacyMatch) return undefined;

  const legacyDisplay = toIdSlug(legacyMatch[1]);
  const candidates = comuns.filter(comum => {
    const parts = extractComumParts(comum.nome);
    const display = normalizeComumDisplay(comum.displayName || parts.display, comum.cidade);
    return toIdSlug(display) === legacyDisplay;
  });

  return candidates.length === 1 ? candidates[0] : undefined;
};

/**
 * Compara a identidade completa da comum. Correcoes explicitamente confirmadas
 * sao aplicadas antes da comparacao; nos demais casos, codigo e nome contam.
 */
export const isSameComum = (
  comumSelecionada: string,
  comumRegistro: string,
  cidadeRegistro?: string
): boolean => {
  const selecionada = extractComumParts(comumSelecionada);
  const registro = extractComumParts(comumRegistro);

  if (selecionada.codigo && registro.codigo) {
    if (selecionada.codigo !== registro.codigo) return false;

    // O código regional é a identidade mais estável. Assim, membros ainda
    // gravados com uma variante textual do mesmo código continuam aparecendo.
    if (!CODIGOS_COMPARTILHADOS.has(selecionada.codigo)) return true;
  }

  const nomeSelecionado = normalizeString(
    normalizeComumDisplay(selecionada.display, cidadeRegistro)
  );
  const nomeRegistro = normalizeString(
    normalizeComumDisplay(registro.display, cidadeRegistro)
  );

  return Boolean(nomeSelecionado) && nomeSelecionado === nomeRegistro;
};
