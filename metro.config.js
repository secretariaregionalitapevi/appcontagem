// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Otimizações de performance
config.transformer = {
  ...config.transformer,
  // Melhora performance de carregamento - carrega módulos sob demanda
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true, // Carrega imports apenas quando necessário
    },
  }),
};

// Otimizar watcher - limita escopo de monitoramento
config.watchFolders = [__dirname];

// Configurar resolver para melhor performance
if (!config.resolver) {
  config.resolver = {};
}

// Garantir que plataformas estão configuradas
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;
