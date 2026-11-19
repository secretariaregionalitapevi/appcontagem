import React from 'react';
import { Alert, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { triggerHaptic } from '../utils/haptics';

interface RegisterBottomBarProps {
  activeTab?: 'home' | 'records' | 'organists';
  onHomePress?: () => void;
  onEditRegistrosPress: () => void;
  onOrganistasEnsaioPress: () => void;
}

// A sibling of the scrolling form: always visible without covering its content.
export const RegisterBottomBar: React.FC<RegisterBottomBarProps> = ({
  activeTab = 'home',
  onHomePress,
  onEditRegistrosPress,
  onOrganistasEnsaioPress,
}) => {
  const { user, signOut } = useAuthContext();
  const role = String(user?.role || 'user')
    .toLowerCase()
    .trim();
  const canEdit = role === 'master' || role === 'admin';
  const items: {
    label: string;
    icon: React.ComponentProps<typeof FontAwesome5>['name'];
    color: string;
    background: string;
    selected?: boolean;
    onPress?: () => void;
  }[] = [
    {
      label: 'Início',
      icon: 'home',
      color: '#1684dc',
      background: '#e8f3ff',
      selected: activeTab === 'home',
      onPress: activeTab === 'home' ? undefined : onHomePress,
    },
    ...(canEdit
      ? [
          {
            label: 'Editar',
            color: '#1675c3',
            background: '#e9f3fc',
            icon: 'file-alt',
            selected: activeTab === 'records',
            onPress: activeTab === 'records' ? undefined : onEditRegistrosPress,
          },
        ]
      : []),
    {
      label: 'Organistas',
      icon: 'music',
      selected: activeTab === 'organists',
      color: '#8552cc',
      background: '#f2ecfc',
      onPress: activeTab === 'organists' ? undefined : onOrganistasEnsaioPress,
    },
    {
      label: 'Atualizar',
      icon: 'sync-alt',
      color: '#079c98',
      background: '#e6f7f4',
      onPress: () => {
        if (Platform.OS === 'web') window.location.reload();
        else
          Alert.alert(
            'Atualizar',
            'Para atualizar no celular, feche o aplicativo deslizando para cima e abra novamente.'
          );
      },
    },
    {
      label: 'Sair',
      icon: 'sign-out-alt',
      color: '#dc5265',
      background: '#fff0f2',
      onPress: () => {
        void signOut();
      },
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.bar} accessibilityRole="tablist">
        {items.map(item => (
          <Pressable
            key={item.label}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: !!item.selected }}
            onPress={
              item.onPress
                ? () => {
                    triggerHaptic('light');
                    item.onPress?.();
                  }
                : undefined
            }
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: item.background },
                item.selected && styles.selectedIcon,
              ]}
            >
              <FontAwesome5
                solid
                name={item.icon}
                size={22}
                color={item.selected ? '#ffffff' : item.color}
              />
            </View>
            <Text style={[styles.label, item.selected && styles.selectedLabel]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flexShrink: 0,
    backgroundColor: '#f5f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e9ee',
    ...(Platform.OS === 'web' ? { paddingBottom: 'env(safe-area-inset-bottom, 0px)' as any } : {}),
  },
  bar: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 10,
  },
  tab: {
    flex: 1,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 16,
  },
  iconContainer: {
    width: 62,
    height: 34,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIcon: { backgroundColor: '#0867a8' },
  label: { fontSize: 12, lineHeight: 17, color: '#40525f', fontWeight: '500' },
  selectedLabel: { color: '#07538a', fontWeight: '700' },
  pressed: { backgroundColor: '#e4edf3', opacity: 0.8 },
});
