import { Platform } from 'react-native';

export { colors } from './colors';
export { spacing } from './spacing';

// Z-index constants para campos de formulário (web)
// Garante que dropdowns apareçam acima de outros elementos
export const Z_INDEX = {
  DROPDOWN_FIELD_CONTAINER: 1000000,
  DROPDOWN_FIELD_INPUT: 1000001,
  DROPDOWN_FIELD_DROPDOWN: 999999999,
};

export const theme = {
  colors: {
    primary: '#033d60', // Azul da Congregação Cristã no Brasil
    primaryDark: '#022a47', // Azul mais escuro para gradientes
    secondary: '#033d60',
    secondaryDark: '#022a47',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    border: '#e2e8f0',
    disabled: '#94a3b8',
    icon: '#64748b',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
  },

  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },
  shadows: {
    soft: Platform.OS === 'web'
      ? { boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    card: Platform.OS === 'web'
      ? { boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  },
  zIndex: Z_INDEX,
};

