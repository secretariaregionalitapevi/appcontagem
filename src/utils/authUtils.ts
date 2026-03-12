
/**
 * Traduz mensagens de erro do Supabase Auth para Português.
 */
export const translateAuthError = (message: string): string => {
  if (!message) return 'Ocorreu um erro inesperado.';
  const msg = String(message);

  // Mensagens comuns de login/cadastro
  if (msg.includes('Invalid login credentials') || msg.includes('Invalid email or password')) {
    return 'E-mail ou senha incorretos. Verifique suas credenciais.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'E-mail não confirmado. Verifique sua caixa de entrada.';
  }
  if (msg.includes('User not found')) {
    return 'Usuário não encontrado. Verifique o e-mail.';
  }
  if (msg.includes('User already registered')) {
    return 'Este e-mail já está cadastrado.';
  }
  if (msg.includes('Password is too short')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }

  // Mensagens de recuperação/redefinição de senha
  if (msg.includes('New password should be different from the old password')) {
    return 'A nova senha deve ser diferente da senha anterior.';
  }
  if (msg.includes('Flow not found') || msg.includes('Identity not found')) {
    return 'O link de recuperação expirou ou é inválido.';
  }

  // Erros de sistema/conexão
  if (msg.includes('JWT expired')) {
    return 'Sessão expirada. Faça login novamente.';
  }
  if (msg.includes('rate limit') || msg.includes('Rate limit')) {
    return 'Muitas tentativas. Aguarde alguns instantes e tente novamente.';
  }
  if (msg.includes('Network') || msg.includes('Failed to fetch')) {
    return 'Falha de conexão. Verifique sua internet e tente novamente.';
  }
  if (msg.includes('FetchError') || msg.includes('timeout')) {
    return 'Tempo de resposta esgotado. Verifique sua conexão e tente novamente.';
  }

  // Fallback para mensagens genéricas conhecidas ou a própria mensagem se não houver mapeamento
  if (msg.includes('Database error')) return 'Erro no banco de dados. Tente novamente mais tarde.';
  
  return msg;
};
