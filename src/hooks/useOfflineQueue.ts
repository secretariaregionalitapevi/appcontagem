import { useState, useEffect, useCallback } from 'react';
import { supabaseDataService } from '../services/supabaseDataService';

export const useOfflineQueue = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      setLoading(true);
      const count = await supabaseDataService.countRegistrosPendentes();
      setPendingCount(count);
      console.log(`📊 Fila atualizada: ${count} ${count === 1 ? 'item' : 'itens'} pendente${count === 1 ? '' : 's'}`);
    } catch (error) {
      console.error('Erro ao contar registros pendentes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Atualizar imediatamente ao montar
    refreshCount();
    
    // Atualizar a cada 3 segundos (mais frequente para melhor UX)
    const interval = setInterval(refreshCount, 3000);
    
    return () => clearInterval(interval);
  }, [refreshCount]);

  return {
    pendingCount,
    loading,
    refreshCount,
  };
};
