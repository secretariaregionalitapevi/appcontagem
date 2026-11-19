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
  ActivityIndicator,
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
  data?: any; // 🚨 NOVO: Suporte para passar objeto original de volta
}

interface NameSelectFieldProps {
  appearance?: 'default' | 'soft';
  leadingIcon?: string;
  iconColor?: string;
  label?: string;
  value?: string;
  options: SelectOption[];
  onSelect: (option: SelectOption | { id: 'manual'; label: string; value: string }) => void;
  placeholder?: string;
  error?: string;
  style?: ViewStyle;
  loading?: boolean;
  onSubmit?: () => void;
  showOptionsOnFocus?: boolean;
}

const MANUAL_INPUT_OPTION_ID = '__MANUAL_INPUT__';
const MIN_MANUAL_DETECTION_CHARS = 4;

export interface NameSelectFieldRef {
  focus: () => void;
  blur: () => void;
  getText: () => string;
}

export const NameSelectField = React.forwardRef<NameSelectFieldRef, NameSelectFieldProps>(
  (
    {
      appearance = 'default',
      leadingIcon,
      iconColor = '#1684dc',
      label,
      value,
      options,
      onSelect,
      placeholder = 'Digite para buscar...',
      error,
      style,
      loading = false,
      onSubmit,
      showOptionsOnFocus = true,
    },
    ref
  ) => {
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
    const isUserTypingRef = useRef<boolean>(false);
    const isSelectingRef = useRef<boolean>(false); // Flag para evitar interferência do blur durante seleção

    // 🚀 EXPOR MÉTODOS VIA REF
    React.useImperativeHandle(ref, () => ({
      focus: () => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      },
      blur: () => {
        if (inputRef.current) {
          inputRef.current.blur();
        }
      },
      getText: () => searchText,
    }));

    // Normalizar texto (remove acentos, converte para minúscula)
    const normalize = (text: string) => {
      if (!text) return '';
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    };

    const displayableOptions = useMemo(() => {
      return (options || []).filter(opt => {
        const label = typeof opt?.label === 'string' ? opt.label.trim() : '';
        const id = typeof opt?.id === 'string' ? opt.id.trim() : '';
        return label.length > 0 && id.length > 0;
      });
    }, [options]);

    // REMOVIDO: Conversão automática para modo manual
    // O campo sempre inicia como select normal
    // Só converte para modo manual quando o usuário clicar em "Adicionar novo nome manualmente"

    // REMOVIDO: Conversão automática para modo manual
    // O campo agora alterna entre busca e manual de forma transparente

    // Filtrar opções baseado no texto digitado
    const filtered = useMemo(() => {
      if (isManualMode) {
        return [];
      }

      if (!showOptionsOnFocus && !searchText.trim()) {
        return [];
      }

      // Se não há opções, não mostrar dropdown (já está em modo manual automaticamente)
      if (displayableOptions.length === 0) {
        return []; // Não mostrar dropdown - modo manual será ativado automaticamente
      }

      // Verificar se já há um nome selecionado válido (que está na lista de opções)
      const hasValidSelection =
        value && displayableOptions.some(opt => opt.id === value || opt.value === value);

      // Verificar se o valor atual é uma entrada manual (começa com "manual_")
      const isManualValue = value && typeof value === 'string' && value.startsWith('manual_');

      // Filtrar opções baseado no texto (suporte a múltiplas palavras)
      const query = normalize(searchText);
      const queryWords = query.split(' ').filter(word => word.length > 0);

      const filteredOptions = displayableOptions.filter(opt => {
        const labelNorm = normalize(opt.label);
        // Deve conter TODAS as palavras digitadas (em qualquer ordem)
        return queryWords.every(word => labelNorm.includes(word));
      });

      // 🚨 CRÍTICO: Se há um nome selecionado válido da lista E o usuário não está editando
      // (ou seja, searchText corresponde ao nome selecionado), NÃO mostrar opção manual
      if (hasValidSelection && !isManualValue) {
        // Se o texto digitado corresponde ao nome selecionado, não mostrar manual
        const selectedOption = displayableOptions.find(
          opt => opt.id === value || opt.value === value
        );
        if (selectedOption && normalize(selectedOption.label) === normalize(searchText)) {
          // Usuário está vendo o nome selecionado, não mostrar manual
          if (!searchText.trim()) {
            return options; // Mostrar todas as opções
          }
          if (filteredOptions.length > 0) {
            return filteredOptions; // Mostrar resultados filtrados
          }
          return []; // Não mostrar nada se não há resultados
        }
      }

      // 🚨 CORREÇÃO: Mostrar a opção manual APENAS se não houver NENHUM resultado na lista
      const result = [...filteredOptions];
      if (searchText.trim().length > 0 && !hasValidSelection && filteredOptions.length === 0) {
        result.push({
          id: MANUAL_INPUT_OPTION_ID,
          label: `NÃO ENCONTREI (Digitar "${searchText.trim().toUpperCase()}" manualmente)`,
          value: MANUAL_INPUT_OPTION_ID,
        });
      }

      return result;
    }, [searchText, displayableOptions, isManualMode, value, showOptionsOnFocus]);

    // 🚨 CRÍTICO: Quando não há opções, entrar automaticamente em modo manual
    // 🚨 CORREÇÃO: NÃO mudar para modo manual enquanto está carregando - aguardar carregamento terminar
    // Quando há opções, modo manual só quando usuário SELECIONAR a opção manual
    useEffect(() => {
      // 🚨 CORREÇÃO CRÍTICA: Se está carregando, NÃO mudar para modo manual ainda
      // Aguardar carregamento terminar para verificar se realmente não há opções
      if (loading) {
        // Enquanto carrega, manter estado atual (não mudar para manual)
        return;
      }

      // 🚨 CORREÇÃO CRÍTICA: Só entrar em modo manual se NÃO está carregando E não há opções
      // Isso evita mudar para manual enquanto a lista ainda está carregando
      if (!loading && displayableOptions.length === 0) {
        if (!isManualMode) {
          setIsManualMode(true);
          // Se há um valor manual anterior, manter
          if (value && typeof value === 'string' && value.startsWith('manual_')) {
            const manualValue = value.replace('manual_', '');
            setSearchText(manualValue);
          } else if (value) {
            setSearchText(value);
          } else {
            setSearchText('');
          }
        }
        return;
      }

      // 🚨 CORREÇÃO: Se está carregando, NÃO mudar para manual ainda - aguardar carregamento terminar
      if (loading) {
        // Manter estado atual, não mudar para manual durante carregamento
        return;
      }

      // Se há opções e está em modo manual, verificar se foi escolha do usuário
      if (isManualMode) {
        // Se o valor é manual (começa com manual_), manter modo manual (usuário escolheu)
        if (value && typeof value === 'string' && value.startsWith('manual_')) {
          // Usuário escolheu manualmente, manter modo manual
          return;
        }
        // Se o valor não é manual, verificar se corresponde a uma opção da lista
        if (value) {
          const matchesOption = displayableOptions.some(
            opt => opt.id === value || opt.value === value
          );
          if (matchesOption) {
            // Valor corresponde a uma opção, sair do modo manual
            setIsManualMode(false);
          }
        } else {
          // Não há valor, sair do modo manual para mostrar lista
          setIsManualMode(false);
        }
      }
    }, [options, isManualMode, value, loading]); // 🚨 CORREÇÃO: Adicionar loading como dependência

    useEffect(() => {
      if (!isManualMode || loading || !searchText.trim() || displayableOptions.length === 0) {
        return;
      }

      const query = normalize(searchText);
      const queryWords = query.split(' ').filter(word => word.length > 0);
      const hasMatches = displayableOptions.some(opt => {
        const labelNorm = normalize(opt.label);
        return queryWords.every(word => labelNorm.includes(word));
      });

      if (hasMatches) {
        console.log(
          '🔍 [NameSelectField] Lista atualizada com correspondências - voltando para modo busca'
        );
        setIsManualMode(false);
        setShowList(isFocused);
        onSelect({ id: '', label: searchText, value: '' });
      }
    }, [displayableOptions, isManualMode, loading, searchText, isFocused, onSelect]);

    // Sincronizar searchText com value quando muda externamente
    useEffect(() => {
      if (isManualMode) {
        if (isUserTypingRef.current && searchText.trim()) {
          return;
        }

        // Em modo manual, searchText é o próprio value (sem prefixo manual_)
        if (value && typeof value === 'string' && value.startsWith('manual_')) {
          const manualText = value.replace('manual_', '');
          if (searchText !== manualText) {
            setSearchText(manualText);
          }
        } else {
          const nextText = value || '';
          if (searchText !== nextText) {
            setSearchText(nextText);
          }
        }
        return;
      }

      // Se não há opções, já foi convertido para manual no useEffect anterior
      if (displayableOptions.length === 0) {
        return;
      }

      // Buscar opção correspondente ao value
      const currentOption = displayableOptions.find(opt => opt.id === value || opt.value === value);
      if (currentOption) {
        isUserTypingRef.current = false;
        if (searchText !== currentOption.label) {
          setSearchText(currentOption.label);
        }
      } else if (!value) {
        // 🚨 CORREÇÃO CRÍTICA: Só limpar o searchText se NÃO estiver focado.
        // Se estiver focado, o usuário está digitando e não queremos limpar o que ele escreveu
        // só porque o valor no componente pai ainda está vazio (estado de busca).
        if (isUserTypingRef.current && searchText.trim()) {
          return;
        }

        if (!isFocused && searchText !== '') {
          setSearchText('');
        }
      } else {
        // 🚨 CORREÇÃO CRÍTICA: Se o value é um ID técnico (pessoa_ ou cand_), NÃO exibir o ID no campo.
        // Isso acontecia quando a lista de opções estava carregando ou era temporariamente limpa.
        const isTechnicalId =
          typeof value === 'string' && (value.startsWith('pessoa_') || value.startsWith('cand_'));

        if (isTechnicalId) {
          // Se for ID técnico e não achou na lista (ex: carregando), não mudar o searchText para o ID feio
          // Podemos tentar extrair o nome do ID como fallback estético se estiver vazio
          if (searchText === '') {
            const fallbackNome = value
              .replace(/^(pessoa|cand)_(\d+_)?/gi, '')
              .replace(/_/g, ' ')
              .toUpperCase();
            setSearchText(fallbackNome);
          }
        } else {
          // Se for valor manual real (ou apenas texto), manter como está
          if (searchText !== value) {
            setSearchText(value);
          }
        }
      }
    }, [value, options, isManualMode, isFocused]); // 🚨 ADICIONADO isFocused como dependência

    // Quando o usuário digita
    const handleChange = (text: string) => {
      isUserTypingRef.current = true;
      setSearchText(text);
      setSelectedIndex(-1);

      // 🚨 CORREÇÃO CRÍTICA: Se o texto foi apagado totalmente, sair do modo manual
      if (text === '') {
        isUserTypingRef.current = false;
        console.log(
          '🧹 [NameSelectField] Campo limpo - saindo do modo manual e voltando para busca'
        );
        setIsManualMode(false);
        setShowList(true);
        onSelect({ id: '', label: '', value: '' });
        return;
      }

      // 🚨 LÓGICA SEM FISSURAS: Verificar se o que foi digitado resultaria em algum item na lista
      const query = normalize(text);
      const queryWords = query.split(' ').filter(word => word.length > 0);
      const hasMatches = displayableOptions.some(opt => {
        const labelNorm = normalize(opt.label);
        return queryWords.every(word => labelNorm.includes(word));
      });

      if (isManualMode) {
        if (hasMatches) {
          console.log(
            '🔍 [NameSelectField] Correspondências encontradas - voltando para modo busca'
          );
          setIsManualMode(false);
          setShowList(true);
          onSelect({ id: '', label: text, value: '' });
          return;
        }

        onSelect({ id: 'manual', label: text, value: text, data: null });
        setShowList(false);
        return;
      }

      if (!hasMatches && text.trim().length >= MIN_MANUAL_DETECTION_CHARS) {
        // Se não há combinações, entra em modo manual AUTOMATICAMENTE
        if (!isManualMode) {
          console.log(
            '✏️ [NameSelectField] Sem correspondências - ativando modo manual automático'
          );
          setIsManualMode(true);
        }
        onSelect({ id: 'manual', label: text, value: text, data: null });
        setShowList(false);
      } else if (!hasMatches) {
        setShowList(false);
        onSelect({ id: '', label: text, value: '' });
      } else {
        // Se há combinações, garante que NÃO está em modo manual
        if (isManualMode) {
          console.log(
            '🔍 [NameSelectField] Correspondências encontradas - voltando para modo busca'
          );
          setIsManualMode(false);
        }
        setShowList(true);
        // Opcional: Notificar o pai que o valor está "em aberto" na busca
        onSelect({ id: '', label: text, value: '' });
      }
    };

    // Quando o campo recebe foco
    const handleFocus = () => {
      setIsFocused(true);
      // Cancelar blur pendente
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }

      if (isManualMode) {
        return;
      }

      if (!showOptionsOnFocus && !searchText.trim()) {
        setShowList(false);
        return;
      }

      // Se não há opções, não abrir dropdown (já está em modo manual automaticamente)
      if (displayableOptions.length === 0) {
        setShowList(false);
        return;
      }

      // 🚨 CRÍTICO: Sempre abrir dropdown quando há opções e não está em modo manual
      // Isso permite que o usuário veja e selecione nomes da lista
      setShowList(true);
    };

    // Quando o campo perde foco
    const handleBlur = () => {
      // Se está selecionando um item, ignorar o blur completamente
      if (isSelectingRef.current) {
        console.log('🔒 [NameSelectField] Blur ignorado - seleção em andamento');
        return;
      }

      // 🚨 CRÍTICO: Se há itens filtrados na lista, NÃO fechar a lista no blur
      // Isso permite que o usuário clique nos itens mesmo após o blur do input
      if (filtered.length > 0 && !isManualMode) {
        console.log('📋 [NameSelectField] Blur - mantendo lista aberta por um momento para clique');
        // Não fechar IMEDIATAMENTE, dar tempo para o clique no item ser processado
      }

      setIsFocused(false);

      // 🚨 REDUZIDO: Apenas entrar em modo manual se o usuário explicitamente der Enter ou se o texto for curto e não houver opções
      // No blur, apenas fechar a lista. Não forçar modo manual para evitar "prisão" no campo.
      /*
    if (searchText.trim() && !isManualMode && !loading && options && options.length > 0) {
      const textoNormalizado = normalize(searchText);
      const encontrouNaLista = options.some(opt => {
        const labelNorm = normalize(opt.label);
        return labelNorm === textoNormalizado;
      });

      if (!encontrouNaLista) {
        console.log(
          '✏️ [NameSelectField] Texto digitado não encontrado na lista, tratando como manual:',
          searchText
        );
        setIsManualMode(true);
        onSelect({ id: 'manual', label: searchText.trim(), value: searchText.trim() });
      }
    }
    */

      // Só fechar lista se não há itens filtrados
      // 🚨 CRÍTICO: Fechar a lista após o delay para permitir o clique
      // 🚀 OTIMIZAÇÃO: No Web, o onMouseDown com preventDefault já cuida da maioria dos casos,
      // mas aumentamos o delay para garantir que o evento de click (onPress) também tenha tempo.
      const delay = Platform.OS === 'web' ? 500 : Platform.OS === 'android' ? 600 : 300;
      blurTimeoutRef.current = setTimeout(() => {
        // Se ainda estiver selecionando, NÃO fechar a lista ainda
        if (isSelectingRef.current) {
          console.log('⏳ [NameSelectField] Blur ignorado: seleção em curso...');
          return;
        }
        setShowList(false);
        blurTimeoutRef.current = null;
      }, delay);
    };

    const handleEndEditing = (event: any) => {
      const finalText = String(event?.nativeEvent?.text || '').trim();

      if (!finalText) {
        return;
      }

      if (isManualMode) {
        isUserTypingRef.current = true;
        setSearchText(finalText);
        onSelect({ id: 'manual', label: finalText, value: finalText, data: null });
      }
    };

    // Quando seleciona um item
    const handleSelect = (option: SelectOption) => {
      console.log('✅ [NameSelectField] handleSelect chamado:', {
        id: option.id,
        label: option.label,
        value: option.value,
      });

      // Marcar que está selecionando para evitar interferência do blur
      isSelectingRef.current = true;
      isUserTypingRef.current = false;

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
        setIsManualMode(true);
        // Preservar o texto atual como o nome manual
        const manualName = searchText.trim().toUpperCase();
        setSearchText(manualName);
        onSelect({ id: 'manual', label: manualName, value: manualName });
        isSelectingRef.current = false;
        // Focar no input após um pequeno delay
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
        return;
      }

      // Seleção normal da lista - ATUALIZAR TUDO IMEDIATAMENTE
      const selectedValue = option.value || option.id;
      console.log('📝 [NameSelectField] Selecionando nome:', {
        id: option.id,
        label: option.label,
        value: selectedValue,
      });

      // Atualizar o texto do input PRIMEIRO
      setSearchText(option.label);

      // Chamar onSelect IMEDIATAMENTE com o valor correto
      onSelect({
        id: option.id,
        label: option.label,
        value: selectedValue,
        data: option.data, // 🚨 CRÍTICO: Preservar dados originais (instrumento, etc)
      });

      const resetDelay = Platform.OS === 'android' ? 200 : 100;
      setTimeout(() => {
        isSelectingRef.current = false;
        if (inputRef.current) {
          inputRef.current.blur();
        }

        // 🚀 REMOVIDO: Não enviar automaticamente ao selecionar conforme pedido do usuário
        // Para garantir que o usuário veja o que selecionou antes de enviar
        /* if (onSubmit) {
        onSubmit();
      } */
      }, resetDelay);
    };

    // Handler para Enter/Submit
    const handleEnterPress = () => {
      if (isManualMode) {
        if (searchText.trim()) {
          onSelect({
            id: 'manual',
            label: searchText.trim(),
            value: searchText.trim(),
            data: null,
          });
          // Acionar submit imediatamente no modo manual se for fornecida a prop
          // 🚀 REMOVIDO: Não enviar com Enter no modo manual conforme pedido do usuário
          /* if (onSubmit) {
          setTimeout(() => onSubmit(), 150);
        } */
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

        // 🚨 CORREÇÃO: Só mudar para manual se lista já carregou (não está carregando E há opções)
        if (!encontrouNaLista && !loading && options && options.length > 0) {
          console.log(
            '✏️ [NameSelectField] Enter pressionado com texto não encontrado na lista, tratando como manual:',
            searchText
          );
          setIsManualMode(true);
          onSelect({
            id: 'manual',
            label: searchText.trim(),
            value: searchText.trim(),
            data: null,
          });
          // 🚀 REMOVIDO: Não enviar com Enter conforme pedido do usuário
          /* if (onSubmit) {
          setTimeout(() => onSubmit(), 150);
        } */
          if (inputRef.current) {
            inputRef.current.blur();
          }
        } else if (!encontrouNaLista && (!options || options.length === 0)) {
          setIsManualMode(true);
          onSelect({
            id: 'manual',
            label: searchText.trim(),
            value: searchText.trim(),
            data: null,
          });
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

    useEffect(() => {
      if (
        isFocused &&
        showOptionsOnFocus &&
        !isManualMode &&
        !searchText.trim() &&
        displayableOptions.length > 0
      ) {
        setShowList(true);
      }
    }, [isFocused, showOptionsOnFocus, isManualMode, searchText, displayableOptions]);

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
        {!!label && (
          <Text
            style={[
              styles.label,
              appearance === 'soft' && { textTransform: 'none', letterSpacing: 0.1 },
            ]}
          >
            {label}
          </Text>
        )}

        <View
          style={[
            styles.inputContainer,
            {
              position: 'relative' as ViewStyle['position'],
              overflow: 'visible' as ViewStyle['overflow'],
              zIndex: containerZIndex,
              ...(Platform.OS === 'web'
                ? {
                    backgroundColor: '#ffffff',
                  }
                : {}),
            },
          ]}
        >
          {/* Sempre usar o mesmo TextInput - mesma aparência sempre */}
          <>
            <View style={{ position: 'relative', flex: 1 }}>
              {leadingIcon && (
                <View
                  style={[styles.leadingIcon, { backgroundColor: iconColor + '12' }]}
                >
                  <FontAwesome5 solid name={leadingIcon as any} size={17} color={iconColor} />
                </View>
              )}
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  appearance === 'soft' && styles.softInput,
                  leadingIcon && { paddingLeft: 58 },
                  appearance === 'soft' && isFocused && styles.softFocused,
                  error ? styles.inputError : undefined,
                  isFocused ? { borderColor: theme.colors.primary, borderWidth: 1.5 } : undefined,
                  Platform.OS === 'web'
                    ? ({
                        position: 'relative' as ViewStyle['position'],
                        outlineStyle: 'none',
                        outlineWidth: 0,
                      } as any)
                    : undefined,
                ]}
                value={searchText}
                onChangeText={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onEndEditing={handleEndEditing}
                placeholder={
                  loading
                    ? 'Carregando nomes...'
                    : isManualMode
                      ? 'Digite o nome completo manualmente'
                      : placeholder
                }
                placeholderTextColor={theme.colors.textSecondary}
                returnKeyType="done"
                onSubmitEditing={handleEnterPress}
                autoCapitalize="words"
                editable={true}
                onKeyPress={e => {
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
              {loading && !isManualMode && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
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
                    {showList && filtered.length > 0 && (
                      <>
                        {/* Overlay transparente para fechar ao clicar fora */}
                        <TouchableOpacity
                          style={styles.mobileOverlay}
                          activeOpacity={1}
                          onPress={() => {
                            // Só fechar se não está selecionando
                            if (!isSelectingRef.current) {
                              setShowList(false);
                            }
                          }}
                          // 🚨 CRÍTICO: No Android, garantir que não interfira com toques nos itens
                          delayPressIn={Platform.OS === 'android' ? 200 : 0}
                          delayPressOut={Platform.OS === 'android' ? 100 : 0}
                        />
                        <View style={styles.mobileDropdownContainer}>
                          <View
                            style={styles.mobileDropdownContent}
                            onStartShouldSetResponder={() => false}
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
                                      onPress={e => {
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
                                      onPressIn={e => {
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
                                      onPressOut={e => {
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
                                      hitSlop={
                                        Platform.OS === 'android'
                                          ? { top: 30, bottom: 30, left: 25, right: 25 }
                                          : { top: 25, bottom: 25, left: 20, right: 20 }
                                      }
                                      // 🚨 CRÍTICO: Android precisa de delay menor para melhor responsividade
                                      delayPressIn={0}
                                      delayPressOut={Platform.OS === 'android' ? 100 : 0}
                                      delayLongPress={Platform.OS === 'android' ? 200 : 500}
                                    >
                                      <Text
                                        style={[
                                          styles.itemText,
                                          value === item.id &&
                                            !isManualOption &&
                                            styles.itemTextSelected,
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
                      <View style={styles.webDropdownContainer}>
                        <View
                          style={[
                            styles.dropdown,
                            Platform.OS === 'web'
                              ? {
                                  // @ts-ignore
                                  backgroundColor: '#ffffff',
                                  // @ts-ignore
                                  // @ts-ignore
                                  opacity: 1,
                                }
                              : {},
                          ]}
                          onStartShouldSetResponder={() => false}
                          onMoveShouldSetResponder={() => false}
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
                                    // 🚨 CRÍTICO: No Web, o onPress pode disparar após o onBlur
                                    // Só chamamos handleSelect se não foi capturado pelo onMouseDown
                                    if (!isSelectingRef.current) {
                                      handleSelect(item);
                                    }
                                  }}
                                  onPressIn={() => {
                                    // Marcar início da seleção
                                    isSelectingRef.current = true;
                                    // Cancelar blur imediatamente ao tocar (melhor para mobile)
                                    if (blurTimeoutRef.current) {
                                      clearTimeout(blurTimeoutRef.current);
                                      blurTimeoutRef.current = null;
                                    }
                                  }}
                                  activeOpacity={Platform.OS === 'web' ? 0.7 : 0.5}
                                  hitSlop={
                                    Platform.OS === 'web'
                                      ? undefined
                                      : { top: 10, bottom: 10, left: 10, right: 10 }
                                  }
                                  delayPressIn={0}
                                  {...(Platform.OS === 'web'
                                    ? {
                                        onMouseEnter: () => setSelectedIndex(index),
                                        onMouseLeave: () => setSelectedIndex(-1),
                                        onMouseDown: (e: any) => {
                                          // 🚨 CRÍTICO PARA WEB: Prevenir o blur do input ao clicar no dropdown
                                          e.preventDefault();
                                          // Cancelar blur pendente
                                          if (blurTimeoutRef.current) {
                                            clearTimeout(blurTimeoutRef.current);
                                            blurTimeoutRef.current = null;
                                          }
                                          // Marcar seleção
                                          isSelectingRef.current = true;
                                          // Selecionar o item IMEDIATAMENTE
                                          handleSelect(item);
                                        },
                                      }
                                    : {})}
                                >
                                  <Text
                                    style={[
                                      styles.itemText,
                                      value === item.id &&
                                        !isManualOption &&
                                        styles.itemTextSelected,
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

                    {/* Sem resultados: o campo vira manual; nao desenhar caixa vazia. */}
                  </>
                )}
              </>
            )}
          </>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }
);

NameSelectField.displayName = 'NameSelectField';

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
    ...(Platform.OS === 'web'
      ? {
          backgroundColor: '#ffffff',
        }
      : {}),
  },
  label: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  leadingIcon: {
    pointerEvents: 'none',
    position: 'absolute',
    left: 12,
    top: 11,
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  inputContainer: {
    position: 'relative' as ViewStyle['position'],
    width: '100%',
    ...(Platform.OS === 'web'
      ? {
          backgroundColor: '#ffffff',
          zIndex: 1,
        }
      : {}),
  },
  softInput: {
    backgroundColor: '#f5f8fb',
    borderColor: '#e1e9f1',
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 56,
    paddingVertical: 16,
    shadowOpacity: 0,
    elevation: 0,
  },
  softFocused: { borderColor: '#2a83b9', backgroundColor: '#ffffff' },
  input: {
    width: '100%',
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
    ...(Platform.OS === 'web'
      ? {
          backgroundColor: '#ffffff',
          // @ts-ignore
          opacity: 1,
        }
      : {}),
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  manualInput: {
    // Removido estilo de cor - campo deve ter aparência normal mesmo em modo manual
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
    ...(Platform.OS === 'web'
      ? ({
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
        } as any)
      : {}),
  },
  dropdown: {
    pointerEvents: 'auto',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    maxHeight: 300,
    marginTop: 8,
    ...theme.shadows.soft,
    overflow: 'hidden',
    zIndex: 999999,
    ...(Platform.OS === 'web'
      ? ({
          // @ts-ignore - propriedades CSS específicas do web
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
        } as any)
      : {}),
  },
  list: {
    maxHeight: 300,
    backgroundColor: '#ffffff',
    ...(Platform.OS === 'web'
      ? {
          backgroundColor: '#ffffff',
          // @ts-ignore
          // @ts-ignore
          zIndex: 999999,
        }
      : {}),
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
    ...(Platform.OS === 'web'
      ? {
          // @ts-ignore
          opacity: 1,
          // @ts-ignore
          position: 'relative',
          // @ts-ignore
          zIndex: 999999,
          // @ts-ignore
          willChange: 'transform',
        }
      : {
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
    // Removido animation
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
    ...(Platform.OS === 'android'
      ? {
          elevation: 0, // Não elevar o overlay para não bloquear toques
        }
      : {}),
  },
  mobileDropdownContainer: {
    position: 'absolute' as any,
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 999999,
    marginTop: 4,
    elevation: 999999,
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
