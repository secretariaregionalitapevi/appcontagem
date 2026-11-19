import React, { useState } from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { DevicePosition, EnsaioVenue, validGeo } from '../utils/locationSafetyRules';
import { mapViewport } from '../utils/locationMap';

export const LocationMap: React.FC<{
  venue: EnsaioVenue;
  position?: DevicePosition;
  height?: number;
}> = ({ venue, position, height = 264 }) => {
  const [width, setWidth] = useState(360),
    [zoom, setZoom] = useState(0);
  const [failed, setFailed] = useState(false),
    [loaded, setLoaded] = useState(false);
  if (!validGeo(venue.geo))
    return (
      <View style={[styles.map, { height }]}>
        <Text style={styles.unavailable}>Local sem ponto no mapa</Text>
      </View>
    );
  const hasPosition =
    !!position &&
    validGeo(position) &&
    position.accuracy >= 0 &&
    position.accuracy <= 20000 &&
    Date.now() - position.timestamp <= 120000 &&
    position.timestamp <= Date.now() + 10000;
  const points = [venue.geo, ...(hasPosition ? [position!] : [])];
  const view = mapViewport(points, width, height, zoom);
  const destination = view.pins[0],
    device = view.pins[1];
  const length = device ? Math.hypot(destination.x - device.x, destination.y - device.y) : 0;
  const angle = device
    ? (Math.atan2(destination.y - device.y, destination.x - device.x) * 180) / Math.PI
    : 0;
  const tileTemplate = typeof window !== 'undefined' ? window.APP_CONFIG?.MAP_TILE_URL : undefined;
  return (
    <View
      style={[styles.map, { height }]}
      onLayout={event => {
        const next = Math.round(event.nativeEvent.layout.width);
        if (next > 0 && next !== width) setWidth(next);
      }}
      accessibilityLabel={`Mapa de ${venue.nome}${hasPosition ? ' e posição do aparelho' : ''}`}
    >
      {view.tiles.map(tile => (
        <Image
          key={tile.key}
          accessible={false}
          source={{
            uri: (tileTemplate || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png')
              .replace('{z}', String(view.zoom))
              .replace('{x}', String(tile.x))
              .replace('{y}', String(tile.y)),
            ...(Platform.OS !== 'web'
              ? { headers: { 'User-Agent': 'CCB-Contagem/1.4 (Regional Itapevi)' } }
              : {}),
          }}
          style={{ position: 'absolute', width: 256, height: 256, left: tile.left, top: tile.top }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ))}
      {device && length > 25 && (
        <View
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            width: length,
            left: (destination.x + device.x) / 2 - length / 2,
            top: (destination.y + device.y) / 2,
            borderTopWidth: 2,
            borderStyle: 'dashed',
            borderColor: '#507ed2',
            transform: [{ rotate: `${angle}deg` }],
          }}
        />
      )}
      <View style={[styles.pin, { left: destination.x - 19, top: destination.y - 40 }]}>
        <View style={styles.redPin}>
          <FontAwesome5 solid name="map-marker-alt" size={31} color="#ea5269" />
        </View>
        <Text style={styles.pinLabel} numberOfLines={1}>
          {venue.nome}
        </Text>
      </View>
      {device && (
        <View style={[styles.device, { left: device.x - 14, top: device.y - 14 }]}>
          <View style={styles.deviceDot} />
          <Text style={styles.deviceLabel}>
            {position!.accuracy > 1000 ? 'Posição aproximada' : 'Você está aqui'}
          </Text>
        </View>
      )}
      <View style={styles.legend}>
        <View style={styles.legendDot} />
        <Text style={styles.legendText}>{hasPosition ? 'Seu aparelho' : 'Local selecionado'}</Text>
      </View>
      {failed && !loaded && (
        <View style={styles.network}>
          <Text style={styles.legendText}>Mapa sem conexão</Text>
        </View>
      )}
      <View style={styles.controls}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Ampliar mapa"
          style={styles.control}
          onPress={() => setZoom(z => Math.min(4, z + 1))}
        >
          <FontAwesome5 solid name="plus" size={13} color="#3c536a" />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Reduzir mapa"
          style={styles.control}
          onPress={() => setZoom(z => Math.max(-4, z - 1))}
        >
          <FontAwesome5 solid name="minus" size={13} color="#3c536a" />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Enquadrar localizações"
          style={styles.control}
          onPress={() => setZoom(0)}
        >
          <FontAwesome5 solid name="crosshairs" size={16} color="#176497" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        accessibilityRole="link"
        accessibilityLabel="Créditos do OpenStreetMap"
        onPress={() => {
          void Linking.openURL('https://www.openstreetmap.org/copyright');
        }}
        style={styles.attribution}
      >
        <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
      </TouchableOpacity>
    </View>
  );
};
const styles = StyleSheet.create({
  map: { width: '100%', overflow: 'hidden', backgroundColor: '#e9eef3', position: 'relative' },
  unavailable: { textAlign: 'center', marginTop: 110, color: '#7a8c9b', fontSize: 12 },
  pin: { position: 'absolute', width: 38, alignItems: 'center', pointerEvents: 'none' },
  redPin: {
    width: 38,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#263e52',
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pinLabel: {
    position: 'absolute',
    top: 43,
    minWidth: 70,
    maxWidth: 150,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    fontSize: 10,
    fontWeight: '700',
    color: '#475c70',
    textAlign: 'center',
  },
  device: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3b82f630',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  deviceDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#397ef0',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  deviceLabel: {
    position: 'absolute',
    top: 31,
    minWidth: 90,
    backgroundColor: '#ffffff',
    padding: 4,
    borderRadius: 7,
    fontSize: 10,
    fontWeight: '600',
    color: '#3973c5',
    textAlign: 'center',
  },
  legend: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 9,
    backgroundColor: '#fffffff2',
    borderRadius: 12,
  },
  legendDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#397ef0' },
  legendText: { fontSize: 10, color: '#61768a', fontWeight: '600' },
  controls: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  attribution: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#ffffffed',
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  attributionText: { color: '#536b80', fontSize: 9 },
  network: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 8,
  },
});
