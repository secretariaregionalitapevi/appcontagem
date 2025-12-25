import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
  Modal,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';

const { DROPDOWN_FIELD_CONTAINER, DROPDOWN_FIELD_DROPDOWN } = theme.zIndex;

// Detectar se é mobile (apenas para apps nativos, não para web)
const isMobileDevice = (): boolean => {
  // IMPORTANTE: No web, SEMPRE retornar false para usar dropdown inline
  // Modal só deve ser usado em apps nativos (iOS/Android)
  if (Platform.OS === 'web') {
    return false; // Sempre usar dropdown inline no web
  }
  // Para apps nativos, verificar se é iOS ou Android
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

interface SelectOption {
  id: string;
  label: string;
  value: unknown;
}

interface NameSelectFieldProps {
  label?: string;
  value?: string;
  options: SelectOption[];
  onSelect: (option: SelectOption | { id: 'manual'; label: string; value: string }) => void;
  placeholder?: string;
  error?: string;
  style?: ViewStyle;
  loading?: boolean;
}

const MANUAL_INPUT_OPTION_ID = '__MANUAL_INPUT__';

export const NameSelectField: React.FC<NameSelectFieldProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Digite para buscar...',
  error,
  style,
  loading = false,
}) => {
  // Iniciar sempre como select, não como manual
  const [isManualMode, setIsManualMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showList, setShowList] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<View>(null);
  const inputRef = useRef<TextInput>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const isSelectingRef = useRef<boolean>(false); // Flag para evitar interferência do blur durante seleção

  // Normalizar texto (remove acentos, converte para minúscula)
  const normalize = (text: string) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // REMOVIDO: Conversão automática para modo manual
  // O campo sempre inicia como select normal
  // Só converte para modo manual quando o usuário clicar em "Adicionar novo nome manualmente"

  // Adicionar opção manual às opções filtradas
  const optionsWithManual = useMemo(() => {
    const manualOption: SelectOption = {
      id: MANUAL_INPUT_OPTION_ID,
      label: '✏️ Adicionar novo nome manualmente',
      value: MANUAL_INPUT_OPTION_ID,
    };
    return [...options, manualOption];
  }, [options]);

  // Filtrar opções baseado no texto digitado
  const filtered = useMemo(() => {
    if (isManualMode) {
      console.log('🔄 [NameSelectField] filtered: Modo manual ativo - retornando array vazio');
      return [];
    }

    // Se não há opções, não mostrar dropdown (já está em modo manual automaticamente)
    if (!options || options.length === 0) {
      console.log('🔄 [NameSelectField] filtered: Sem opções - retornando array vazio');
      return []; // Não mostrar dropdown - modo manual será ativado automaticamente
    }

    // Verificar se já há um nome selecionado válido (que está na lista de opções)
    const hasValidSelection = value && options.some(opt => opt.id === value || opt.value === value);
    
    // Verificar se o valor atual é uma entrada manual (começa com "manual_")
    const isManualValue = value && typeof value === 'string' && value.startsWith('manual_');

    // Filtrar opções baseado no texto
    const query = normalize(searchText);
    const filteredOptions = options.filter(opt => {
      const labelNorm = normalize(opt.label);
      return labelNorm.includes(query);
    });

    // 🚨 CRÍTICO: Se há um nome selecionado válido da lista E o usuário não está editando
    // (ou seja, searchText corresponde ao nome selecionado), NÃO mostrar opção manual
    if (hasValidSelection && !isManualValue) {
      // Se o texto digitado corresponde ao nome selecionado, não mostrar manual
      const selectedOption = options.find(opt => opt.id === value || opt.value === value);
      if (selectedOption && normalize(selectedOption.label) === normalize(searchText)) {
        // Usuário está vendo o nome selecionado, não mostrar manual
        if (!searchText.trim()) {
          const result = options;
          console.log('✅ [NameSelectField] filtered: Texto vazio com seleção válida - retornando todas as opções:', result.length);
          return result; // Mostrar todas as opções
        }
        if (filteredOptions.length > 0) {
          console.log('✅ [NameSelectField] filtered: Resultados filtrados encontrados:', filteredOptions.length);
          return filteredOptions; // Mostrar resultados filtrados
        }
        console.log('⚠️ [NameSelectField] filtered: Sem resultados filtrados com seleção válida - retornando array vazio');
        return []; // Não mostrar nada se não há resultados
      }
    }

    // 🚨 CORREÇÃO: Se não há texto digitado, mostrar todas as opções + opção manual no final
    if (!searchText.trim()) {
      const result = optionsWithManual;
      console.log('✅ [NameSelectField] filtered: Texto vazio - retornando todas as opções + manual:', result.length);
      return result;
    }

    // 🚨 CORREÇÃO CRÍTICA: Se há resultados filtrados, mostrar APENAS os resultados (SEM opção manual)
    // O botão "Adicionar novo nome manualmente" só deve aparecer quando NÃO há resultados
    if (filteredOptions.length > 0) {
      console.log('✅ [NameSelectField] filtered: Resultados filtrados encontrados (sem opção manual):', filteredOptions.length);
      return filteredOptions; // Apenas resultados, SEM opção manual
    }

    // 🚨 CORREÇÃO: Se não há resultados filtrados, mostrar apenas a opção manual
    // Isso permite digitação quando o usuário não encontra o nome na busca
    const result = optionsWithManual.slice(-1);
    console.log('✅ [NameSelectField] filtered: Sem resultados - retornando apenas opção manual:', result.length);
    return result;
  }, [searchText, options, optionsWithManual, isManualMode, value]);

  // 🚨 LÓGICA SIMPLIFICADA: Quando não há opções, entrar automaticamente em modo manual
  useEffect(() => {
    if (!options || options.length === 0) {
      if (!isManualMode) {
        setIsManualMode(true);
      }
      return;
    }

    // Se há opções e está em modo manual, verificar se foi escolha do usuário
    if (isManualMode) {
      // Se o valor é manual (começa com manual_), manter modo manual
      if (value && typeof value === 'string' && value.startsWith('manual_')) {
        return;
      }
      // Se o valor corresponde a uma opção, sair do modo manual
      if (value && typeof value === 'string') {
        const matchesOption = options.some(opt => opt.id === value || opt.value === value);
        if (matchesOption) {
          setIsManualMode(false);
        }
      } else if (!value) {
        // Sem valor - sair do modo manual para permitir seleção
        setIsManualMode(false);
      }
    }
  }, [options, isManualMode, value]);

  // Sincronizar searchText com value quando muda externamente
  useEffect(() => {
    if (isManualMode) {
      // Em modo manual, searchText é o próprio value (sem prefixo manual_)
      if (value && typeof value === 'string' && value.startsWith('manual_')) {
        setSearchText(value.replace('manual_', ''));
      } else {
        setSearchText(value || '');
      }
      return;
    }

    if (!options || options.length === 0) {
      return;
    }

    // Buscar opção correspondente ao value
    const currentOption = options.find(opt => opt.id === value || opt.value === value);
    if (currentOption) {
      setSearchText(currentOption.label);
    } else if (!value) {
      setSearchText('');
    } else {
      setSearchText(value);
    }
  }, [value, options, isManualMode]);

  // 🚨 CRÍTICO MOBILE: Garantir que a lista apareça quando há opções e o campo está focado
  useEffect(() => {
    if (Platform.OS === 'web') {
      return; // No web, a lógica normal já funciona
    }

    // Se está em modo manual, não mostrar lista
    if (isManualMode) {
      if (showList) {
        console.log('🔄 [NameSelectField] Modo manual ativado - ocultando lista');
        setShowList(false);
      }
      return;
    }

    // Se não há opções, não mostrar lista
    if (!options || options.length === 0) {
      if (showList) {
        console.log('🔄 [NameSelectField] Sem opções - ocultando lista');
        setShowList(false);
      }
      return;
    }

    // Se o campo está focado e há opções, garantir que a lista esteja visível
    if (isFocused && filtered.length > 0 && !showList) {
      console.log('📱 [NameSelectField] Campo focado com opções - forçando exibição da lista');
      setShowList(true);
    }
  }, [isFocused, filtered.length, options, isManualMode, Platform.OS, showList]);

  // Quando o usuário digita
  const handleChange = (text: string) => {
    setSearchText(text);
    setSelectedIndex(-1);

    // 🚨 LÓGICA SIMPLIFICADA: Se está em modo manual, manter modo manual e atualizar selectedPessoa
    if (isManualMode) {
      if (text.trim()) {
        onSelect({ id: 'manual', label: text.trim(), value: text.trim() });
      }
      return;
    }

    // 🚨 LÓGICA SIMPLIFICADA: Verificar se há resultados filtrados
    const query = normalize(text);
    const filteredOptions = options.filter(opt => {
      const labelNorm = normalize(opt.label);
      return labelNorm.includes(query);
    });

    // 🚨 CRÍTICO MOBILE: Sempre mostrar lista quando há opções disponíveis
    if (filteredOptions.length > 0) {
      // Há resultados filtrados → mostrar lista
      console.log('✅ [NameSelectField] Mostrando lista com resultados filtrados:', filteredOptions.length);
      setShowList(true);
    } else if (text.trim().length >= 3) {
      // Se não há resultados E digitou pelo menos 3 letras → ativar modo manual automaticamente (input mode)
      console.log('🔄 [NameSelectField] Sem resultados após 3+ letras - ativando modo manual automaticamente');
      setIsManualMode(true);
      setShowList(false);
      if (text.trim()) {
        onSelect({ id: 'manual', label: text.trim(), value: text.trim() });
      }
    } else if (text.trim().length > 0) {
      // Se digitou menos de 3 letras, ainda pode aparecer resultados - mostrar lista se houver opções
      if (options && options.length > 0) {
        console.log('📱 [NameSelectField] Texto parcial - mostrando lista com opções disponíveis');
        setShowList(true);
      } else {
        setShowList(false);
      }
    } else {
      // Texto vazio - mostrar todas as opções (CRÍTICO no mobile)
      if (options && options.length > 0) {
        console.log('📱 [NameSelectField] Texto vazio - mostrando todas as opções disponíveis:', options.length);
        setShowList(true);
      } else {
        setShowList(false);
      }
    }
  };

  // Quando o campo recebe foco
  const handleFocus = () => {
    console.log('🔍 [NameSelectField] handleFocus chamado:', {
      isManualMode,
      optionsCount: options?.length || 0,
      filteredCount: filtered.length,
      searchText,
      Platform: Platform.OS,
    });
    setIsFocused(true);
    // Cancelar blur pendente
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    if (isManualMode) {
      console.log('⚠️ [NameSelectField] Em modo manual - não mostrar lista');
      setShowList(false);
      return;
    }

    // 🚨 CRÍTICO MOBILE: Sempre mostrar lista quando recebe foco, se houver opções
    if (options && options.length > 0) {
      console.log('✅ [NameSelectField] Mostrando lista ao receber foco, opções:', options.length);
      // Forçar mostrar lista no mobile
      setShowList(true);
      // No mobile, garantir que a lista apareça mesmo sem texto digitado
      if (Platform.OS !== 'web' && !searchText.trim()) {
        console.log('📱 [NameSelectField] Mobile detectado - forçando exibição da lista completa');
        setShowList(true);
      }
    } else {
      console.log('⚠️ [NameSelectField] Sem opções ao receber foco - não mostrar lista');
      setShowList(false);
    }
  };

  // Quando o campo perde foco
  const handleBlur = () => {
    // Se está selecionando um item, ignorar o blur completamente
    if (isSelectingRef.current) {
      return;
    }

    setIsFocused(false);
    
    // 🚨 LÓGICA SIMPLIFICADA: Se está em modo manual e há texto, confirmar
    if (isManualMode && searchText.trim()) {
      onSelect({ id: 'manual', label: searchText.trim(), value: searchText.trim() });
    } else if (searchText.trim() && !isManualMode) {
      // Se não está em modo manual mas há texto, verificar se corresponde exatamente a alguma opção
      const textoNormalizado = normalize(searchText);
      const correspondeExatamente = options.some(opt => {
        const labelNorm = normalize(opt.label);
        return labelNorm === textoNormalizado;
      });
      
      // Se não corresponde exatamente, tratar como manual
      if (!correspondeExatamente) {
        setIsManualMode(true);
        onSelect({ id: 'manual', label: searchText.trim(), value: searchText.trim() });
      }
    }

    // Se há itens filtrados na lista, manter lista aberta para permitir clique
    if (filtered.length > 0 && !isManualMode) {
      return;
    }
    
    // Fechar lista após delay (para permitir clique nos itens)
    const delay = Platform.OS === 'web' ? 500 : Platform.OS === 'android' ? 600 : 300;
    blurTimeoutRef.current = setTimeout(() => {
      if (filtered.length === 0 || isManualMode) {
        setShowList(false);
      }
      blurTimeoutRef.current = null;
    }, delay);
  };

  // Quando seleciona um item
  const handleSelect = (option: SelectOption) => {
    console.log('🖱️ [NameSelectField] handleSelect chamado:', {
      id: option.id,
      label: option.label,
      value: option.value,
    });

    // Marcar que está selecionando para evitar interferência do blur
    isSelectingRef.current = true;

    // Cancelar blur pendente IMEDIATAMENTE
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    // Fechar lista ANTES de atualizar o valor para evitar conflitos
    setShowList(false);
    setSelectedIndex(-1);

    // Se selecionou opção manual, ativar modo manual
    if (option.id === MANUAL_INPUT_OPTION_ID || option.value === MANUAL_INPUT_OPTION_ID) {
      console.log('✏️ [NameSelectField] Modo manual ativado - botão clicado');
      setIsManualMode(true);
      setSearchText('');
      // 🚨 CORREÇÃO: Não chamar onSelect com valor vazio - aguardar usuário digitar
      // Mas marcar que está em modo manual para permitir digitação
      // A lista será ocultada automaticamente porque isManualMode = true faz filtered retornar []
      isSelectingRef.current = false;
      // Focar no input após um pequeno delay para garantir que o modo manual foi ativado
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          console.log('✏️ [NameSelectField] Input focado após ativar modo manual');
        }
      }, 150);
      return;
    }

    // Seleção normal da lista - ATUALIZAR TUDO IMEDIATAMENTE
    const selectedValue = option.value || option.id;
    
    // 🚨 LÓGICA SIMPLIFICADA: Se selecionou da lista, sair do modo manual
    if (isManualMode) {
      setIsManualMode(false);
    }

    // Atualizar o texto do input PRIMEIRO
    setSearchText(option.label);
    
    // Chamar onSelect IMEDIATAMENTE com o valor correto
    onSelect({
      id: option.id,
      label: option.label,
      value: selectedValue,
    });

    // Resetar flag após um pequeno delay
    // 🚨 CRÍTICO: Android precisa de delay maior para garantir que a seleção seja processada
    const resetDelay = Platform.OS === 'android' ? 200 : 100;
    setTimeout(() => {
      isSelectingRef.current = false;
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }, resetDelay);
  };

  // Handler para Enter/Submit
  const handleEnterPress = () => {
    if (isManualMode) {
      // Em modo manual, confirmar o texto digitado
      if (searchText.trim()) {
        console.log('✏️ [NameSelectField] Enter pressionado em modo manual - confirmando nome:', searchText.trim());
        onSelect({ id: 'manual', label: searchText.trim(), value: searchText.trim() });
      } else {
        console.warn('⚠️ [NameSelectField] Enter pressionado em modo manual mas texto está vazio');
      }
      if (inputRef.current) {
        inputRef.current.blur();
      }
      return;
    }

    if (showList && filtered.length > 0) {
      const indexToSelect = selectedIndex >= 0 ? selectedIndex : 0;
      const optionToSelect = filtered[indexToSelect];
      if (optionToSelect) {
        handleSelect(optionToSelect);
      }
    } else if (searchText.trim()) {
      // 🚨 CORREÇÃO CRÍTICA: Se não há opções filtradas mas há texto digitado, tratar como manual
      const textoNormalizado = normalize(searchText);
      const encontrouNaLista = options.some(opt => {
        const labelNorm = normalize(opt.label);
        return labelNorm === textoNormalizado;
      });
      
      if (!encontrouNaLista) {
        console.log('📝 [NameSelectField] Enter pressionado com texto não encontrado na lista, tratando como manual:', searchText);
        setIsManualMode(true);
        onSelect({ id: 'manual', label: searchText.trim(), value: searchText.trim() });
        if (inputRef.current) {
          inputRef.current.blur();
        }
      }
    }
  };




  // Limpar timeouts ao desmontar
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  // Z-index para aparecer acima de outros elementos
  const containerZIndex = isFocused ? 99999 : 1;

  return (
    <View
      style={[
        styles.container,
        style,
          Platform.OS === 'web'
          ? {
              position: 'relative' as ViewStyle['position'],
              overflow: 'visible' as ViewStyle['overflow'],
              zIndex: containerZIndex,
            }
          : {
              overflow: 'visible' as ViewStyle['overflow'],
              zIndex: containerZIndex,
              elevation: isFocused ? 10 : 0,
            },
      ]}
      ref={containerRef}
      collapsable={false}
    >
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          {
            position: 'relative' as ViewStyle['position'],
            overflow: 'visible' as ViewStyle['overflow'],
            zIndex: containerZIndex,
            ...(Platform.OS === 'web' ? {
              backgroundColor: '#ffffff',
            } : {}),
          },
        ]}
      >
        {/* Sempre usar o mesmo TextInput - mesma aparência sempre */}
        <>
          <View style={{ position: 'relative', flex: 1 }}>
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                error ? styles.inputError : undefined,
                Platform.OS === 'web'
                  ? {
                      position: 'relative' as ViewStyle['position'],
                    }
                  : undefined,
              ]}
              value={searchText}
              onChangeText={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={loading ? "Carregando nomes..." : (isManualMode ? "Digite o nome completo manualmente" : placeholder)}
              placeholderTextColor={theme.colors.textSecondary}
              returnKeyType="done"
              onSubmitEditing={handleEnterPress}
              autoCapitalize="words"
              editable={!loading}
              onKeyPress={(e) => {
              // Suporte para Android/iOS com teclado físico ou virtual
              if (Platform.OS !== 'web') {
                // No mobile, Enter já é tratado por onSubmitEditing
                // Mas podemos adicionar lógica adicional se necessário
                return;
              }
            }}
            {...(Platform.OS === 'web'
              ? {
                  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleEnterPress();
                    } else if (e.key === 'ArrowDown' && !isManualMode) {
                      e.preventDefault();
                      if (filtered.length > 0) {
                        const nextIndex =
                          selectedIndex < filtered.length - 1 ? selectedIndex + 1 : 0;
                        setSelectedIndex(nextIndex);
                        if (flatListRef.current && nextIndex >= 0) {
                          setTimeout(() => {
                            flatListRef.current?.scrollToIndex({
                              index: nextIndex,
                              animated: true,
                              viewOffset: 10,
                            });
                          }, 50);
                        }
                      }
                    } else if (e.key === 'ArrowUp' && !isManualMode) {
                      e.preventDefault();
                      if (filtered.length > 0) {
                        const prevIndex =
                          selectedIndex > 0 ? selectedIndex - 1 : filtered.length - 1;
                        setSelectedIndex(prevIndex);
                        if (flatListRef.current && prevIndex >= 0) {
                          setTimeout(() => {
                            flatListRef.current?.scrollToIndex({
                              index: prevIndex,
                              animated: true,
                              viewOffset: 10,
                            });
                          }, 50);
                        }
                      }
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setShowList(false);
                      if (inputRef.current) {
                        inputRef.current.blur();
                      }
                    }
                  },
                }
              : {})}
          />
          {loading && (
            <View style={styles.loadingContainer}>
              <FontAwesome5 name="spinner" size={14} color={theme.colors.primary} style={styles.loadingSpinner} />
              <Text style={styles.loadingText}>Carregando...</Text>
            </View>
          )}
          </View>

          {/* Dropdown - só mostrar se não estiver em modo manual E houver opções */}
          {!isManualMode && (
            <>
              {/* Dropdown - Usar dropdown inline mesmo no mobile para não bloquear scroll */}
              {Platform.OS !== 'web' ? (
              <>
                {(() => {
                  const shouldShow = showList && filtered.length > 0;
                  if (Platform.OS !== 'web') {
                    console.log('📱 [NameSelectField] Renderizando dropdown mobile:', {
                      showList,
                      filteredLength: filtered.length,
                      shouldShow,
                      isManualMode,
                      optionsCount: options?.length || 0,
                      searchText,
                    });
                  }
                  return shouldShow;
                })() && (
                  <>
                    {/* Overlay transparente para fechar ao clicar fora */}
                    <TouchableOpacity
                      style={styles.mobileOverlay}
                      activeOpacity={1}
                      onPress={() => {
                        // Só fechar se não está selecionando
                        if (!isSelectingRef.current) {
                          console.log('🔄 [NameSelectField] Overlay clicado - fechando lista');
                          setShowList(false);
                        }
                      }}
                      // 🚨 CRÍTICO: No Android, garantir que não interfira com toques nos itens
                      delayPressIn={Platform.OS === 'android' ? 200 : 0}
                      delayPressOut={Platform.OS === 'android' ? 100 : 0}
                    />
                    <View 
                      style={styles.mobileDropdownContainer}
                      // 🚨 CRÍTICO MOBILE: Garantir que o container capture toques
                      pointerEvents="box-none"
                    >
                      <View
                        style={styles.mobileDropdownContent}
                        onStartShouldSetResponder={() => false}
                        // 🚨 CRÍTICO MOBILE: Garantir que o conteúdo capture toques
                        pointerEvents="auto"
                      >
                    {filtered.length > 0 ? (
                      <FlatList
                        ref={flatListRef}
                        data={filtered}
                        keyExtractor={item => item.id}
                        keyboardDismissMode="none"
                        // 🚨 CRÍTICO: Garantir que os toques sejam sempre capturados
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled={true}
                        // 🚨 CRÍTICO: Android precisa de configurações específicas
                        scrollEnabled={true}
                        bounces={false}
                        overScrollMode={Platform.OS === 'android' ? 'never' : undefined}
                        renderItem={({ item, index }) => {
                          const isManualOption = item.id === MANUAL_INPUT_OPTION_ID;
                          return (
                            <TouchableOpacity
                              style={[
                                styles.item,
                                selectedIndex === index && styles.itemHighlighted,
                                value === item.id && !isManualOption && styles.itemSelected,
                                isManualOption && styles.itemManual,
                              ]}
                              onPress={(e) => {
                                // 🚨 CRÍTICO: Prevenir propagação para o overlay
                                e.stopPropagation();
                                // Marcar que está selecionando ANTES de tudo
                                isSelectingRef.current = true;
                                // Cancelar blur pendente ao clicar
                                if (blurTimeoutRef.current) {
                                  clearTimeout(blurTimeoutRef.current);
                                  blurTimeoutRef.current = null;
                                }
                                // Selecionar o item
                                handleSelect(item);
                              }}
                              onPressIn={(e) => {
                                // 🚨 CRÍTICO: Prevenir propagação e cancelar blur imediatamente
                                e.stopPropagation();
                                // Cancelar blur imediatamente ao tocar (melhor para mobile)
                                if (blurTimeoutRef.current) {
                                  clearTimeout(blurTimeoutRef.current);
                                  blurTimeoutRef.current = null;
                                }
                                // Marcar que está selecionando ANTES do blur
                                isSelectingRef.current = true;
                              }}
                              onPressOut={(e) => {
                                // 🚨 CRÍTICO: No Android, garantir que o evento seja capturado
                                e.stopPropagation();
                              }}
                              onLongPress={() => {
                                // 🚨 CRÍTICO: No Android, usar onLongPress como fallback se onPress não funcionar
                                if (Platform.OS === 'android' && !isSelectingRef.current) {
                                  isSelectingRef.current = true;
                                  if (blurTimeoutRef.current) {
                                    clearTimeout(blurTimeoutRef.current);
                                    blurTimeoutRef.current = null;
                                  }
                                }
                              }}
                              activeOpacity={0.7}
                              hitSlop={Platform.OS === 'android' 
                                ? { top: 30, bottom: 30, left: 25, right: 25 } 
                                : { top: 25, bottom: 25, left: 20, right: 20 }}
                              // 🚨 CRÍTICO: Android precisa de delay menor para melhor responsividade
                              delayPressIn={0}
                              delayPressOut={Platform.OS === 'android' ? 100 : 0}
                              delayLongPress={Platform.OS === 'android' ? 200 : 500}
                            >
                              <Text
                                style={[
                                  styles.itemText,
                                  value === item.id && !isManualOption && styles.itemTextSelected,
                                  isManualOption && styles.itemTextManual,
                                ]}
                                numberOfLines={1}
                              >
                                {item.label}
                              </Text>
                              {value === item.id && !isManualOption && (
                                <FontAwesome5
                                  name="check"
                                  size={12}
                                  color={theme.colors.primary}
                                  style={styles.checkIcon}
                                />
                              )}
                            </TouchableOpacity>
                          );
                        }}
                        style={styles.list}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={false}
                      />
                    ) : (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Nenhum resultado encontrado</Text>
                      </View>
                    )}
                      </View>
                    </View>
                  </>
                )}
              </>
            ) : (
              <>
            {showList && filtered.length > 0 && (
              <View
                style={styles.webDropdownContainer}
              >
              <View
                style={[
                  styles.dropdown,
                  Platform.OS === 'web' ? {
                    // @ts-ignore
                    backgroundColor: '#ffffff',
                    // @ts-ignore
                    // @ts-ignore
                    opacity: 1,
                  } : {},
                ]}
                    onStartShouldSetResponder={() => false}
                    onMoveShouldSetResponder={() => false}
                    pointerEvents="auto"
                    {...(Platform.OS === 'web'
                      ? {
                          onMouseEnter: () => {
                            // Cancelar blur quando mouse entra no dropdown
                            if (blurTimeoutRef.current) {
                              clearTimeout(blurTimeoutRef.current);
                              blurTimeoutRef.current = null;
                            }
                          },
                          onMouseDown: (e: React.MouseEvent) => {
                            // Cancelar blur ao clicar no dropdown
                            if (blurTimeoutRef.current) {
                              clearTimeout(blurTimeoutRef.current);
                              blurTimeoutRef.current = null;
                            }
                          },
                        }
                      : {})}
              >
                <FlatList
                  ref={flatListRef}
                  data={filtered}
                  keyExtractor={item => item.id}
                  renderItem={({ item, index }) => {
                    const isManualOption = item.id === MANUAL_INPUT_OPTION_ID;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.item,
                          selectedIndex === index && styles.itemHighlighted,
                          value === item.id && !isManualOption && styles.itemSelected,
                          isManualOption && styles.itemManual,
                        ]}
                            onPress={() => {
                              // Cancelar blur pendente ao clicar
                              if (blurTimeoutRef.current) {
                                clearTimeout(blurTimeoutRef.current);
                                blurTimeoutRef.current = null;
                              }
                              handleSelect(item);
                            }}
                            onPressIn={() => {
                              // Cancelar blur imediatamente ao tocar (melhor para mobile)
                              if (blurTimeoutRef.current) {
                                clearTimeout(blurTimeoutRef.current);
                                blurTimeoutRef.current = null;
                              }
                            }}
                        activeOpacity={Platform.OS === 'web' ? 0.7 : 0.5}
                        hitSlop={Platform.OS === 'web' ? undefined : { top: 10, bottom: 10, left: 0, right: 0 }}
                        delayPressIn={0}
                        {...(Platform.OS === 'web'
                          ? {
                              onMouseEnter: () => setSelectedIndex(index),
                              onMouseLeave: () => setSelectedIndex(-1),
                            }
                          : {})}
                      >
                        <Text
                          style={[
                            styles.itemText,
                            value === item.id && !isManualOption && styles.itemTextSelected,
                            isManualOption && styles.itemTextManual,
                          ]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                        {value === item.id && !isManualOption && (
                          <FontAwesome5
                            name="check"
                            size={12}
                            color={theme.colors.primary}
                            style={styles.checkIcon}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  style={styles.list}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="always"
                  initialNumToRender={10}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  removeClippedSubviews={false}
                />
              </View>
            </View>
            )}

            {/* Mensagem quando não há resultados */}
            {showList && filtered.length === 0 && searchText.trim().length > 0 && isFocused && (
              <View style={styles.webDropdownContainer}>
                <View style={styles.dropdown}>
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Nenhum resultado encontrado</Text>
                  </View>
                </View>
              </View>
            )}
              </>
            )}
            </>
          )}
        </>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
    // 🚨 CRÍTICO MOBILE: Garantir que o container não corte o overflow do dropdown
    ...(Platform.OS === 'web' ? {
      backgroundColor: '#ffffff',
    } : {
      // No mobile, garantir que o overflow seja visível para o dropdown
      overflow: 'visible' as ViewStyle['overflow'],
    }),
  },
  label: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    position: 'relative' as ViewStyle['position'],
    // 🚨 CRÍTICO MOBILE: Garantir que o container não corte o overflow
    ...(Platform.OS === 'web' ? {
      backgroundColor: '#ffffff',
      zIndex: 1,
    } : {
      overflow: 'visible' as ViewStyle['overflow'],
      zIndex: 1,
    }),
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#ffffff',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: Platform.OS === 'web' ? theme.spacing.md : theme.spacing.lg, // Mais padding no mobile
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    minHeight: Platform.OS === 'web' ? 48 : 52, // Aumentado no mobile
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    ...(Platform.OS === 'web' ? {
      backgroundColor: '#ffffff',
      // @ts-ignore
      opacity: 1,
    } : {}),
  },
  manualInput: {
    // Removido estilo de cor - campo deve ter aparência normal mesmo em modo manual
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  manualContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: '#ffffff',
  },
  backButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  webDropdownContainer: {
    position: 'absolute' as any,
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 999999,
    marginTop: 4,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - propriedades CSS específicas do web
      display: 'block',
      // @ts-ignore
      visibility: 'visible',
      // @ts-ignore
      pointerEvents: 'auto',
      // @ts-ignore
      isolation: 'isolate',
      // @ts-ignore
      willChange: 'transform',
    } as any : {}),
  },
  dropdown: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 999999,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - propriedades CSS específicas do web
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
      backgroundColor: '#ffffff',
      // @ts-ignore
      display: 'block',
      // @ts-ignore
      visibility: 'visible',
      // @ts-ignore
      backgroundImage: 'none',
      // @ts-ignore
      isolation: 'isolate',
      // @ts-ignore
      position: 'relative',
      // @ts-ignore
      willChange: 'transform',
    } as any : {}),
  },
  list: {
    maxHeight: 300,
    backgroundColor: '#ffffff',
    ...(Platform.OS === 'web' ? {
      backgroundColor: '#ffffff',
      // @ts-ignore
      // @ts-ignore
      zIndex: 999999,
    } : {}),
  },
  item: {
    paddingVertical: Platform.OS === 'web' ? theme.spacing.md : theme.spacing.xl, // Mais padding no mobile para melhor toque
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: Platform.OS === 'web' ? 48 : 64, // Aumentado no mobile para área de toque maior (mínimo 44px recomendado)
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      opacity: 1,
      // @ts-ignore
      position: 'relative',
      // @ts-ignore
      zIndex: 999999,
      // @ts-ignore
      willChange: 'transform',
    } : {
      // No mobile, garantir que o item seja totalmente clicável
      // @ts-ignore
      touchAction: 'manipulation',
    }),
  },
  itemHighlighted: {
    backgroundColor: theme.colors.primary + '15',
  },
  itemSelected: {
    backgroundColor: theme.colors.primary + '20',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  itemManual: {
    // Removido estilo dourado/azul - usar estilo padrão
  },
  itemText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: '#333333',
    fontWeight: '400',
    lineHeight: 20,
  },
  itemTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  itemTextManual: {
    // Removido estilo dourado/azul - usar estilo padrão
    fontWeight: '400',
  },
  checkIcon: {
    marginLeft: theme.spacing.xs,
  },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  emptyContainer: {
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  loadingContainer: {
    position: 'absolute',
    right: theme.spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  loadingSpinner: {
    // @ts-ignore - animação de rotação
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  mobileOverlay: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: -1000, // Estender para baixo para capturar cliques
    zIndex: 999998,
    backgroundColor: 'transparent',
    // 🚨 CRÍTICO: Android precisa de configurações específicas
    ...(Platform.OS === 'android' ? {
      elevation: 0, // Não elevar o overlay para não bloquear toques
    } : {}),
  },
  mobileDropdownContainer: {
    position: 'absolute' as any,
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 999999,
    marginTop: 4,
    elevation: 999999,
    // 🚨 CRÍTICO MOBILE: Garantir que o container não seja cortado pelo ScrollView
    ...(Platform.OS !== 'web' ? {
      // @ts-ignore
      pointerEvents: 'box-none', // Permitir toques passarem através quando não há conteúdo
    } : {}),
  },
  mobileDropdownContent: {
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.md,
    maxHeight: 400,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 15,
    overflow: 'hidden',
    // 🚨 CRÍTICO MOBILE: Garantir que o conteúdo seja clicável e visível
    ...(Platform.OS !== 'web' ? {
      // @ts-ignore
      pointerEvents: 'auto', // Garantir que toques sejam capturados
    } : {}),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 100,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: theme.borderRadius.md,
    maxHeight: 400,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 15,
    overflow: 'hidden',
  },
});
