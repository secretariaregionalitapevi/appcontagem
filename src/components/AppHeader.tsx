import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, Dimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { localStorageService } from '../services/localStorageService';
import { showToast } from '../utils/toast';
import { LocalEnsaio } from '../types/models';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 400;
const IS_MEDIUM_SCREEN = SCREEN_WIDTH >= 400 && SCREEN_WIDTH < 768;

interface AppHeaderProps {
  onSettingsPress?: () => void;
  onLogoutPress?: () => void;
  onEditRegistrosPress?: () => void;
  onOrganistasEnsaioPress?: () => void;
  onBackPress?: () => void;
  title?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onSettingsPress,
  onLogoutPress,
  onEditRegistrosPress,
  onOrganistasEnsaioPress,
  onBackPress,
  title,
}) => {
  const { user, signOut } = useAuthContext();
  const [localEnsaio, setLocalEnsaio] = React.useState<string>('');

  React.useEffect(() => {
    loadLocalEnsaio();
  }, []);


  const loadLocalEnsaio = async () => {
    try {
      const localId = await localStorageService.getLocalEnsaio();
      if (localId) {
        // Buscar nome do local a partir do ID
        const locais: LocalEnsaio[] = [
          { id: '1', nome: 'Cotia' },
          { id: '2', nome: 'Caucaia do Alto' },
          { id: '3', nome: 'Fazendinha' },
          { id: '4', nome: 'Itapevi' },
          { id: '5', nome: 'Jandira' },
          { id: '6', nome: 'Pirapora' },
          { id: '7', nome: 'Vargem Grande' },
        ];
        const localEncontrado = locais.find(l => l.id === localId);
        setLocalEnsaio(localEncontrado?.nome || localId);
      } else {
        setLocalEnsaio('Ensaio Regional Itapevi');
      }
    } catch (error) {
      console.error('Erro ao carregar local de ensaio:', error);
      setLocalEnsaio('Ensaio Regional Itapevi');
    }
  };

  const handleLogout = async () => {
    try {
      // Mostrar feedback visual
      showToast.info('Saindo...', 'Encerrando sessão...');

      // Se há callback customizado, usar ele
      if (onLogoutPress) {
        onLogoutPress();
        return;
      }

      // Executar logout
      await signOut();

      // Feedback de sucesso
      showToast.success('Logout realizado', 'Sessão encerrada com sucesso');

      // O AppNavigator já vai reagir automaticamente ao estado user mudar para null
      // e mostrar a tela de Login
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      showToast.error('Erro', 'Erro ao encerrar sessão. Tente novamente.');
    }
  };

  // Formatar nome do usuário (primeiro e último nome)
  const formatUserName = (name: string | undefined): string => {
    if (!name) return 'Usuário';
    const parts = name
      .trim()
      .split(' ')
      .filter(p => p.length > 0);
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[parts.length - 1]}`;
    }
    return parts[0] || 'Usuário';
  };

  // Obter nome completo do usuário (não usar email)
  const getUserDisplayName = (): string => {
    if (user?.nome && user.nome.trim()) {
      return formatUserName(user.nome);
    }
    // Se não tem nome, não usar email - usar "Usuário"
    return 'Usuário';
  };

  // Verificar se é master/admin (normalizar role para comparação)
  const userRole = user?.role ? String(user.role).toLowerCase().trim() : 'user';
  const isMaster = userRole === 'master' || userRole === 'admin';
  const userRoleText = isMaster ? 'Administrador' : 'Usuário';

  const userName = getUserDisplayName();


  return (
    <View style={styles.header}>
      {/* Primeira linha: Logo, Título e Botões */}
      <View style={styles.headerTopRow}>
        <View style={styles.headerLeftSection}>
          <View style={styles.brandSection}>
            <View style={[styles.brandLogo, IS_SMALL_SCREEN && styles.brandLogoSmall]}>
              <Image 
                source={require('../img/ccb.png')} 
                style={styles.brandLogoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.brandText}>
              <Text style={[styles.brandTitle, IS_SMALL_SCREEN && styles.brandTitleSmall]} numberOfLines={1}>
                {title || 'Registro de Presença'}
              </Text>
              {!IS_SMALL_SCREEN && (
                <View style={styles.brandSubtitleContainer}>
                  <FontAwesome5 name="map-marker-alt" size={10} color="#ff6b6b" />
                  <Text style={styles.brandSubtitle} numberOfLines={1}>{localEnsaio}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Botões de ação - sempre na direita */}
        <View style={[styles.headerActions, IS_SMALL_SCREEN && styles.headerActionsSmall]}>
          {onBackPress && (
            <TouchableOpacity
              style={[styles.actionBtn, IS_SMALL_SCREEN && styles.actionBtnSmall]}
              onPress={onBackPress}
              activeOpacity={0.7}
            >
              <FontAwesome5 name="arrow-left" size={IS_SMALL_SCREEN ? 12 : 14} color="#a7b1c2" />
            </TouchableOpacity>
          )}
          {onOrganistasEnsaioPress && (
            <TouchableOpacity
              style={[styles.actionBtn, IS_SMALL_SCREEN && styles.actionBtnSmall, styles.organistaBtn]}
              onPress={(e) => {
                console.log('🎹 [AppHeader] Botão de organistas clicado!');
                console.log('🎹 [AppHeader] onOrganistasEnsaioPress disponível?', !!onOrganistasEnsaioPress);
                console.log('🎹 [AppHeader] Tipo de onOrganistasEnsaioPress:', typeof onOrganistasEnsaioPress);
                try {
                  if (onOrganistasEnsaioPress) {
                    onOrganistasEnsaioPress();
                    console.log('✅ [AppHeader] onOrganistasEnsaioPress chamado com sucesso');
                  } else {
                    console.error('❌ [AppHeader] onOrganistasEnsaioPress é null/undefined');
                  }
                } catch (error) {
                  console.error('❌ [AppHeader] Erro ao chamar onOrganistasEnsaioPress:', error);
                }
              }}
              activeOpacity={0.7}
            >
              <FontAwesome5 name="music" size={IS_SMALL_SCREEN ? 16 : 18} color="#ffffff" />
            </TouchableOpacity>
          )}
          {isMaster && onEditRegistrosPress && (
            <TouchableOpacity
              style={[styles.actionBtn, IS_SMALL_SCREEN && styles.actionBtnSmall]}
              onPress={onEditRegistrosPress}
              activeOpacity={0.7}
            >
              <FontAwesome5 name="edit" size={IS_SMALL_SCREEN ? 12 : 14} color="#a7b1c2" />
            </TouchableOpacity>
          )}
          {onSettingsPress && (
            <TouchableOpacity
              style={[styles.actionBtn, IS_SMALL_SCREEN && styles.actionBtnSmall]}
              onPress={onSettingsPress}
              activeOpacity={0.7}
            >
              <FontAwesome5 name="cog" size={IS_SMALL_SCREEN ? 12 : 14} color="#a7b1c2" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.actionBtn, IS_SMALL_SCREEN && styles.actionBtnSmall]} 
            onPress={handleLogout} 
            activeOpacity={0.6}
          >
            <FontAwesome5 name="sign-out-alt" size={IS_SMALL_SCREEN ? 12 : 14} color="#a7b1c2" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Segunda linha (apenas em telas pequenas): Local */}
      {IS_SMALL_SCREEN && (
        <View style={styles.headerSecondRow}>
          <View style={styles.headerSecondRowContent}>
            <View style={styles.brandSubtitleContainer}>
              <FontAwesome5 name="map-marker-alt" size={10} color="#ff6b6b" />
              <Text style={styles.brandSubtitle} numberOfLines={1}>{localEnsaio}</Text>
            </View>
          </View>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#2f4050',
    paddingTop: Platform.OS === 'ios' ? 40 : 8,
    paddingBottom: IS_SMALL_SCREEN ? 6 : 8,
    paddingHorizontal: IS_SMALL_SCREEN ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#293846',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerSecondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 0,
    marginTop: 4, // Espaçamento adicional
  },
  headerSecondRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    // Alinhar com o título: logo width (28 em small, 35 normal) + gap (8 em small, 12 normal)
    marginLeft: IS_SMALL_SCREEN ? 36 : 47,
  },
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_SMALL_SCREEN ? 8 : 12,
    flex: 1,
    minWidth: 0,
  },
  brandLogo: {
    width: 35,
    height: 35,
    backgroundColor: '#ffffff',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  brandLogoSmall: {
    width: 28,
    height: 28,
  },
  brandLogoImage: {
    width: '100%',
    height: '100%',
  },
  brandText: {
    flexDirection: 'column',
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 20,
  },
  brandTitleSmall: {
    fontSize: 14,
    lineHeight: 16,
  },
  brandSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
    flexShrink: 1,
  },
  userInfoBelowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  userAvatar: {
    width: IS_SMALL_SCREEN ? 24 : 30,
    height: IS_SMALL_SCREEN ? 24 : 30,
    backgroundColor: '#033d60',
    borderRadius: IS_SMALL_SCREEN ? 12 : 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  userDetails: {
    flexDirection: 'column',
    gap: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 14,
    maxWidth: IS_MEDIUM_SCREEN ? 80 : 100,
  },
  userNameSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 13,
    maxWidth: 80,
  },
  userRole: {
    fontSize: 10,
    color: '#a7b1c2',
    lineHeight: 12,
    maxWidth: IS_MEDIUM_SCREEN ? 80 : 100,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_SMALL_SCREEN ? 4 : 6,
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  headerActionsSmall: {
    gap: 4,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  actionBtnSmall: {
    width: 36,
    height: 36,
    minWidth: 36,
    minHeight: 36,
    borderRadius: 6,
  },
  organistaBtn: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)', // Cor destacada para organistas
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - Propriedades CSS apenas para web
      cursor: 'pointer',
      // @ts-ignore
      userSelect: 'none',
      // @ts-ignore
      WebkitUserSelect: 'none',
      // @ts-ignore
      MozUserSelect: 'none',
      // @ts-ignore
      msUserSelect: 'none',
      // @ts-ignore
      pointerEvents: 'auto',
      // @ts-ignore
      zIndex: 1000,
    } : {}),
  },
});
