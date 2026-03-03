/**
 * 🛡️ UTILITÁRIOS DE SEGURANÇA
 *
 * Este módulo fornece funções centralizadas para validação, sanitização
 * e proteção contra vulnerabilidades comuns de segurança.
 *
 * IMPORTANTE: Não altera a funcionalidade existente, apenas adiciona camadas de segurança.
 */

/**
 * Padrões suspeitos que podem indicar tentativas de ataque
 */
const SUSPICIOUS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>.*?<\/embed>/gi,
  /<link[^>]*>.*?<\/link>/gi,
  /<meta[^>]*>.*?<\/meta>/gi,
  /<style[^>]*>.*?<\/style>/gi,
  /<form[^>]*>.*?<\/form>/gi,
  /<input[^>]*>.*?<\/input>/gi,
  /<button[^>]*>.*?<\/button>/gi,
  /<select[^>]*>.*?<\/select>/gi,
  /<textarea[^>]*>.*?<\/textarea>/gi,
  /eval\s*\(/gi,
  /Function\s*\(/gi,
  /expression\s*\(/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
];

/**
 * Caracteres de controle perigosos
 */
const DANGEROUS_CONTROL_CHARS = /[\x00-\x1F\x7F-\x9F]/g;

/**
 * Limites de comprimento para diferentes tipos de campos
 */
export const FIELD_LIMITS = {
  nome: 200,
  comum: 200,
  cidade: 100,
  cargo: 100,
  instrumento: 100,
  classe: 50,
  email: 255,
  textarea: 1000,
  default: 255,
} as const;

/**
 * Valida se uma string contém padrões suspeitos
 */
export const containsSuspiciousPattern = (input: string): boolean => {
  if (!input || typeof input !== 'string') {
    return false;
  }

  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(input));
};

/**
 * Remove caracteres de controle perigosos
 */
export const removeDangerousChars = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.replace(DANGEROUS_CONTROL_CHARS, '').trim();
};

/**
 * Escapa caracteres HTML para prevenir XSS
 */
export const escapeHtml = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, char => map[char] || char);
};

/**
 * Sanitiza uma string removendo caracteres perigosos e normalizando
 * IMPORTANTE: Mantém a funcionalidade original, apenas adiciona segurança
 */
export const sanitizeInput = (
  input: string,
  options: {
    maxLength?: number;
    allowHtml?: boolean;
    fieldType?: keyof typeof FIELD_LIMITS;
  } = {}
): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const { maxLength, allowHtml = false, fieldType = 'default' } = options;
  const limit = maxLength || FIELD_LIMITS[fieldType] || FIELD_LIMITS.default;

  // 1. Remover caracteres de controle perigosos
  let sanitized = removeDangerousChars(input);

  // 2. Verificar padrões suspeitos (mas não bloquear - apenas limpar)
  if (containsSuspiciousPattern(sanitized)) {
    // Remover tags HTML perigosas se não permitidas
    if (!allowHtml) {
      sanitized = sanitized
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
  }

  // 3. Escapar HTML se não permitido
  if (!allowHtml) {
    sanitized = escapeHtml(sanitized);
  }

  // 4. Normalizar espaços
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // 5. Aplicar limite de comprimento
  if (sanitized.length > limit) {
    sanitized = sanitized.substring(0, limit).trim();
  }

  return sanitized;
};

/**
 * Valida comprimento de string
 */
export const validateLength = (
  input: string,
  min: number,
  max: number,
  fieldName = 'campo'
): { valid: boolean; error?: string } => {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: `${fieldName} é obrigatório` };
  }

  const trimmed = input.trim();
  if (trimmed.length < min) {
    return {
      valid: false,
      error: `${fieldName} deve ter pelo menos ${min} caracteres`,
    };
  }

  if (trimmed.length > max) {
    return {
      valid: false,
      error: `${fieldName} deve ter no máximo ${max} caracteres`,
    };
  }

  return { valid: true };
};

/**
 * Valida formato de email
 */
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email é obrigatório' };
  }

  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Email inválido' };
  }

  if (trimmed.length > FIELD_LIMITS.email) {
    return {
      valid: false,
      error: `Email deve ter no máximo ${FIELD_LIMITS.email} caracteres`,
    };
  }

  return { valid: true };
};

/**
 * Sanitiza dados de um objeto recursivamente
 */
export const sanitizeObject = <T extends Record<string, any>>(
  obj: T,
  options: {
    maxDepth?: number;
    allowHtml?: boolean;
  } = {}
): T => {
  const { maxDepth = 10, allowHtml = false } = options;

  const sanitizeRecursive = (value: any, depth: number): any => {
    if (depth > maxDepth) {
      return value; // Prevenir recursão infinita
    }

    if (typeof value === 'string') {
      return sanitizeInput(value, { allowHtml });
    }

    if (Array.isArray(value)) {
      return value.map(item => sanitizeRecursive(item, depth + 1));
    }

    if (value && typeof value === 'object') {
      const sanitized: any = {};
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          sanitized[key] = sanitizeRecursive(value[key], depth + 1);
        }
      }
      return sanitized;
    }

    return value;
  };

  return sanitizeRecursive(obj, 0) as T;
};

/**
 * Remove dados sensíveis de um objeto para logging seguro
 */
export const sanitizeForLogging = (data: any): any => {
  const sensitiveKeys = [
    'password',
    'passwd',
    'pwd',
    'token',
    'access_token',
    'refresh_token',
    'secret',
    'api_key',
    'apikey',
    'auth',
    'authorization',
    'session',
    'cookie',
    'credit_card',
    'cc',
    'ssn',
    'cpf',
    'cnpj',
  ];

  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item));
  }

  const sanitized: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

      if (isSensitive) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        sanitized[key] = sanitizeForLogging(data[key]);
      } else {
        sanitized[key] = data[key];
      }
    }
  }

  return sanitized;
};

/**
 * Rate limiting simples (em memória)
 * Para produção, considere usar Redis ou outro sistema distribuído
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Verifica se uma requisição pode ser processada
   */
  canProceed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];

    // Remover requisições antigas (fora da janela)
    const recentRequests = userRequests.filter(timestamp => now - timestamp < this.windowMs);

    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    // Adicionar nova requisição
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);

    // Limpar requisições antigas periodicamente
    if (Math.random() < 0.01) {
      // 1% de chance de limpar (evita limpeza constante)
      this.cleanup();
    }

    return true;
  }

  /**
   * Limpa requisições antigas
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(timestamp => now - timestamp < this.windowMs);
      if (recentRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recentRequests);
      }
    }
  }

  /**
   * Reseta o rate limiter para um identificador
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// Rate limiters para diferentes operações
export const rateLimiters = {
  // 30 requisições por minuto para operações gerais
  general: new RateLimiter(30, 60 * 1000),
  // 10 requisições por minuto para operações de escrita
  write: new RateLimiter(10, 60 * 1000),
  // 5 requisições por minuto para autenticação
  auth: new RateLimiter(5, 60 * 1000),
  // 100 requisições por hora para operações de leitura
  read: new RateLimiter(100, 60 * 60 * 1000),
};

/**
 * Verifica se uma requisição está dentro do rate limit
 */
export const checkRateLimit = (
  identifier: string,
  type: keyof typeof rateLimiters = 'general'
): { allowed: boolean; error?: string } => {
  const limiter = rateLimiters[type];
  if (limiter.canProceed(identifier)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    error: 'Muitas requisições. Tente novamente em alguns instantes.',
  };
};
