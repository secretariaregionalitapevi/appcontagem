import { useLayoutEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { setPwaUpdateBlock } from '../services/pwaUpdateSafety';

export function usePwaUpdateGuard(blocked: boolean) {
  const key = useRef(Symbol('pwa-form'));
  const focused = useIsFocused();
  useLayoutEffect(() => {
    setPwaUpdateBlock(key.current, focused && blocked);
    return () => setPwaUpdateBlock(key.current, false);
  }, [blocked, focused]);
}
