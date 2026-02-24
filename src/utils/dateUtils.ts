/**
 * Formata data e hora no formato brasileiro: dd/mm/aaaa HH:mm
 * Usa timezone de São Paulo para garantir consistência
 * @param date - Data em formato Date, string ISO ou undefined (usa data atual)
 * @returns String formatada: "dd/mm/aaaa HH:mm"
 */
export const formatDateTime = (date?: Date | string): string => {
  return formatDateTimeManual(date ? (typeof date === 'string' ? date : date.toISOString()) : undefined);
};

/**
 * Formata apenas a data no formato brasileiro: dd/mm/aaaa
 * Usa timezone de São Paulo para garantir consistência
 * @param date - Data em formato Date, string ISO ou undefined (usa data atual)
 * @returns String formatada: "dd/mm/aaaa"
 */
export const formatDate = (date?: Date | string): string => {
  const d = date 
    ? (typeof date === 'string' ? new Date(date) : date)
    : new Date();
  
  const timeZone = 'America/Sao_Paulo';
  return d.toLocaleDateString('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Formata apenas a hora no formato brasileiro: HH:mm:ss
 * Usa timezone de São Paulo para garantir consistência
 * @param date - Data em formato Date, string ISO ou undefined (usa data atual)
 * @returns String formatada: "HH:mm:ss"
 */
export const formatTime = (date?: Date | string): string => {
  const d = date 
    ? (typeof date === 'string' ? new Date(date) : date)
    : new Date();
  
  const timeZone = 'America/Sao_Paulo';
  return d.toLocaleTimeString('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

/**
 * Formata data e hora no formato brasileiro: dd/mm/aaaa HH:mm
 * Versão manual para garantir consistência absoluta (não depende de toLocaleString)
 * Usa timezone de São Paulo (America/Sao_Paulo)
 * @param dateISO - Data em formato ISO string ou undefined (usa data atual)
 * @returns String formatada: "dd/mm/aaaa HH:mm"
 */
export const formatDateTimeManual = (dateISO?: string): string => {
  const data = dateISO ? new Date(dateISO) : new Date();
  
  // Formatar usando toLocaleString com timezone de São Paulo, depois extrair componentes
  // Isso garante que sempre use o timezone correto independente do dispositivo
  const timeZone = 'America/Sao_Paulo';
  
  // Obter data formatada
  const dataFormatada = data.toLocaleDateString('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  
  // Obter hora formatada
  const horaFormatada = data.toLocaleTimeString('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  return `${dataFormatada} ${horaFormatada}`;
};

export const getCurrentDateTimeISO = (): string => {
  return new Date().toISOString();
};
