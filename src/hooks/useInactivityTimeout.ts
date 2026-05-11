import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { robustGetItem, robustSetItem } from '../utils/robustStorage';

interface UseInactivityTimeoutOptions {
  timeout: number; // em milissegundos (1 hora = 3600000)
  onTimeout: () => void;
  enabled?: boolean;
}

const STORAGE_KEY = '@last_activity_timestamp';
const WARNING_THRESHOLD = 60000; // 1 minuto de aviso
const STORAGE_THROTTLE = 10000; // 10 segundos de throttle para escrita no storage

/**
 * Hook para detectar inatividade e executar callback após timeout
 * Inclui persistência para lidar com fechamento de abas e backgrounding
 */
export const useInactivityTimeout = ({
  timeout,
  onTimeout,
  enabled = true,
}: UseInactivityTimeoutOptions) => {
  const [showWarning, setShowWarning] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastStorageUpdateRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const updatePersistence = useCallback(async (timestamp: number) => {
    // Apenas atualizar storage se passou o tempo de throttle para evitar overhead
    if (timestamp - lastStorageUpdateRef.current > STORAGE_THROTTLE) {
      try {
        await robustSetItem(STORAGE_KEY, timestamp.toString());
        lastStorageUpdateRef.current = timestamp;
      } catch (error) {
        console.warn('⚠️ Erro ao persistir inatividade:', error);
      }
    }
  }, []);

  const checkPersistence = useCallback(async () => {
    if (!enabled) return;

    try {
      const lastActivityStr = await robustGetItem(STORAGE_KEY);
      if (lastActivityStr) {
        const lastActivity = parseInt(lastActivityStr, 10);
        const now = Date.now();
        const diff = now - lastActivity;

        if (diff >= timeout) {
          console.log('⏰ Persistência: Limite de inatividade excedido');
          onTimeout();
          return true; // Expirou
        } else if (diff >= timeout - WARNING_THRESHOLD) {
          console.log('⏰ Persistência: Próximo ao limite, mostrando aviso');
          setShowWarning(true);
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao verificar persistência de inatividade:', error);
    }
    return false;
  }, [enabled, timeout, onTimeout]);

  const resetTimeout = useCallback(() => {
    const now = Date.now();
    
    // Resetar estado de aviso se estiver ativo
    if (showWarning) setShowWarning(false);
    
    // Persistir atividade
    updatePersistence(now);

    // Limpar timeouts anteriores
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);

    if (enabled) {
      // Agendar aviso de 1 minuto antes do fim
      const timeToWarning = timeout - WARNING_THRESHOLD;
      if (timeToWarning > 0) {
        warningTimeoutRef.current = setTimeout(() => {
          console.log('⏰ Mostrando aviso de inatividade (1 minuto restante)');
          setShowWarning(true);
        }, timeToWarning);
      }

      // Agendar logout final
      timeoutRef.current = setTimeout(() => {
        console.log('⏰ Timeout de inatividade atingido');
        onTimeout();
      }, timeout);
    }
  }, [timeout, onTimeout, enabled, updatePersistence, showWarning]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      setShowWarning(false);
      return;
    }

    // Verificação inicial e início dos timers
    checkPersistence().then((expired) => {
      if (!expired) {
        resetTimeout();
      }
    });

    // Listener para mudanças de estado do app (Mobile)
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 App voltou ao foreground - verificando persistência');
        checkPersistence().then((expired) => {
          if (!expired) resetTimeout();
        });
      }
      appStateRef.current = nextAppState;
    });

    // Listener para eventos de interação
    const handleActivity = () => {
      resetTimeout();
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      events.forEach(event => {
        window.addEventListener(event, handleActivity, true);
      });
    }

    // Para mobile, capturar toques globais pode ser complexo, 
    // mas o AppState 'active' e interações dentro dos componentes já ajudam.

    return () => {
      subscription.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        events.forEach(event => {
          window.removeEventListener(event, handleActivity, true);
        });
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, [enabled, resetTimeout, checkPersistence]);

  return {
    showWarning,
    setShowWarning,
    resetTimeout,
  };
};
