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

    // Carregar fontes Google Fonts e FontAwesome
    const fontLinks = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Outfit:wght@400;500;600&display=swap',
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
    ];

    fontLinks.forEach((href, index) => {
      const link = document.createElement('link');
      if (index < 2) link.rel = 'preconnect';
      else link.rel = 'stylesheet';
      if (index === 1) link.crossOrigin = 'anonymous';
      link.href = href;
      document.head.appendChild(link);
    });
  }
}

// Configuração base de layout idêntica ao alerta de "Registro Enviado"
const getSwalOptions = (title: string, message?: string, icon: any = 'success', showConfirm = false, timer: number | undefined = 2000, position: any = 'center', toast = false) => {
  return {
    icon: icon,
    title: `<span style="font-weight: 700; color: #4a4a4a; font-size: ${toast ? '18px' : '24px'}; letter-spacing: -0.5px; line-height: 1.2; display: block;">${title}</span>`,
    html: message ? `<div style="color: #666; font-size: ${toast ? '14px' : '16px'}; margin-top: 10px; line-height: 1.5; font-weight: 400;">${message}</div>` : '',
    showConfirmButton: showConfirm,
    confirmButtonText: 'Continuar',
    confirmButtonColor: '#255ec8',
    timer: timer,
    timerProgressBar: !!timer,
    width: toast ? 'auto' : '450px',
    padding: toast ? '12px 20px' : '1.5rem', // Reduzido de 2rem para 1.5rem
    backdrop: toast ? false : `rgba(10, 14, 23, 0.4)`,
    position: position,
    toast: toast,
    showClass: {
      popup: 'animate__animated animate__fadeInDown animate__faster'
    },
    hideClass: {
      popup: 'animate__animated animate__fadeOutUp animate__faster'
    },
    didOpen: () => {
      const Swal = getSwal();
      if (!Swal) return;
      const popup = Swal.getPopup();
      if (popup) {
        popup.style.borderRadius = '20px';
        popup.style.boxShadow = toast 
          ? '0 10px 30px rgba(0,0,0,0.1)' 
          : '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
        popup.style.border = '1px solid rgba(0,0,0,0.05)';
        
        // Responsividade para mobile
        if (window.innerWidth < 480) {
          popup.style.width = '92%';
          popup.style.padding = toast ? '10px 15px' : '1.2rem';
          const htmlContainer = Swal.getHtmlContainer();
          if (htmlContainer) {
            htmlContainer.style.fontSize = '14px'; // Levemente menor no mobile
          }
        }
        
        const confirmBtn = Swal.getConfirmButton();
        if (confirmBtn) {
          confirmBtn.style.borderRadius = '12px';
          confirmBtn.style.fontWeight = '700';
          confirmBtn.style.fontFamily = "'Inter', sans-serif";
          confirmBtn.style.background = 'linear-gradient(180deg, #2f71e8 0%, #255ec8 100%)';
          confirmBtn.style.padding = '12px 24px';
          confirmBtn.style.fontSize = '15px';
          confirmBtn.style.display = 'inline-flex';
          confirmBtn.style.alignItems = 'center';
          confirmBtn.style.justifyContent = 'center';
          confirmBtn.style.gap = '8px';
        }
        
        const cancelBtn = Swal.getCancelButton();
        if (cancelBtn) {
          cancelBtn.style.borderRadius = '12px';
          cancelBtn.style.fontWeight = '600';
          cancelBtn.style.fontFamily = "'Inter', sans-serif";
          cancelBtn.style.padding = '12px 24px';
          cancelBtn.style.fontSize = '15px';
          cancelBtn.style.display = 'inline-flex';
          cancelBtn.style.alignItems = 'center';
          cancelBtn.style.justifyContent = 'center';
          cancelBtn.style.gap = '8px';
        }
      }
    },
  };
};

