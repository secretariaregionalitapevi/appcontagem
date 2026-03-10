import { Platform } from 'react-native';
import { robustClear } from './robustStorage';
import { showToast } from './toast';

/**
 * Realiza uma limpeza completa do cache e reinicia a aplicação.
 * Útil para resolver problemas de sincronização ou dados corrompidos.
 */
export const handleHardReset = async () => {
    try {
        console.log('🔄 [AppActions] Iniciando Hard Reset...');

        // 1. Limpar storage robusto
        await robustClear();
        console.log('✅ Storage limpo');

        // 2. Limpar caches do Navegador (se na web)
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined' && 'caches' in window) {
                try {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                    console.log('✅ Caches do navegador limpos');
                } catch (e) {
                    console.warn('⚠️ Erro ao limpar caches do navegador:', e);
                }
            }
            // 3. Recarregar a página forçando bypass do cache
            window.location.reload();
        } else {
            showToast.success('Cache limpo', 'Reinicie o aplicativo para aplicar as mudanças');
        }
    } catch (error) {
        console.error('❌ Erro no Hard Reset:', error);
        showToast.error('Erro', 'Não foi possível limpar o cache totalmente');
    }
};
