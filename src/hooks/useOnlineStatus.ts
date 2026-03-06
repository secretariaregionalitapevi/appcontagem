import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { showToast } from '../utils/toast';

export const useOnlineStatus = () => {
  // Para web/PWA: iniciar como online (navigator.onLine é sempre mais confiável do que NetInfo na web)
  const [isOnline, setIsOnline] = useState(
    Platform.OS === 'web'
      ? (typeof navigator !== 'undefined' ? navigator.onLine : true)
      : true
  );
  const previousStatusRef = useRef<boolean | null>(null);
  const onStatusChangeRef = useRef<((isOnline: boolean) => void) | null>(null);
  const isInitialLoad = useRef(true);

  // Função para permitir callback quando status muda
  const setOnStatusChange = useCallback((callback: (isOnline: boolean) => void) => {
    onStatusChangeRef.current = callback;
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // ===== ESTRATÉGIA WEB/PWA =====
      // Usar exclusivamente navigator.onLine + eventos online/offline do browser.
      // NÃO usar NetInfo no web - o NetInfo tenta pingar URLs que podem falhar
      // por CSP, captive portal (iOS), CORS, ou outros fatores, causando falsos negativos.

      const updateStatus = async (rawOnline: boolean) => {
        const newStatus = rawOnline;

        if (previousStatusRef.current !== null && previousStatusRef.current !== newStatus) {
          if (isInitialLoad.current) {
            isInitialLoad.current = false;
            if (!newStatus) return; // Evitar alerta falso na inicialização
          }

          if (newStatus) {
            console.log('🌐 [useOnlineStatus] Conexão restaurada');
            try {
              const { supabaseDataService } = require('../services/supabaseDataService');
              const { offlineSyncService } = require('../services/offlineSyncService');
              const registros = await supabaseDataService.getRegistrosPendentesFromLocal();
              if (registros.length > 0) {
                console.log(`🌐 Sincronizando ${registros.length} registro(s) pendente(s)...`);
                setTimeout(() => offlineSyncService.processarFilaLocal().catch(console.error), 1500);
              }
            } catch (e) {
              console.warn('⚠️ Erro ao verificar fila:', e);
            }
          } else {
            console.log('📵 [useOnlineStatus] Conexão perdida');
            showToast.warning('Modo offline', 'Registros serão salvos localmente');
          }

          if (onStatusChangeRef.current) {
            onStatusChangeRef.current(newStatus);
          }
        }

        previousStatusRef.current = newStatus;
        setIsOnline(newStatus);
      };

      // Status inicial
      const initStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;
      previousStatusRef.current = initStatus;
      setIsOnline(initStatus);
      setTimeout(() => { isInitialLoad.current = false; }, 2000);

      const handleOnline = () => updateStatus(true);
      const handleOffline = () => updateStatus(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } else {
      // ===== ESTRATÉGIA NATIVE (iOS app / Android app) =====
      // Para apps nativos, usar NetInfo normalmente
      const NetInfo = require('@react-native-community/netinfo').default;

      const handleStatusChange = (state: any) => {
        const newStatus = state.isConnected === true && state.isInternetReachable !== false;

        if (previousStatusRef.current !== null && previousStatusRef.current !== newStatus) {
          if (isInitialLoad.current) {
            isInitialLoad.current = false;
            if (!newStatus) return;
          }

          if (newStatus) {
            console.log('🌐 [useOnlineStatus] Conexão nativa restaurada');
          } else {
            console.log('📵 [useOnlineStatus] Conexão nativa perdida');
            showToast.warning('Modo offline', 'Registros serão salvos localmente');
          }

          if (onStatusChangeRef.current) {
            onStatusChangeRef.current(newStatus);
          }
        }

        previousStatusRef.current = newStatus;
        setIsOnline(newStatus);
      };

      const unsubscribe = NetInfo.addEventListener(handleStatusChange);

      NetInfo.fetch().then((state: any) => {
        const initStatus = state.isConnected === true && state.isInternetReachable !== false;
        previousStatusRef.current = initStatus;
        setIsOnline(initStatus);
        setTimeout(() => { isInitialLoad.current = false; }, 2000);
      });

      return () => unsubscribe();
    }
  }, []);

  return { isOnline, setOnStatusChange };
};