export const showToast = {
  success: (title: string, message?: string) => {
    if (Platform.OS === 'web') {
      const Swal = getSwal();
      if (Swal) {
        Swal.fire(getSwalOptions(title, message, 'success', false, 2000));
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
        visibilityTime: 2000,
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
        Swal.fire(getSwalOptions(title, message, 'error', true, 3000));
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
        visibilityTime: 3000,
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
        Swal.fire(getSwalOptions(title, message, 'info', false, 2000));
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
        visibilityTime: 2000,
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
          (isDuplicidade || isSalvoLocalmente) ? 2000 : 4000, // Tempo maior para avisos que precisam ser lidos
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
        visibilityTime: 2000,
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

  confirm: async (title: string, message: string): Promise<boolean> => {
    if (Platform.OS === 'web') {
      const Swal = getSwal();
      if (Swal) {
        return (await showToast.confirmCustom({
          title: title,
          html: `Você deseja mesmo excluir o registro de <strong style="color: #4a4a4a;">${message}</strong>?<br><small style="color: #999;">Esta ação não poderá ser revertida.</small>`,
          icon: 'warning',
          confirmButtonText: '<i class="fas fa-check" style="margin-right: 8px;"></i> Sim, excluir',
          cancelButtonText: '<i class="fas fa-times" style="margin-right: 8px;"></i> Cancelar',
          confirmButtonColor: '#255ec8',
          cancelButtonColor: '#e74c3c',
        }));
      }
      return window.confirm(`${title}\n${message}`);
    } else {
      return new Promise((resolve) => {
        Alert.alert(
          title,
          `Deseja mesmo excluir o registro de ${message}?\n\nVocê não poderá reverter esta exclusão.`,
          [
            { text: 'Cancelar', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Sim, excluir', onPress: () => resolve(true), style: 'destructive' },
          ],
          { cancelable: true, onDismiss: () => resolve(false) }
        );
      });
    }
  },

  confirmCustom: async (options: {
    title: string;
    html: string;
    icon?: any;
    confirmButtonText?: string;
    cancelButtonText?: string;
    confirmButtonColor?: string;
    cancelButtonColor?: string;
    width?: string;
  }): Promise<boolean> => {
    if (Platform.OS === 'web') {
      const Swal = getSwal();
      if (Swal) {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 480;
        const result = await Swal.fire({
          title: `<span style="font-weight: 700; color: #4a4a4a; font-size: ${isMobile ? '22px' : '26px'}; letter-spacing: -0.5px; line-height: 1.2; display: block;">${options.title}</span>`,
          html: `<div style="color: #666; font-size: ${isMobile ? '15px' : '16px'}; margin-top: 10px; line-height: 1.5;">${options.html}</div>`,
          icon: options.icon || 'question',
          showCancelButton: true,
          confirmButtonText: options.confirmButtonText || 'Confirmar',
          cancelButtonText: options.cancelButtonText || 'Cancelar',
          confirmButtonColor: options.confirmButtonColor || '#2160c4',
          cancelButtonColor: options.cancelButtonColor || '#e6453d',
          width: options.width || (isMobile ? '92%' : '480px'),
          padding: isMobile ? '1.5rem' : '2rem',
          backdrop: `rgba(10, 14, 23, 0.4)`,
          allowOutsideClick: false,
          didOpen: () => {
            const popup = Swal.getPopup();
            if (popup) {
              popup.style.borderRadius = '20px';
              popup.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
              
              const cBtn = Swal.getConfirmButton();
              if (cBtn) {
                cBtn.style.borderRadius = '12px';
                cBtn.style.fontWeight = '700';
                cBtn.style.fontFamily = "'Inter', sans-serif";
                cBtn.style.padding = '12px 24px';
              }
              const canBtn = Swal.getCancelButton();
              if (canBtn) {
                canBtn.style.borderRadius = '12px';
                canBtn.style.fontWeight = '600';
                canBtn.style.fontFamily = "'Inter', sans-serif";
                canBtn.style.padding = '12px 24px';
              }
            }
          }
        });
        return result.isConfirmed;
      }
    }
    return false;
  }
};
