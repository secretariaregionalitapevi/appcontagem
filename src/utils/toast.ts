import { Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

// Importar Toast apenas para plataformas nativas (não web)
let Toast: any = null;
if (Platform.OS !== 'web') {
  try {
    Toast = require('react-native-toast-message').default;
  } catch (error) {
    console.warn('Toast não disponível:', error);
  }
}

// Função para obter SweetAlert2 dinamicamente (para web)
const getSwal = (): any => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  try {
    // Tentar importar SweetAlert2
    const sweetalert2 = require('sweetalert2');
    return sweetalert2.default || sweetalert2;
  } catch (error) {
    console.warn('SweetAlert2 não disponível:', error);
    return null;
  }
};

// Carregar CSS do SweetAlert2 dinamicamente na web (via DOM)
if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Verificar se o CSS já foi carregado
  const cssId = 'sweetalert2-css';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css';
    document.head.appendChild(link);

    // Carregar fonte Inter do Google Fonts
    const fontLink = document.createElement('link');
    fontLink.rel = 'preconnect';
    fontLink.href = 'https://fonts.googleapis.com';
    document.head.appendChild(fontLink);

    const fontLink2 = document.createElement('link');
    fontLink2.rel = 'preconnect';
    fontLink2.href = 'https://fonts.gstatic.com';
    fontLink2.crossOrigin = 'anonymous';
    document.head.appendChild(fontLink2);

    const fontStyle = document.createElement('link');
    fontStyle.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    fontStyle.rel = 'stylesheet';
    document.head.appendChild(fontStyle);

    // 🚀 MELHORIA: Estilos customizados mais elegantes e modernos (Toast e Glassmorphism)
    const customStyle = document.createElement('style');
    customStyle.id = 'sweetalert2-custom-styles';
    customStyle.textContent = `
      /* Toasts unificados e modernos */
      .swal2-toast-modern {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
        background: rgba(255, 255, 255, 0.95) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        border-radius: 12px !important;
        padding: 12px 16px !important;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        display: flex !important;
        align-items: center !important;
        width: auto !important;
        max-width: 400px !important;
      }
      
      .swal2-toast-modern .swal2-title {
        font-size: 14px !important;
        font-weight: 600 !important;
        color: #1f2937 !important;
        margin: 0 0 2px 0 !important;
        line-height: 1.4 !important;
        flex: auto !important;
      }
      
      .swal2-toast-modern .swal2-html-container {
        font-size: 13px !important;
        font-weight: 400 !important;
        color: #6b7280 !important;
        margin: 0 !important;
        line-height: 1.4 !important;
        text-align: left !important;
      }

      .swal2-toast-modern .swal2-icon {
        width: 32px !important;
        height: 32px !important;
        margin: 0 12px 0 0 !important;
        flex-shrink: 0 !important;
        border-width: 2px !important;
      }
      
      .swal2-toast-modern .swal2-icon.swal2-success { border-color: #10b981 !important; color: #10b981 !important; }
      .swal2-toast-modern .swal2-icon.swal2-error { border-color: #ef4444 !important; color: #ef4444 !important; }
      .swal2-toast-modern .swal2-icon.swal2-warning { border-color: #f59e0b !important; color: #f59e0b !important; }
      .swal2-toast-modern .swal2-icon.swal2-info { border-color: #3b82f6 !important; color: #3b82f6 !important; }

      .swal2-toast-modern .swal2-success-ring { width: 32px !important; height: 32px !important; }

      /* Modais Centrais Modernos */
      .swal2-popup-modern {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
        border-radius: 16px !important;
        padding: 24px 20px !important;
        width: 340px !important;
        max-width: 90% !important;
        background: #ffffff !important;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
        border: none !important;
      }
      
      .swal2-popup-modern .swal2-title {
        font-size: 20px !important;
        font-weight: 600 !important;
        color: #1f2937 !important;
        margin-top: 16px !important;
        margin-bottom: 8px !important;
      }
      
      .swal2-popup-modern .swal2-html-container {
        font-size: 15px !important;
        font-weight: 400 !important;
        color: #4b5563 !important;
        margin-top: 0 !important;
        line-height: 1.5 !important;
      }

      .swal2-modern-confirm-btn {
        background-color: #0ea5e9 !important; /* Primary Blue */
        border-radius: 8px !important;
        color: #fff !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        padding: 12px 24px !important;
        border: none !important;
        box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.2) !important;
        margin-top: 24px !important;
        min-width: 100px !important;
      }

      .swal2-modern-confirm-btn:hover {
        background-color: #0284c7 !important;
      }
    `;
    document.head.appendChild(customStyle);
  }
}

