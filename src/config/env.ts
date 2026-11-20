import Constants from 'expo-constants';

const getEnvVar = (key: string, defaultValue?: string, required = true): string => {
  // Tentar várias fontes de variáveis de ambiente
  // No build do Docker, window.APP_CONFIG é injetado pelo entrypoint.sh no index.html
  const appConfig = (window as any).APP_CONFIG || {};

  const value =
    appConfig[key] || // Injeção via config.js (Prioridade máxima para Docker)
    Constants.expoConfig?.extra?.[key] ||
    process.env[`EXPO_PUBLIC_${key}`] ||
    process.env[key] ||
    defaultValue ||
    '';

  if (!value && required && __DEV__) {
    console.warn(`⚠️ Missing environment variable: ${key}. Using default or empty value.`);
  }

  return value;
};

export const env = {
  SUPABASE_URL: getEnvVar('SUPABASE_URL', ''),
  SUPABASE_ANON_KEY: getEnvVar('SUPABASE_ANON_KEY', ''),
  SHEETS_ENDPOINT_URL: getEnvVar('SHEETS_ENDPOINT_URL', ''),
  SITE_URL: getEnvVar('SITE_URL', '', false),
};
