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
      
      // Só atualizar se mudou
      if (previousStatusRef.current !== null && previousStatusRef.current !== newStatus) {
        // Status mudou - chamar callback se existir
        if (onStatusChangeRef.current) {
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
        setTimeout(() => {
          NetInfo.fetch().then(state => {
            const newStatus = state.isConnected === true && state.isInternetReachable === true;
            if (previousStatusRef.current !== null && previousStatusRef.current !== newStatus) {
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
        if (previousStatusRef.current !== null && previousStatusRef.current !== false) {
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
