/**
 * Utilitário para detecção de dispositivos e plataformas
 * Baseado nas melhores práticas do projeto backupcont
 */

import { Platform } from 'react-native';

export interface DeviceInfo {
  // Plataformas básicas
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  isMobile: boolean;

  // Fabricantes específicos
  isSamsung: boolean;
  isXiaomi: boolean;
  isRedmi: boolean;
  isPOCO: boolean;
  isHuawei: boolean;
  isOnePlus: boolean;

  // Navegadores (web)
  isChrome: boolean;
  isSafari: boolean;
  isFirefox: boolean;
  isSamsungBrowser: boolean;

  // Versões do sistema
  androidVersion?: number;
  iosVersion?: number;
  miuiVersion?: string;

  // Informações adicionais
  userAgent: string;
  platform: string;
}

let cachedDeviceInfo: DeviceInfo | null = null;

/**
 * Detecta informações do dispositivo atual
 */
export const getDeviceInfo = (): DeviceInfo => {
  if (cachedDeviceInfo) {
    return cachedDeviceInfo;
  }

  // Para web, usar navigator.userAgent
  let userAgent = '';
  let platform = Platform.OS;

  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    userAgent = navigator.userAgent;
    platform = 'web';
  } else {
    // Para mobile, Platform.OS já fornece a plataforma
    userAgent = Platform.OS;
  }

  // Detecção básica de plataformas
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  const isWeb = Platform.OS === 'web';
  const isMobile = isIOS || isAndroid;

  // Detecção de fabricantes (apenas para web ou quando userAgent disponível)
  let isSamsung = false;
  let isXiaomi = false;
  let isRedmi = false;
  let isPOCO = false;
  let isHuawei = false;
  let isOnePlus = false;

  let isChrome = false;
  let isSafari = false;
  let isFirefox = false;
  let isSamsungBrowser = false;

  let androidVersion: number | undefined;
  let iosVersion: number | undefined;
  let miuiVersion: string | undefined;

  if (isWeb && typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;

    // Detecção de fabricantes
    isSamsung = /SamsungBrowser|SM-|GT-|SCH-|SGH-|SHV-|SPH-|SGH-|GT-|SM-|Galaxy/i.test(ua);
    isXiaomi = /Xiaomi|MIUI|Mi\s|HM|MIUI/i.test(ua);
    isRedmi = /Redmi/i.test(ua);
    isPOCO = /POCO/i.test(ua);
    isHuawei = /Huawei|Honor|HMA|HUAWEI/i.test(ua);
    isOnePlus = /OnePlus|ONEPLUS/i.test(ua);

    // Detecção de navegadores
    isChrome = /Chrome/i.test(ua) && !/Edg/i.test(ua);
    isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua);
    isFirefox = /Firefox/i.test(ua);
    isSamsungBrowser = /SamsungBrowser/i.test(ua);

    // Detecção de versões do Android
    const androidMatch = ua.match(/Android\s([\d.]+)/i);
    if (androidMatch) {
      androidVersion = parseFloat(androidMatch[1]);
    }

    // Detecção de versões do iOS
    const iosMatch = ua.match(/OS\s([\d_]+)/i);
    if (iosMatch) {
      iosVersion = parseFloat(iosMatch[1].replace('_', '.'));
    }

    // Detecção de versão MIUI
    const miuiMatch = ua.match(/MIUI[\/\s]?([\d.]+)/i);
    if (miuiMatch) {
      miuiVersion = miuiMatch[1];
    }
  } else if (isAndroid) {
    // Para Android nativo, tentar detectar fabricante via outras formas
    // Nota: Isso é limitado no React Native, mas podemos tentar
    isSamsung = false; // Seria necessário usar biblioteca nativa
    isXiaomi = false; // Seria necessário usar biblioteca nativa
  }

  cachedDeviceInfo = {
    isIOS,
    isAndroid,
    isWeb,
    isMobile,
    isSamsung,
    isXiaomi,
    isRedmi,
    isPOCO,
    isHuawei,
    isOnePlus,
    isChrome,
    isSafari,
    isFirefox,
    isSamsungBrowser,
    androidVersion,
    iosVersion,
    miuiVersion,
    userAgent,
    platform,
  };

  return cachedDeviceInfo;
};

/**
 * Verifica se o dispositivo é Xiaomi/Redmi/POCO
 */
export const isXiaomiDevice = (): boolean => {
  const info = getDeviceInfo();
  return info.isXiaomi || info.isRedmi || info.isPOCO;
};

/**
 * Verifica se o dispositivo é Samsung
 */
export const isSamsungDevice = (): boolean => {
  return getDeviceInfo().isSamsung;
};

/**
 * Verifica se está em modo web
 */
export const isWebPlatform = (): boolean => {
  return getDeviceInfo().isWeb;
};

/**
 * Verifica se está em modo mobile (iOS ou Android)
 */
export const isMobilePlatform = (): boolean => {
  return getDeviceInfo().isMobile;
};

/**
 * Obtém informações de diagnóstico do dispositivo
 */
export const getDeviceDiagnostics = () => {
  const info = getDeviceInfo();

  return {
    platform: {
      os: Platform.OS,
      version: Platform.Version,
      isIOS: info.isIOS,
      isAndroid: info.isAndroid,
      isWeb: info.isWeb,
      isMobile: info.isMobile,
    },
    manufacturer: {
      isSamsung: info.isSamsung,
      isXiaomi: info.isXiaomi,
      isRedmi: info.isRedmi,
      isPOCO: info.isPOCO,
      isHuawei: info.isHuawei,
      isOnePlus: info.isOnePlus,
    },
    browser: {
      isChrome: info.isChrome,
      isSafari: info.isSafari,
      isFirefox: info.isFirefox,
      isSamsungBrowser: info.isSamsungBrowser,
    },
    versions: {
      android: info.androidVersion,
      ios: info.iosVersion,
      miui: info.miuiVersion,
    },
    userAgent: info.userAgent,
  };
};

/**
 * Loga informações do dispositivo (útil para debug)
 */
export const logDeviceInfo = () => {
  const diagnostics = getDeviceDiagnostics();
  console.log('📱 Informações do Dispositivo:', diagnostics);
  return diagnostics;
};
