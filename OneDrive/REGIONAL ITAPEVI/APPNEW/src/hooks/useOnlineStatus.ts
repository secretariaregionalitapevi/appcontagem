import { useState, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const previousStatusRef = useRef<boolean | null>(null);
  const onStatusChangeRef = useRef<((isOnline: boolean) => void) | null>(null);

  // Função para permitir callback quando status muda
  const setOnStatusChange = (callback: (isOnline: boolean) => void) => {
    onStatusChangeRef.current = callback;
  };

  useEffect(() => {
    const handleStatusChange = (state: any) => {
      const newStatus = state.isConnected === true && state.isInternetReachable === true;
      
      // 🚨 CORREÇÃO: Sempre atualizar estado e chamar callback quando status mudar
      // Não verificar se previousStatusRef.current !== null para garantir que funcione na primeira mudança
      if (previousStatusRef.current !== newStatus) {
        // Status mudou - chamar callback se existir
        if (onStatusChangeRef.current) {
          console.log(`🔄 [useOnlineStatus] Status mudou: ${previousStatusRef.current} -> ${newStatus}`);
          onStatusChangeRef.current(newStatus);
        }
      }
      
      previousStatusRef.current = newStatus;
      setIsOnline(newStatus);
    };

    const unsubscribe = NetInfo.addEventListener(handleStatusChange);

    // Verificar status inicial
    NetInfo.fetch().then(state => {
      const initialStatus = state.isConnected === true && state.isInternetReachable === true;
      previousStatusRef.current = initialStatus;
      setIsOnline(initialStatus);
    });

    // Para web, também adicionar listeners nativos
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => {
        console.log('🌐 [useOnlineStatus] Evento online do navegador detectado');
        setTimeout(() => {
          NetInfo.fetch().then(state => {
            const newStatus = state.isConnected === true && state.isInternetReachable === true;
            // 🚨 CORREÇÃO: Sempre chamar callback quando status mudar (não verificar null)
            if (previousStatusRef.current !== newStatus) {
              console.log(`🔄 [useOnlineStatus] Status mudou (web): ${previousStatusRef.current} -> ${newStatus}`);
              if (onStatusChangeRef.current) {
                onStatusChangeRef.current(newStatus);
              }
            }
            previousStatusRef.current = newStatus;
            setIsOnline(newStatus);
          });
        }, 1000);
      };

      const handleOffline = () => {
        console.log('📵 [useOnlineStatus] Evento offline do navegador detectado');
        // 🚨 CORREÇÃO: Sempre chamar callback quando ficar offline (não verificar null)
        if (previousStatusRef.current !== false) {
          if (onStatusChangeRef.current) {
            onStatusChangeRef.current(false);
          }
        }
        previousStatusRef.current = false;
        setIsOnline(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        unsubscribe();
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      unsubscribe();
    };
  }, []);

  return { isOnline, setOnStatusChange };
};
