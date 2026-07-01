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
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';

interface SelectOption {
  id: string;
  label: string;
  value: unknown;
}

interface SimpleSelectFieldProps {
  label?: string;
  value?: string;
  options: SelectOption[];
  onSelect: (option: SelectOption) => void;
  placeholder?: string;
  error?: string;
  style?: any;
}

export interface SimpleSelectFieldRef {
  focus: () => void;
  blur: () => void;
}

export const SimpleSelectField = React.forwardRef<SimpleSelectFieldRef, SimpleSelectFieldProps>(
  (
    {
      label,
      value,
      options,
      onSelect,
      placeholder = 'Digite para buscar...',
      error,
      style,
    },
    ref
  ) => {
    const [searchText, setSearchText] = useState('');
    const [showList, setShowList] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<View>(null);
    const inputRef = useRef<TextInput>(null);
    const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const flatListRef = useRef<FlatList>(null);
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

    // Filtrar opções baseado no texto digitado
    const filtered = useMemo(() => {
      if (!options || options.length === 0) {
        return [];
      }

      if (!searchText.trim()) {
        return options;
      }

      const query = normalize(searchText);
      return options.filter(opt => {
        const labelNorm = normalize(opt.label);
        return labelNorm.includes(query);
      });
    }, [searchText, options]);

    // Sincronizar searchText com value quando muda externamente
    useEffect(() => {
      if (!options || options.length === 0) {
        if (!value) {
          setSearchText('');
        }
        return;
      }

      const currentOption = options.find(opt => opt.id === value || opt.value === value);
      if (currentOption) {
        setSearchText(currentOption.label);
      } else if (!value) {
        setSearchText('');
      }
    }, [value, options]);

    // Quando o usuário digita
    const handleChange = (text: string) => {
      setSearchText(text);
      setSelectedIndex(-1);
      if (text.trim().length > 0 || options.length > 0) {
        setShowList(true);
      } else {
        setShowList(false);
      }
    };

    // Quando o campo recebe foco
    const handleFocus = () => {
      setIsFocused(true);
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      if (options.length > 0) {
        setShowList(true);
      }
    };

    // Quando o campo perde foco
    const handleBlur = () => {
      setIsFocused(false);

      // Aumentamos o delay para garantir que toques/cliques no dropdown sejam processados antes do fechamento
      const delay = Platform.OS === 'web' ? 400 : 150;

      blurTimeoutRef.current = setTimeout(() => {
        if (!isSelectingRef.current) {
          setShowList(false);
        }
        blurTimeoutRef.current = null;
      }, delay);
    };

    // Quando seleciona um item
    const handleSelect = (option: SelectOption) => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }

      setSearchText(option.label);
      isSelectingRef.current = false;
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

    const renderOption = (item: SelectOption, index: number) => (
      <TouchableOpacity
        style={[
          styles.item,
          selectedIndex === index && styles.itemHighlighted,
          value === item.id && styles.itemSelected,
        ]}
        onPress={e => {
          if (Platform.OS !== 'web') {
            e.stopPropagation();
          }
          isSelectingRef.current = true;
          if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
          }
          handleSelect(item);
        }}
        onPressIn={e => {
          if (Platform.OS !== 'web') {
            e.stopPropagation();
          }
          isSelectingRef.current = true;
          if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
          }
        }}
        activeOpacity={0.7}
        {...(Platform.OS === 'web'
          ? {
              onMouseEnter: () => setSelectedIndex(index),
              onMouseLeave: () => setSelectedIndex(-1),
              onMouseDown: (e: any) => {
                e.preventDefault();
                if (blurTimeoutRef.current) {
                  clearTimeout(blurTimeoutRef.current);
                  blurTimeoutRef.current = null;
                }
                isSelectingRef.current = true;
                handleSelect(item);
              },
            }
          : {})}
      >
        <Text
          style={[
            styles.itemText,
            value === item.id && styles.itemTextSelected,
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {value === item.id && (
          <FontAwesome5
            name="check"
            size={12}
            color={theme.colors.primary}
            style={styles.checkIcon}
          />
        )}
      </TouchableOpacity>
    );

    // Handler para Enter/Submit
    const handleEnterPress = () => {
      if (showList && filtered.length > 0) {
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

    const containerZIndex = isFocused || showList ? theme.zIndex.DROPDOWN_FIELD_CONTAINER : 1;

    return (
      <View
        style={[
          styles.container,
          style,
          Platform.OS === 'web'
            ? {
                position: 'relative' as any,
                overflow: 'visible' as any,
                zIndex: containerZIndex,
              }
            : {
                overflow: 'visible' as any,
                zIndex: containerZIndex,
                elevation: isFocused ? 10 : 0,
              },
        ]}
        ref={containerRef}
        collapsable={false}
      >
        {!!label && <Text style={styles.label}>{label}</Text>}

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
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              error && styles.inputError,
              Platform.OS === 'web'
                ? {
                    position: 'relative' as ViewStyle['position'],
                    zIndex: 1,
                    // @ts-ignore - Propriedades CSS apenas para web
                    outlineStyle: 'none',
                    outlineWidth: 0,
                  }
                : {},
            ]}
            value={searchText}
            onChangeText={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
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
                        const nextIndex = selectedIndex < filtered.length - 1 ? selectedIndex + 1 : 0;
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
                        const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : filtered.length - 1;
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

          {/* Dropdown - Usar dropdown inline mesmo no mobile para não bloquear a tela */}
          {Platform.OS !== 'web' ? (
            <>
              {showList && filtered.length > 0 && (
                <>
                  {/* Overlay transparente para fechar ao clicar fora */}
                  <TouchableOpacity
                    style={styles.mobileOverlay}
                    activeOpacity={1}
                    onPress={() => {
                      if (!isSelectingRef.current) {
                        setShowList(false);
                      }
                    }}
                    delayPressIn={Platform.OS === 'android' ? 200 : 0}
                    delayPressOut={Platform.OS === 'android' ? 100 : 0}
                  />
                  <View style={styles.mobileDropdownContainer}>
                    <View
                      style={styles.mobileDropdownContent}
                      onStartShouldSetResponder={() => false}
                    >
                      <FlatList
                        ref={flatListRef}
                        data={filtered}
                        keyExtractor={item => item.id}
                        keyboardDismissMode="none"
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled={true}
                        scrollEnabled={true}
                        bounces={false}
                        overScrollMode={Platform.OS === 'android' ? 'never' : undefined}
                        renderItem={({ item, index }) => renderOption(item, index)}
                        style={styles.list}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={false}
                      />
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
                      styles.webDropdown,
                      {
                        backgroundColor: '#ffffff',
                        opacity: 1,
                      },
                    ]}
                    onStartShouldSetResponder={() => false}
                    onMoveShouldSetResponder={() => false}
                    pointerEvents="auto"
                    {...(Platform.OS === 'web'
                      ? {
                          onMouseEnter: () => {
                            if (blurTimeoutRef.current) {
                              clearTimeout(blurTimeoutRef.current);
                              blurTimeoutRef.current = null;
                            }
                          },
                          onMouseDown: (e: React.MouseEvent) => {
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
                      renderItem={({ item, index }) => renderOption(item, index)}
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
            </>
          )}
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }
);

SimpleSelectField.displayName = 'SimpleSelectField';

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
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
    position: 'relative' as any,
    ...(Platform.OS === 'web'
      ? {
          position: 'relative',
          zIndex: 1,
        }
      : {}),
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
    ...(Platform.OS === 'web'
      ? {
          // @ts-ignore - Propriedades CSS apenas para web
          outlineStyle: 'none',
          outlineWidth: 0,
        }
      : {}),
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  webDropdownContainer: {
    position: 'absolute' as any,
    top: '100%',
    left: 0,
    right: 0,
    zIndex: theme.zIndex.DROPDOWN_FIELD_DROPDOWN,
    marginTop: 4,
    ...(Platform.OS === 'web'
      ? {
          // @ts-ignore
          display: 'flex',
          // @ts-ignore
          visibility: 'visible',
          opacity: 1,
          // @ts-ignore
          zIndex: theme.zIndex.DROPDOWN_FIELD_DROPDOWN,
          // @ts-ignore
          pointerEvents: 'auto',
        }
      : {}),
  },
  webDropdown: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: theme.zIndex.DROPDOWN_FIELD_DROPDOWN,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
          backgroundColor: '#ffffff',
          // @ts-ignore
          display: 'flex',
          // @ts-ignore
          visibility: 'visible',
          opacity: 1,
          // @ts-ignore
          zIndex: theme.zIndex.DROPDOWN_FIELD_DROPDOWN,
          // @ts-ignore
          position: 'relative',
        }
      : {}),
  },
  list: {
    maxHeight: 300,
    backgroundColor: '#ffffff',
  },
  item: {
    paddingVertical: Platform.OS === 'web' ? theme.spacing.md : theme.spacing.xl, // Mais padding no mobile
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: Platform.OS === 'web' ? 48 : 64, // Aumentado no mobile
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    ...(Platform.OS === 'web'
      ? {
          backgroundColor: '#ffffff',
          // @ts-ignore
          opacity: 1,
          // @ts-ignore
          position: 'relative',
          // @ts-ignore
          zIndex: theme.zIndex.DROPDOWN_FIELD_DROPDOWN,
        }
      : {
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
  checkIcon: {
    marginLeft: theme.spacing.xs,
  },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  mobileOverlay: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: -1000, // Estender para baixo para capturar cliques
    zIndex: 999998,
    backgroundColor: 'transparent',
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
    maxHeight: 300,
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
