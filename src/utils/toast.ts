import { Platform, Alert } from 'react-native';
import { triggerHaptic } from './haptics'; // Importar a função triggerHaptic

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

    // Removido CSS customizado que estava quebrando os ícones do SweetAlert
  }
}

// Configuração base de layout idêntica ao alerta de "Registro Enviado"
const getSwalOptions = (title: string, message?: string, icon: any = 'success', showConfirm = false, timer: number | undefined = 3500, position: any = 'center', toast = false) => {
  return {
    icon: icon,
    title: `<span style="font-family: 'Inter', 'Segoe UI', sans-serif; font-weight: 600; color: #333; font-size: ${toast ? '16px' : '22px'};">${title}</span>`,
    html: message ? `<span style="font-family: 'Inter', 'Segoe UI', sans-serif; color: #555; font-size: ${toast ? '14px' : '16px'};">${message}</span>` : '',
    showConfirmButton: showConfirm,
    confirmButtonText: 'OK',
    confirmButtonColor: '#0ea5e9',
    timer: timer,
    timerProgressBar: !!timer,
    width: toast ? 'auto' : '260px',
    padding: '16px 12px',
    backdrop: false,
    position: position,
    toast: toast,
    didOpen: () => {
      const Swal = getSwal();
      if (!Swal) return;
      const popup = Swal.getPopup();
      if (popup) {
        popup.style.fontFamily = "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        popup.style.borderRadius = '12px';
        popup.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
        popup.style.border = '1px solid rgba(0,0,0,0.05)';
      }
    },
  };
};

export const showToast = {
  success: (title: string, message?: string) => {
    if (Platform.OS === 'web') {
      const Swal = getSwal();
      if (Swal) {
        Swal.fire(getSwalOptions(title, message, 'success', false, 3500));
      } else {
        console.log(`✅ ${title}: ${message || ''}`);
      }
    } else if (Toast) {
      triggerHaptic('success');
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
        Swal.fire(getSwalOptions(title, message, 'error', true, 5000));
      } else {
        console.error(`❌ ${title}: ${message || ''}`);
        if (typeof window !== 'undefined' && window.alert) {
          alert(`${title}\n${message || ''}`);
        }
      }
    } else if (Toast) {
      triggerHaptic('error');
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
        Swal.fire(getSwalOptions(title, message, 'info', false, 3500));
      } else {
        console.info(`ℹ️ ${title}: ${message || ''}`);
      }
    } else if (Toast) {
      triggerHaptic('light');
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
        // Exceção do alerta de duplicidade pedida em contexto anterior
        const isDuplicidade = title === 'Atenção' && message?.includes('fila');
        const isSalvoLocalmente = message?.includes('Salvo localmente') || message?.includes('Será enviado automaticamente');

        // Se for "Salvo localmente", não mostrar botão de confirmação e usar timer menor
        const swalOpts = getSwalOptions(
          title,
          message,
          'warning',
          !(isDuplicidade || isSalvoLocalmente),
          (isDuplicidade || isSalvoLocalmente) ? 3000 : 3500,
          (isDuplicidade || isSalvoLocalmente) ? 'top-end' : 'center',
          (isDuplicidade || isSalvoLocalmente)
        );
        Swal.fire(swalOpts);
      } else {
        console.warn(`⚠️ ${title}: ${message || ''}`);
        if (typeof window !== 'undefined' && window.alert) {
          alert(`${title}\n${message || ''}`);
        }
      }
    } else if (Toast) {
      triggerHaptic('warning');
      Toast.show({
        type: 'info',
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

  progress: (title: string, message?: string) => {
    if (Platform.OS === 'web') {
      const Swal = getSwal();
      if (Swal) {
        let opts = getSwalOptions(title, message, null, false, undefined, 'top-end', true);
        opts.didOpen = () => {
          Swal.showLoading();
          const popup = Swal.getPopup();
          if (popup) {
            popup.style.fontFamily = "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
            popup.style.borderRadius = '12px';
            popup.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1)';
            popup.style.border = '1px solid rgba(0,0,0,0.05)';
          }
        };
        Swal.fire(opts);
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
