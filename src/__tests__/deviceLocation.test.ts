jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { High: 4 },
}));
import { Platform } from 'react-native';
import * as NativeLocation from 'expo-location';
import {
  getDeviceLocation,
  resetDeviceLocation,
  subscribeDeviceLocation,
  stopDeviceLocationWatch,
} from '../services/deviceLocation';

describe('Leitura de localização com limite de tempo', () => {
  const originalOS = Platform.OS;
  const windowDescriptor = Object.getOwnPropertyDescriptor(global, 'window');
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(global, 'navigator');
  let getCurrentPosition: jest.Mock;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    resetDeviceLocation();
    (Platform as any).OS = 'web';
    getCurrentPosition = jest.fn(success =>
      success({ coords: { latitude: -23, longitude: -47, accuracy: 25 }, timestamp: Date.now() })
    );
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: { isSecureContext: true },
    });
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: { geolocation: { getCurrentPosition } },
    });
  });
  afterEach(() => {
    resetDeviceLocation();
    jest.useRealTimers();
    (Platform as any).OS = originalOS;
    if (windowDescriptor) Object.defineProperty(global, 'window', windowDescriptor);
    else delete (global as any).window;
    if (navigatorDescriptor) Object.defineProperty(global, 'navigator', navigatorDescriptor);
    else delete (global as any).navigator;
  });
  it('reutiliza a leitura recente sem pedir GPS para cada participante', async () => {
    expect((await getDeviceLocation()).position?.accuracy).toBe(25);
    await getDeviceLocation();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });
  it('retorna permissão negada sem inventar posição', async () => {
    getCurrentPosition.mockImplementation((_, error) => error({ code: 1 }));
    expect(await getDeviceLocation()).toEqual({ reason: 'denied' });
  });
  it('retorna em 15 segundos quando a caixa de permissão não é respondida', async () => {
    getCurrentPosition.mockImplementation(() => {});
    const promise = getDeviceLocation();
    jest.advanceTimersByTime(15001);
    expect(await promise).toEqual({ reason: 'timeout' });
  });
  it('não trata resposta tardia como nova posição depois do timeout', async () => {
    let late: any;
    getCurrentPosition.mockImplementation(success => {
      late = success;
    });
    const promise = getDeviceLocation();
    jest.advanceTimersByTime(15001);
    await promise;
    late({ coords: { latitude: -23, longitude: -47, accuracy: 25 }, timestamp: Date.now() });
    expect(await getDeviceLocation()).toEqual({ reason: 'timeout' });
  });
  it('informa contexto inseguro sem tentar acessar GPS', async () => {
    (global as any).window.isSecureContext = false;
    expect(await getDeviceLocation()).toEqual({ reason: 'insecure' });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
  it('trata exceção síncrona do navegador como localização indisponível', async () => {
    getCurrentPosition.mockImplementation(() => {
      throw new Error('Política do navegador');
    });
    expect(await getDeviceLocation()).toEqual({ reason: 'unavailable' });
  });
  it('consulta apenas permissão em uso e uma leitura no Android', async () => {
    (Platform as any).OS = 'android';
    (NativeLocation.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (NativeLocation.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: -23, longitude: -47, accuracy: 40 },
      timestamp: Date.now(),
    });
    expect((await getDeviceLocation()).position?.accuracy).toBe(40);
    expect(NativeLocation.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(NativeLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
  });
  it('não repete o pedido de permissão nativo após a pessoa negar', async () => {
    (Platform as any).OS = 'android';
    (NativeLocation.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });
    (NativeLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });
    expect(await getDeviceLocation()).toEqual({ reason: 'denied' });
    jest.advanceTimersByTime(30001);
    expect(await getDeviceLocation()).toEqual({ reason: 'denied' });
    expect(NativeLocation.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(NativeLocation.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });
  it('usa a leitura por rede quando a alta precisão falha no desktop', async () => {
    getCurrentPosition.mockImplementationOnce((_, error) => error({ code: 3 }));
    expect((await getDeviceLocation()).position?.accuracy).toBe(25);
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(getCurrentPosition.mock.calls[1][2].enableHighAccuracy).toBe(false);
  });
  it('uma permissão lenta no iOS atualiza o painel mesmo após a primeira espera', async () => {
    let answer!: (value: unknown) => void;
    const clearWatch = jest.fn();
    (global as any).navigator.geolocation.watchPosition = jest.fn(success => {
      answer = success;
      return 17;
    });
    (global as any).navigator.geolocation.clearWatch = clearWatch;
    getCurrentPosition.mockImplementation(() => {});
    const changed = jest.fn(),
      unsubscribe = subscribeDeviceLocation(changed);
    const result = getDeviceLocation(true);
    jest.advanceTimersByTime(15001);
    expect(await result).toEqual({ reason: 'timeout' });
    answer({
      coords: { latitude: -23.6824552, longitude: -47.0214911, accuracy: 30 },
      timestamp: Date.now(),
    });
    expect(changed).toHaveBeenCalledWith(
      expect.objectContaining({ position: expect.objectContaining({ accuracy: 30 }) })
    );
    expect((await getDeviceLocation()).position?.accuracy).toBe(30);
    stopDeviceLocationWatch();
    expect(clearWatch).toHaveBeenCalledWith(17);
    unsubscribe();
  });
  it('mantém uma posição aproximada e permite refinar sem rastreamento permanente', async () => {
    let answer!: (value: unknown) => void;
    const clearWatch = jest.fn();
    (global as any).navigator.geolocation.watchPosition = jest.fn(success => {
      answer = success;
      return 18;
    });
    (global as any).navigator.geolocation.clearWatch = clearWatch;
    getCurrentPosition.mockImplementation(() => {});
    const result = getDeviceLocation(true);
    answer({
      coords: { latitude: -23.6824552, longitude: -47.0214911, accuracy: 3000 },
      timestamp: Date.now(),
    });
    jest.advanceTimersByTime(1501);
    expect((await result).position?.accuracy).toBe(3000);
    answer({
      coords: { latitude: -23.6824552, longitude: -47.0214911, accuracy: 40 },
      timestamp: Date.now(),
    });
    expect((await getDeviceLocation()).position?.accuracy).toBe(40);
    jest.advanceTimersByTime(45000);
    expect(clearWatch).toHaveBeenCalledWith(18);
    answer({ coords: { latitude: -24, longitude: -48, accuracy: 10 }, timestamp: Date.now() });
    expect((await getDeviceLocation()).position?.accuracy).toBe(40);
  });
  it('reset invalida callbacks tardios de uma sessão anterior', async () => {
    let answer!: (value: unknown) => void;
    getCurrentPosition.mockImplementation(success => {
      answer = success;
    });
    const result = getDeviceLocation();
    resetDeviceLocation();
    await result;
    const changed = jest.fn(),
      unsubscribe = subscribeDeviceLocation(changed);
    answer({ coords: { latitude: -23, longitude: -47, accuracy: 25 }, timestamp: Date.now() });
    expect(changed).not.toHaveBeenCalled();
    unsubscribe();
  });
  it('clears a watch that denies permission before returning its id', async () => {
    const clearWatch = jest.fn();
    (global as any).navigator.geolocation.watchPosition = jest.fn((_, error) => {
      error({ code: 1 });
      return 0;
    });
    (global as any).navigator.geolocation.clearWatch = clearWatch;
    expect(await getDeviceLocation(true)).toEqual({ reason: 'denied' });
    expect(clearWatch).toHaveBeenCalledWith(0);
  });
});
