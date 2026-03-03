import { useState, useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { showToast } from '../utils/toast';

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const previousStatusRef = useRef<boolean | null>(null);
  const onStatusChangeRef = useRef<((isOnline: boolean) => void) | null>(null);
  const alertShownRef = useRef<{ offline: boolean; online: boolean }>({
    offline: false,
    online: false,
  });
  const isInitialLoad = useRef(true);

  // Função para permitir callback quando status muda (memoizada para evitar loops de renderização)
  const setOnStatusChange = useCallback((callback: (isOnline: boolean) => void) => {
    onStatusChangeRef.current = callback;
  }, []);

  useEffect(() => {
    const handleStatusChange = async (state: any) => {
      const newStatus = state.isConnected === true && state.isInternetReachable === true;

      // 🚨 CORREÇÃO: Sempre atualizar estado e chamar callback quando status mudar
      // Não verificar se previousStatusRef.current !== null para garantir que funcione na primeira mudança
      if (previousStatusRef.current !== null && previousStatusRef.current !== newStatus) {
        // Ignorar alerta se for a primeira carga e a rede reportou false temporariamente
        if (isInitialLoad.current) {
          isInitialLoad.current = false;
          if (!newStatus) return; // Evitar disparar offline alert logo no start
        }

        // Status mudou - mostrar alerta e chamar callback
        if (newStatus) {
          // Conexão restaurada
          console.log('🌐 [useOnlineStatus] Conexão restaurada');
          // Importar serviço dinamicamente para evitar dependência circular
          const offlineSyncService = require('../services/offlineSyncService').offlineSyncService;
          const supabaseDataService = require('../services/supabaseDataService').supabaseDataService;

          // Verificar se há registros pendentes
          try {
            const registros = await supabaseDataService.getRegistrosPendentesFromLocal();
            if (registros.length > 0) {
              // showToast.success('Conexão restaurada', `${registros.length} registro(s) será(ão) enviado(s)`);
              console.log(`🌐 Conexão restaurada: ${registros.length} registro(s) pendente(s)`);
              // Processar fila após um pequeno delay para garantir conexão estável
              setTimeout(async () => {
                try {
                  await offlineSyncService.processarFilaLocal();
                } catch (error) {
                  console.error('❌ Erro ao processar fila:', error);
                }
              }, 2000);
            } else {
              // showToast.info('Conexão restaurada', 'Você está online novamente');
              console.log('🌐 Conexão restaurada (sem registros pendentes)');
            }
          } catch (error) {
            console.error('❌ Erro ao verificar registros pendentes:', error);
            // showToast.info('Conexão restaurada', 'Você está online novamente');
          }

          alertShownRef.current.online = true;
          alertShownRef.current.offline = false;
        } else {
          // Conexão perdida
          console.log('📵 [useOnlineStatus] Conexão perdida');
          showToast.warning('Modo offline', 'Registros serão salvos localmente');
          alertShownRef.current.offline = true;
          alertShownRef.current.online = false;
        }

        // Chamar callback se existir
        if (onStatusChangeRef.current) {
          console.log(
            `🔄 [useOnlineStatus] Status mudou: ${previousStatusRef.current} -> ${newStatus}`
          );
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
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 2000); // Dar 2s de gravação para a carga inicial web
    });

    // Para web, também adicionar listeners nativos
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = async () => {
        console.log('🌐 [useOnlineStatus] Evento online do navegador detectado');
        setTimeout(async () => {
          const state = await NetInfo.fetch();
          const newStatus = state.isConnected === true && state.isInternetReachable === true;

          // 🚨 CORREÇÃO: Sempre chamar callback quando status mudar (não verificar null)
          if (previousStatusRef.current !== null && previousStatusRef.current !== newStatus) {
            console.log(
              `🔄 [useOnlineStatus] Status mudou (web): ${previousStatusRef.current} -> ${newStatus}`
            );

            if (newStatus) {
              // Importar serviços dinamicamente
              const offlineSyncService = require('../services/offlineSyncService').offlineSyncService;
              const supabaseDataService = require('../services/supabaseDataService').supabaseDataService;

              try {
                const registros = await supabaseDataService.getRegistrosPendentesFromLocal();
                if (registros.length > 0) {
                  // showToast.success('Conexão restaurada', `${registros.length} registro(s) será(ão) enviado(s)`);
                  console.log(
                    `🌐 Conexão restaurada (web): ${registros.length} registro(s) pendente(s)`
                  );
                  // O timeout foi mantido do processo original
                  setTimeout(async () => {
                    try {
                      await offlineSyncService.processarFilaLocal();
                      console.log('✅ Sincronização automática concluída (web)');
                    } catch (error) {
                      console.error('❌ Erro na sincronização automática (web):', error);
                    }
                  }, 2000);
                } else {
                  console.log('🌐 Conexão restaurada (web, sem registros pendentes)');
                }
              } catch (error) {
                console.error('Erro ao verificar/processar fila (web):', error);
              }
            }

            // Atualizar onlineRef para a próxima verificação (se formos usar um timer)
          }

          if (onStatusChangeRef.current) {
            onStatusChangeRef.current(newStatus);
          }

          previousStatusRef.current = newStatus;
          setIsOnline(newStatus);
        }, 1000);
      };

      const handleOffline = () => {
        console.log('📵 [useOnlineStatus] Evento offline do navegador detectado');
        // 🚨 CORREÇÃO: Sempre chamar callback quando ficar offline (não verificar null)
        if (previousStatusRef.current !== null && previousStatusRef.current !== false) {
          showToast.warning('Modo offline', 'Registros serão salvos localmente');
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
  }, [setOnStatusChange]);

  return { isOnline, setOnStatusChange };
};
