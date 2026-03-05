import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type HapticFeedbackType = 'light' | 'success' | 'warning' | 'error';

/**
 * Funçao universal para disparar feedback tátil.
 * Suporta aplicativos nativos via expo-haptics e PWA via navigator.vibrate.
 */
export const triggerHaptic = (type: HapticFeedbackType = 'light') => {
    if (Platform.OS === 'web') {
        // Tentar usar API nativa do navegador para Web/PWA no Android
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
                switch (type) {
                    case 'light':
                        navigator.vibrate(15); // Toque rápido/leve
                        break;
                    case 'success':
                        navigator.vibrate([15, 50, 20]); // Dois toques rapidos
                        break;
                    case 'warning':
                        navigator.vibrate([20, 60, 40]); // Dois toques mais pesados
                        break;
                    case 'error':
                        navigator.vibrate([30, 80, 50, 80, 30]); // Três toques
                        break;
                }
            } catch (e) {
                // Ignorar erros caso a API não seja permitida pelo browser
            }
        }
        return;
    }

    // Comportamento Nativo iOS/Android via Expo
    try {
        switch (type) {
            case 'light':
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                break;
            case 'success':
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                break;
            case 'warning':
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                break;
            case 'error':
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                break;
        }
    } catch (e) {
        // Ignorar erros em simuladores/dispositivos sem motor
    }
};
