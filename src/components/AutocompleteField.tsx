import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Modal,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';

const { DROPDOWN_FIELD_CONTAINER, DROPDOWN_FIELD_INPUT, DROPDOWN_FIELD_DROPDOWN } = theme.zIndex;

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

interface AutocompleteOption {
  id: string;
  label: string;
  value: unknown;
  nomeCompleto?: string;
}

interface AutocompleteFieldProps {
  label?: string;
  value?: string;
  options: AutocompleteOption[];
  onSelect: (option: AutocompleteOption) => void;
  placeholder?: string;
  icon?: string;
  error?: string;
  style?: ViewStyle;
}

export const AutocompleteField: React.FC<AutocompleteFieldProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Digite para buscar...',
  icon = 'map-marker-alt',
  error,
  style,
}) => {
  const [searchText, setSearchText] = useState('');
  const [showList, setShowList] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<View>(null);
  const inputRef = useRef<TextInput>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Normalizar texto (remove acentos, converte para minúscula)
  const normalize = (text: string) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // Filtrar opções baseado no texto digitado
  const filtered = React.useMemo(() => {
    if (!searchText.trim()) {
      return [];
    }

    // Mostrar resultados mesmo com 1 caractere para melhor UX
    const query = normalize(searchText);
    const results = options.filter(opt => {
      const labelNorm = normalize(opt.label);
      const nomeNorm = opt.nomeCompleto ? normalize(opt.nomeCompleto) : '';
      return labelNorm.includes(query) || nomeNorm.includes(query);
    });
    console.log('🔍 AutocompleteField - Filtro:', {
      searchText,
      query,
      totalOptions: options.length,
      filteredCount: results.length,
      firstResults: results.slice(0, 5).map(r => r.label)
    });
    return results;
  }, [searchText, options]);

  // Sincronizar searchText com value quando muda externamente
  useEffect(() => {
    const currentOption = options.find(opt => opt.id === value);
    if (currentOption) {
      setSearchText(currentOption.label);
    } else if (!value) {
      setSearchText('');
    }
  }, [value, options]);

  // Quando o usuário digita
  const handleChange = (text: string) => {
    setSearchText(text);
    setSelectedIndex(-1); // Reset seleção ao digitar
    // Cancelar blur pendente ao digitar
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    // Mostrar lista mesmo com 1 caractere se houver resultados
    if (text.trim().length >= 1) {
      setShowList(true);
      console.log('🔍 AutocompleteField - Texto digitado:', text, 'Mostrando lista');
    } else {
      setShowList(false);
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
    // Mostrar lista se houver texto digitado
    if (searchText.trim().length >= 1) {
      setShowList(true);
    }
  };

  // Quando o campo perde foco
  const handleBlur = () => {
    setIsFocused(false);
    // Delay muito maior no web para permitir clique com mouse
    // O mouse precisa de mais tempo porque o blur acontece antes do click
    const delay = Platform.OS === 'web' ? 500 : Platform.OS === 'android' ? 500 : 300;
    blurTimeoutRef.current = setTimeout(() => {
      setShowList(false);
      blurTimeoutRef.current = null;
    }, delay);
  };

  // Quando seleciona um item
  const handleSelect = (option: AutocompleteOption) => {
    // Cancelar blur pendente
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    setSearchText(option.label);
    setShowList(false);
    setSelectedIndex(-1);
    onSelect(option);

    // Blur do input após seleção
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }, 100);
  };

  // Handler para tecla Enter (web) ou submit (mobile)
  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    // Web: verificar tecla Enter
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
      e.preventDefault();
      handleEnterPress();
    }
  };

  // Handler para Enter/Submit
  const handleEnterPress = () => {
    // Se há lista visível e resultados filtrados
    if (showList && filtered.length > 0) {
      // Selecionar primeiro item se nenhum estiver selecionado
      const indexToSelect = selectedIndex >= 0 ? selectedIndex : 0;
      const optionToSelect = filtered[indexToSelect];

      if (optionToSelect) {
        handleSelect(optionToSelect);
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

  // Z-index MUITO ALTO para aparecer acima de TUDO em TODAS as plataformas
  const containerZIndex = isFocused ? 99999 : 1;
  const dropdownZIndex = 999999; // Z-index extremamente alto para garantir que apareça acima de tudo

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
          ].filter(Boolean)}
          value={searchText}
          onChangeText={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          returnKeyType="done"
          onSubmitEditing={handleEnterPress}
          {...(Platform.OS === 'web'
            ? {
                onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleEnterPress();
                  } else if (e.key === 'ArrowDown') {
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
                  } else if (e.key === 'ArrowUp') {
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

        {/* Dropdown - Modal no mobile, inline no web mas com z-index muito alto */}
        {(() => {
          const shouldShow = showList && filtered.length > 0;
          const isWebDesktop = Platform.OS === 'web' && !isMobileDevice();
          if (shouldShow) {
            console.log('🔍 AutocompleteField - Renderizando dropdown:', {
              showList,
              filteredLength: filtered.length,
              shouldShow,
              isWebDesktop,
              PlatformOS: Platform.OS,
              isMobile: isMobileDevice(),
              searchText
            });
          }
          return shouldShow;
        })() && (
          Platform.OS === 'web' && !isMobileDevice() ? (
            <View
              style={[
                styles.dropdown,
                {
                  zIndex: dropdownZIndex,
                  ...(Platform.OS === 'web' ? {
                    // Forçar fundo opaco no web usando estilos inline
                    // @ts-ignore
                    backgroundColor: '#ffffff',
                    // @ts-ignore
                    background: '#ffffff',
                    // @ts-ignore
                    backgroundImage: 'none',
                    // @ts-ignore
                    backgroundClip: 'padding-box',
                  } : {}),
                },
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
              <View style={styles.dropdownInner}>
                {filtered.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.item,
                      index === selectedIndex && styles.itemSelected,
                      Platform.OS === 'web' ? {
                        // Forçar fundo opaco em cada item
                        // @ts-ignore
                        backgroundColor: index === selectedIndex 
                          ? theme.colors.primary + '15' 
                          : '#ffffff',
                        // @ts-ignore
                        background: index === selectedIndex 
                          ? theme.colors.primary + '15' 
                          : '#ffffff',
                        // @ts-ignore
                        backgroundImage: 'none',
                      } : {},
                    ]}
                    onPress={() => {
                      // Cancelar blur pendente ao clicar
                      if (blurTimeoutRef.current) {
                        clearTimeout(blurTimeoutRef.current);
                        blurTimeoutRef.current = null;
                      }
                      setSelectedIndex(index);
                      handleSelect(item);
                    }}
                    activeOpacity={0.7}
                  >
                    <FontAwesome5
                      name={icon}
                      size={12}
                      color={theme.colors.textSecondary}
                      style={styles.icon}
                    />
                    <Text style={styles.itemText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            // MOBILE: SEMPRE usar Modal para evitar sobreposição
            <Modal
              visible={showList && filtered.length > 0}
              transparent={true}
              animationType="slide"
              onRequestClose={() => {
                setShowList(false);
                if (inputRef.current) {
                  inputRef.current.blur();
                }
              }}
              statusBarTranslucent={true}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => {
                  setShowList(false);
                  if (inputRef.current) {
                    inputRef.current.blur();
                  }
                }}
              >
                <SafeAreaView style={styles.modalContainer}>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                  >
                    <View style={styles.modalDropdown}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{label || 'Selecione uma opção'}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setShowList(false);
                            if (inputRef.current) {
                              inputRef.current.blur();
                            }
                          }}
                          style={styles.modalCloseButton}
                        >
                          <FontAwesome5 name="times" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                      </View>
                      <FlatList
                        ref={flatListRef}
                        data={filtered}
                        keyExtractor={item => item.id}
                        renderItem={({ item, index }) => (
                          <TouchableOpacity
                            style={[styles.modalItem, index === selectedIndex && styles.itemSelected]}
                            onPress={() => {
                              setSelectedIndex(index);
                              handleSelect(item);
                              setShowList(false);
                              if (inputRef.current) {
                                inputRef.current.blur();
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <FontAwesome5
                              name={icon}
                              size={14}
                              color={theme.colors.textSecondary}
                              style={styles.icon}
                            />
                            <Text style={styles.modalItemText}>{item.label}</Text>
                          </TouchableOpacity>
                        )}
                        style={styles.modalList}
                        keyboardShouldPersistTaps="handled"
                        initialNumToRender={20}
                        maxToRenderPerBatch={20}
                        windowSize={10}
                      />
                    </View>
                  </TouchableOpacity>
                </SafeAreaView>
              </TouchableOpacity>
            </Modal>
          )
        )}

        {/* Mensagem quando não há resultados */}
        {showList && filtered.length === 0 && searchText.trim().length >= 1 && (
          <View style={styles.dropdown}>
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhum resultado encontrado</Text>
            </View>
          </View>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
    ...(Platform.OS === 'web' ? {
      backgroundColor: '#ffffff',
      position: 'relative' as ViewStyle['position'],
    } : {}),
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
    zIndex: 1,
    ...(Platform.OS === 'web' ? {
      position: 'relative' as any,
      overflow: 'visible' as any,
      zIndex: 1,
    } : {}),
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#ffffff',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    minHeight: 48,
    ...(Platform.OS === 'web' ? {
      backgroundColor: '#ffffff',
      opacity: 1,
    } : {}),
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  dropdown: {
    position: 'absolute' as ViewStyle['position'],
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    maxHeight: 300,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 999999,
    overflow: 'hidden',
    zIndex: 999999,
    ...(Platform.OS === 'web' ? {
      backgroundColor: '#ffffff',
      opacity: 1,
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
      zIndex: 999999,
    } : {}),
  },
  dropdownInner: {
    backgroundColor: '#ffffff',
    maxHeight: 300,
    overflow: 'scroll',
    width: '100%',
    ...(Platform.OS === 'web' ? {
      backgroundColor: '#ffffff',
      opacity: 1,
      // @ts-ignore
      background: '#ffffff',
      // @ts-ignore
      backgroundImage: 'none',
    } : {}),
  },
  list: {
    maxHeight: 300,
    backgroundColor: '#ffffff',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 44,
    backgroundColor: '#ffffff',
    ...(Platform.OS === 'web' ? {
      backgroundColor: '#ffffff',
      // @ts-ignore
      background: '#ffffff',
      opacity: 1,
    } : {}),
  },
  itemSelected: {
    backgroundColor: theme.colors.primary + '15',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  icon: {
    marginRight: 12,
    minWidth: 20,
  },
  itemText: {
    fontSize: theme.fontSize.md,
    color: '#333333',
    fontWeight: '500',
    flex: 1,
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
  // Estilos para Modal no mobile
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 99999,
    elevation: 99999,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 99999,
    elevation: 99999,
  },
  modalDropdown: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 99999,
    zIndex: 99999,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  modalCloseButton: {
    padding: theme.spacing.xs,
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 56,
    backgroundColor: '#ffffff',
  },
  modalItemText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
});
