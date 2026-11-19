import { setPwaUpdateBlock } from '../services/pwaUpdateSafety';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import {
  attachLocationReview,
  finishLocationReview,
  LocationReviewRequest,
} from '../services/locationReview';
import { locationSafetyService } from '../services/locationSafetyService';
import { getEnsaioVenues } from '../config/ensaioVenues';
import { LocationMap } from './LocationMap';

export const LocationReviewHost: React.FC = () => {
  const [request, setRequest] = useState<LocationReviewRequest | null>(null);
  const [selected, setSelected] = useState(''),
    [all, setAll] = useState(false),
    [checking, setChecking] = useState(false);
  const { width, height } = useWindowDimensions();
  const mobile = width < 600;
  const compact = mobile || height < 650;
  const mapHeight = compact ? Math.max(140, Math.min(200, Math.round(height * 0.25))) : 264;
  useEffect(() => attachLocationReview(setRequest), []);
  useEffect(() => {
    setPwaUpdateBlock('location-review', Boolean(request));
    return () => setPwaUpdateBlock('location-review', false);
  }, [request]);
  useEffect(
    () =>
      locationSafetyService.subscribe(() => {
        const latest = locationSafetyService.snapshot();
        setRequest(previous =>
          previous &&
          latest?.selected.id === previous.assessment.selected.id &&
          latest.date === previous.assessment.date
            ? { ...previous, assessment: latest }
            : previous
        );
      }),
    []
  );
  useEffect(() => {
    if (request) {
      setSelected(
        request.automatic
          ? request.assessment.geo.suggested?.id || request.assessment.selected.id
          : request.assessment.selected.id
      );
      setAll(false);
    }
  }, [request?.automatic, request?.assessment.selected.id]);
  if (!request) return null;
  const assessment = request.assessment,
    original = assessment.selected,
    suggested = assessment.geo.suggested,
    nearest = suggested || assessment.geo.nearest;
  const chosen = locationSafetyService.resolve(selected) || original;
  const different = assessment.geo.status === 'mismatch';
  const options = all
    ? getEnsaioVenues()
    : [original, ...(nearest && nearest.id !== original.id ? [nearest] : [])];
  const recheck = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await locationSafetyService.inspect(original.id, assessment.date, true);
    } finally {
      setChecking(false);
    }
  };
  const confirmationFooter = (
    <View style={[styles.footer, compact && styles.compactFooter]}>
      <View style={styles.presenceAlert} accessibilityRole="alert">
        <FontAwesome5 solid name="exclamation-triangle" size={18} color="#b77913" />
        <View style={{ flex: 1 }}>
          <Text style={styles.presenceTitle}>Confirme sua presença no local</Text>
          <Text style={styles.presenceText}>
            Você está fisicamente em <Text style={styles.presenceVenue}>{chosen.nome}</Text>? Ao
            confirmar, os registros serão enviados para essa localidade.
          </Text>
        </View>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => finishLocationReview({ venueId: chosen.id })}
        style={styles.primary}
      >
        <FontAwesome5 solid name="check" size={16} color="#ffffff" />
        <Text style={styles.primaryText}>{`Sim, estou em ${chosen.nome}`}</Text>
      </TouchableOpacity>
      {chosen.id !== original.id && (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => finishLocationReview({ venueId: original.id })}
          style={styles.keep}
        >
          <Text style={styles.keepText}>Confirmar mesmo assim em {original.nome}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => finishLocationReview(null)}
    >
      <View style={[styles.overlay, mobile && styles.mobileOverlay]}>
        <SafeAreaView
          style={[
            styles.sheet,
            { maxHeight: height - (mobile ? 32 : 48) },
            mobile && styles.mobileSheet,
          ]}
          accessibilityViewIsModal
        >
          <View style={[styles.header, compact && styles.compactHeader]}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
              <Text style={styles.eyebrow}>LOCAL DO ENSAIO</Text>
              <Text style={[styles.heading, compact && styles.compactHeading]}>
                {request.automatic && different
                  ? 'Localização divergente'
                  : request.entry
                    ? assessment.geo.status === 'near'
                      ? 'Confirme o local do ensaio'
                      : assessment.geo.approximate
                        ? 'Localização aproximada'
                        : 'Não foi possível validar o GPS'
                    : 'Onde vamos contar?'}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Fechar mapa"
              onPress={() => finishLocationReview(null)}
              style={styles.close}
            >
              <FontAwesome5 solid name="times" size={17} color="#668095" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.scroll}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            <View style={[styles.mapFrame, compact && styles.compactMapFrame]}>
              <LocationMap venue={original} position={assessment.position} height={mapHeight} />
            </View>
            <View style={[styles.body, compact && styles.compactBody]}>
              <View style={styles.summary}>
                <View style={[styles.summaryIcon, !different && { backgroundColor: '#e8f3ff' }]}>
                  <FontAwesome5
                    solid
                    name={different ? 'location-arrow' : 'map-marker-alt'}
                    size={17}
                    color={different ? '#df5870' : '#1684dc'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryTitle}>
                    {different && suggested ? `Perto de ${suggested.nome}` : original.nome}
                  </Text>
                  <Text style={styles.description}>
                    {different
                      ? `Seu GPS está a ${(assessment.geo.distance! / 1000).toFixed(1)} km de ${original.nome}. Confira antes de continuar.`
                      : assessment.geo.status === 'near'
                        ? 'Sua posição é compatível com este ensaio.'
                        : assessment.geo.approximate
                          ? nearest
                            ? 'O navegador forneceu uma posição aproximada. Confira a sugestão abaixo.'
                            : 'A posição recebida tem pouca precisão para sugerir um ensaio. Tente atualizar.'
                          : assessment.reason === 'denied'
                            ? 'Permita o acesso à localização para comparar com o ensaio.'
                            : assessment.reason === 'insecure'
                              ? 'A verificação do GPS requer uma conexão HTTPS.'
                              : 'Sem uma posição precisa. Atualize o GPS ou confirme o destino.'}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Atualizar posição"
                  disabled={checking}
                  onPress={recheck}
                  style={styles.refresh}
                >
                  {checking ? (
                    <ActivityIndicator size="small" color="#1684dc" />
                  ) : (
                    <FontAwesome5 solid name="crosshairs" size={18} color="#1684dc" />
                  )}
                </TouchableOpacity>
              </View>
              {nearest && (
                <View style={styles.suggestion} accessibilityRole="alert">
                  <View style={styles.suggestionIcon}>
                    <FontAwesome5 solid name="map-marked-alt" size={19} color="#138367" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.suggestionLabel}>
                      {assessment.geo.approximate
                        ? 'SUGESTÃO POR LOCALIZAÇÃO APROXIMADA'
                        : 'ENSAIO MAIS PRÓXIMO DO GPS'}
                    </Text>
                    <Text style={styles.suggestionText}>
                      Pela sua localização, o ensaio sugerido é{' '}
                      <Text style={styles.suggestionVenue}>{nearest.nome}</Text>.
                    </Text>
                    <Text style={styles.suggestionHint}>
                      {assessment.geo.approximate
                        ? `Margem de erro de até ${(assessment.position!.accuracy / 1000).toFixed(1)} km. Confirme o local; essa leitura não comprova presença.`
                        : suggested
                          ? 'Sua posição está próxima deste ensaio. Selecione-o abaixo para confirmar.'
                          : `Aprox. ${((assessment.geo.nearestDistance || 0) / 1000).toFixed(1)} km do GPS. Confira se este é o destino da contagem.`}
                    </Text>
                  </View>
                </View>
              )}
              {assessment.position && Boolean(nearest) && (
                <View style={styles.coordinates}>
                  <View style={styles.coordinateRow}>
                    <View style={[styles.coordinateDot, { backgroundColor: '#3b82f6' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.coordinateLabel}>
                        Seu GPS · precisão ±{Math.round(assessment.position.accuracy)} m
                      </Text>
                      <Text selectable style={styles.coordinateValue}>
                        {assessment.position.latitude.toFixed(5)},{' '}
                        {assessment.position.longitude.toFixed(5)}
                      </Text>
                    </View>
                  </View>
                  {original.geo && (
                    <View style={styles.coordinateRow}>
                      <FontAwesome5 solid name="map-marker-alt" size={12} color="#ea5269" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.coordinateLabel}>Selecionado · {original.nome}</Text>
                        <Text selectable style={styles.coordinateValue}>
                          {original.geo.latitude.toFixed(5)}, {original.geo.longitude.toFixed(5)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
              {options.map(venue => (
                <TouchableOpacity
                  key={venue.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: chosen.id === venue.id }}
                  onPress={() => setSelected(venue.id)}
                  style={[styles.option, chosen.id === venue.id && styles.optionSelected]}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: venue.id === suggested?.id ? '#e8f7f2' : '#fff0f2' },
                    ]}
                  >
                    <FontAwesome5
                      solid
                      name="map-marker-alt"
                      size={18}
                      color={venue.id === suggested?.id ? '#10986f' : '#e4546b'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.venueName}>{venue.nome}</Text>
                    <Text style={styles.venueHint}>
                      {venue.id === suggested?.id
                        ? 'Próximo ao seu aparelho'
                        : venue.id === original.id
                          ? 'Selecionado no aplicativo'
                          : 'Local do ensaio'}
                    </Text>
                  </View>
                  <FontAwesome5
                    solid
                    name={chosen.id === venue.id ? 'check-circle' : 'circle'}
                    size={19}
                    color={chosen.id === venue.id ? '#1777b3' : '#e0e9f0'}
                  />
                </TouchableOpacity>
              ))}
              {!all && (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => setAll(true)}
                  style={styles.other}
                >
                  <Text style={styles.otherText}>Escolher outro local</Text>
                  <FontAwesome5 solid name="chevron-down" size={10} color="#698398" />
                </TouchableOpacity>
              )}
              {assessment.outsideMonth && (
                <Text style={styles.calendar}>
                  Fora do calendário habitual · outras contagens permitidas
                </Text>
              )}
            </View>
            {compact && confirmationFooter}
          </ScrollView>
          {!compact && confirmationFooter}
        </SafeAreaView>
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
  presenceAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    marginBottom: 8,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#f2dba7',
    backgroundColor: '#fff8e9',
  },
  presenceTitle: { fontSize: 12, fontWeight: '700', color: '#875a12', marginBottom: 4 },
  presenceText: { fontSize: 12, lineHeight: 18, color: '#80663d' },
  presenceVenue: { fontWeight: '700', color: '#714d14' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(18,37,55,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingTop: 12,
    paddingBottom: 36,
  },
  mobileOverlay: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '94%',
    backgroundColor: '#ffffff',
    borderRadius: 26,
    overflow: 'hidden',
    flexShrink: 1,
  },
  mobileSheet: { borderRadius: 22 },
  mapFrame: {
    marginHorizontal: 18,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5edf3',
    minWidth: 0,
  },
  compactMapFrame: { marginHorizontal: 14, borderRadius: 14 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    borderWidth: 1,
    borderColor: '#cceadd',
    backgroundColor: '#eff9f4',
    borderRadius: 14,
  },
  suggestionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#dff2e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionLabel: { fontSize: 9, fontWeight: '700', color: '#397c66', letterSpacing: 0.5 },
  suggestionText: { fontSize: 13, lineHeight: 19, color: '#335e50', marginTop: 5 },
  suggestionVenue: { fontWeight: '700', color: '#136e51' },
  suggestionHint: { fontSize: 11, lineHeight: 16, color: '#537c6c', marginTop: 5 },
  scroll: { flexShrink: 1, minHeight: 0 },
  compactHeader: { paddingHorizontal: 16, paddingVertical: 12 },
  compactHeading: { fontSize: 18, lineHeight: 24 },
  compactBody: { padding: 14, gap: 8 },
  compactFooter: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: '#8295a5',
    marginBottom: 5,
  },
  heading: { fontSize: 20, fontWeight: '700', color: '#243f54', letterSpacing: -0.4 },
  close: {
    width: 44,
    height: 44,
    backgroundColor: '#f2f6f9',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordinates: { backgroundColor: '#f5f8fb', borderRadius: 14, padding: 13, gap: 12 },
  coordinateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coordinateDot: { width: 10, height: 10, borderRadius: 5 },
  coordinateLabel: { fontSize: 11, color: '#60778a', marginBottom: 3 },
  coordinateValue: { fontSize: 12, fontWeight: '600', color: '#304d63' },
  body: { padding: 18, gap: 10 },
  summary: { flexDirection: 'row', gap: 11, alignItems: 'center', marginBottom: 6 },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#fff0f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: { fontSize: 14, color: '#29475e', fontWeight: '700' },
  description: { fontSize: 11, lineHeight: 17, color: '#7a8e9f', marginTop: 3 },
  refresh: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 13,
    borderWidth: 1,
    borderColor: '#e5edf3',
    borderRadius: 15,
  },
  optionSelected: { borderColor: '#75acd1', backgroundColor: '#f2f8fc' },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueName: { fontSize: 14, fontWeight: '700', color: '#304d63' },
  venueHint: { fontSize: 10, color: '#8194a4', marginTop: 3 },
  other: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  otherText: { fontSize: 11, color: '#698398', fontWeight: '600' },
  calendar: { fontSize: 10, color: '#8a98a4', textAlign: 'center' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#edf2f6',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 5,
  },
  primary: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: '#126caa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 14,
  },
  primaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    flexShrink: 1,
    textAlign: 'center',
  },
  keep: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  keepText: { color: '#7e91a0', fontSize: 11, fontWeight: '500' },
});