export const showToast = {
  success: (title: string, message?: string) => {
    if (Platform.OS === 'web') {
      const Swal = getSwal();
      if (Swal) {
        Swal.fire({
          icon: 'success',
          title: title,
          html: message ? `<div>${message}</div>` : '',
          showConfirmButton: true,
          confirmButtonText: 'OK',
          toast: false,
          position: 'center',
          customClass: {
            popup: 'swal2-popup-modern',
            confirmButton: 'swal2-modern-confirm-btn',
          },
        });
      } else {
        console.log(`✅ ${title}: ${message || ''}`);
      }
    } else if (Toast) {
      if ((Platform.OS as string) !== 'web') {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) { }
      }
      Toast.show({
        type: 'success',
        text1: title,
        text2: message,
        position: 'top',
        visibilityTime: 3500,
        autoHide: true,
        topOffset: Platform.OS === 'ios' ? 60 : 50,
      });
    } else if (Platform.OS === 'ios') {
      Alert.alert('Sucesso', message ? `${title}\n${message}` : title);
    }
  },

  error: (title: string, message?: string) => {
    if (Platform.OS === 'web') {
      const Swal = getSwal();
      if (Swal) {
        Swal.fire({
          icon: 'error',
          title: title,
          html: message ? `<div>${message}</div>` : '',
          showConfirmButton: true,
          confirmButtonText: 'OK',
          toast: false,
          position: 'center',
          customClass: {
            popup: 'swal2-popup-modern',
            confirmButton: 'swal2-modern-confirm-btn',
          },
        });
      } else {
        // Fallback para alert nativo
        console.error(`❌ ${title}: ${message || ''}`);
        if (typeof window !== 'undefined' && window.alert) {
          alert(`${title}\n${message || ''}`);
        }
      }
    } else if (Toast) {
      if ((Platform.OS as string) !== 'web') {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch (e) { }
      }
      Toast.show({
        type: 'error',
        text1: title,
        text2: message,
        position: 'top',
        visibilityTime: 4500,
        autoHide: true,
        topOffset: Platform.OS === 'ios' ? 60 : 50,
      });
    } else {
      Alert.alert(title, message || '');
    }
  },

  info: (title: string, message?: string) => {
    if (Platform.OS === 'web') {
      const Swal = getSwal();
      if (Swal) {
        Swal.fire({
          icon: 'info',
          title: title,
          html: message ? `<div>${message}</div>` : '',
          showConfirmButton: true,
          confirmButtonText: 'OK',
          toast: false,
          position: 'center',
          customClass: {
            popup: 'swal2-popup-modern',
            confirmButton: 'swal2-modern-confirm-btn',
          },
        });
      } else {
        // Fallback para console
        console.info(`ℹ️ ${title}: ${message || ''}`);
      }
    } else if (Toast) {
      if ((Platform.OS as string) !== 'web') {
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) { }
      }
      Toast.show({
        type: 'info',
        text1: title,
        text2: message,
        position: 'top',
        visibilityTime: 3500,
        autoHide: true,
        topOffset: Platform.OS === 'ios' ? 60 : 50,
      });
    } else {
      Alert.alert(title, message || '');
    }
  },

  warning: (title: string, message?: string) => {
    if (Platform.OS === 'web') {
      const Swal = getSwal();
      if (Swal) {
        Swal.fire({
          icon: 'warning',
          title: title,
          html: message ? `<div>${message}</div>` : '',
          showConfirmButton: true,
          confirmButtonText: 'OK',
          toast: false,
          // Exceção: O usuário mencionou não mexer no alerta de duplicidade,
          // que usa showToast.warning. Porém o SweetAlert base não sabe de onde veio.
          // Como o alert de duplicidade ("Atenção", "Este registro já está na fila") usa warning,
          // se quisermos que ele continue toast, precisamos checar o title.
          position: title === 'Atenção' && message?.includes('fila') ? 'top-end' : 'center',
          timer: title === 'Atenção' && message?.includes('fila') ? 4500 : undefined,
          timerProgressBar: title === 'Atenção' && message?.includes('fila') ? true : false,
          customClass: {
            popup:
              title === 'Atenção' && message?.includes('fila')
                ? 'swal2-toast-modern'
                : 'swal2-popup-modern',
            confirmButton: 'swal2-modern-confirm-btn',
          },
        });
      } else {
        // Fallback para console
        console.warn(`⚠️ ${title}: ${message || ''}`);
        if (typeof window !== 'undefined' && window.alert) {
          alert(`${title}\n${message || ''}`);
        }
      }
    } else if (Toast) {
      if ((Platform.OS as string) !== 'web') {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch (e) { }
      }
      Toast.show({
        type: 'info', // react-native-toast-message usa 'info' para warning às vezes, dependendo da config
        text1: title,
        text2: message,
        position: 'top',
        visibilityTime: 4500,
        autoHide: true,
        topOffset: Platform.OS === 'ios' ? 60 : 50,
      });
    } else {
      Alert.alert(title, message || '');
    }
  },

  // 🚀 NOVO: Toast de progresso compacto para envio de registros
  progress: (title: string, message?: string) => {
    if (Platform.OS === 'web') {
      const Swal = getSwal();
      if (Swal) {
        Swal.fire({
          title: title,
          html: message ? `<div>${message}</div>` : 'Aguarde...',
          timerProgressBar: false,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
          customClass: {
            popup: 'swal2-toast-modern',
          },
          didOpen: () => {
            Swal.showLoading();
          },
        });
      }
    } else if (Toast) {
      Toast.show({
        type: 'info',
        text1: title,
        text2: message || 'Aguarde...',
        position: 'top',
        autoHide: false,
        topOffset: Platform.OS === 'ios' ? 60 : 50,
      });
    }
  },

  // 🚀 NOVO: Fechar toast de progresso
  hide: () => {
    if (Platform.OS === 'web') {
      const Swal = getSwal();
      if (Swal) {
        Swal.close();
      }
    } else if (Toast) {
      Toast.hide();
    }
  },
};
