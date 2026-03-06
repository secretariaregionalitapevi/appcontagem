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
    // 🌐 CONFIGURAÇÃO: Evitar que o NetInfo no Web pingue o localhost/origin
    // Isso causa ERR_CONNECTION_REFUSED constantes e status offline falso
    if (Platform.OS === 'web') {
      try {
        NetInfo.configure({
          reachabilityUrl: 'https://clients3.google.com/generate_204',
          reachabilityTest: async (response) => response.status === 204,
          reachabilityLongTimeout: 10000, // 10s
          reachabilityShortTimeout: 3000,  // 3s
          reachabilityRequestTimeout: 5000, // 5s
        });
        console.log('🌐 [useOnlineStatus] NetInfo configurado para Google (Web)');
      } catch (e) {
        console.warn('⚠️ Erro ao configurar NetInfo:', e);
      }
    }

    const handleStatusChange = async (state: any) => {
      let newStatus = state.isConnected === true && state.isInternetReachable !== false;

      // 🔍 DUPLA CHECAGEM (Web): Se o NetInfo disser que está offline, verificar via ping real
      if (Platform.OS === 'web' && !newStatus && navigator.onLine !== false) {
        try {
          const offlineSyncService = require('../services/offlineSyncService').offlineSyncService;
          const isReallyOnline = await offlineSyncService.isOnline();
          if (isReallyOnline) {
            console.log('🛡️ [useOnlineStatus] NetInfo reportou offline, mas ping confirmou ONLINE');
            newStatus = true;
          }
        } catch (e) {
          // Mantém o status que o NetInfo deu
        }
      }

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
    require('../services/offlineSyncService').offlineSyncService.isOnline().then((isReallyOnline: boolean) => {
      previousStatusRef.current = isReallyOnline;
      setIsOnline(isReallyOnline);
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 2000); // Dar 2s de gravação para a carga inicial web
    });

    // Para web, também adicionar listeners nativos
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = async () => {
        console.log('🌐 [useOnlineStatus] Evento online do navegador detectado');
        // Reduzido delay de 1000ms para 200ms para resposta mais rápida
        setTimeout(async () => {
          const offlineSyncService = require('../services/offlineSyncService').offlineSyncService;
          const newStatus = await offlineSyncService.isOnline();

          if (previousStatusRef.current !== newStatus) {
            console.log(
              `🔄 [useOnlineStatus] Status mudou (web): ${previousStatusRef.current} -> ${newStatus}`
            );

            if (newStatus) {
              const offlineSyncService = require('../services/offlineSyncService').offlineSyncService;
              const supabaseDataService = require('../services/supabaseDataService').supabaseDataService;

              try {
                const registros = await supabaseDataService.getRegistrosPendentesFromLocal();
                if (registros.length > 0) {
                  console.log(
                    `🌐 Conexão restaurada (web): ${registros.length} registro(s) pendente(s)`
                  );
                  // Processamento com delay reduzido para 1s
                  setTimeout(async () => {
                    try {
                      await offlineSyncService.processarFilaLocal();
                      console.log('✅ Sincronização automática concluída (web)');
                    } catch (error) {
                      console.error('❌ Erro na sincronização automática (web):', error);
                    }
                  }, 1000);
                } else {
                  console.log('🌐 Conexão restaurada (web, sem registros pendentes)');
                }
              } catch (error) {
                console.error('Erro ao verificar/processar fila (web):', error);
              }
            }
          }

          if (onStatusChangeRef.current) {
            onStatusChangeRef.current(newStatus);
          }

          previousStatusRef.current = newStatus;
          setIsOnline(newStatus);
        }, 200);
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
