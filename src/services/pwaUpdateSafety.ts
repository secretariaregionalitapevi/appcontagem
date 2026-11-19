const blockers = new Set<string | symbol>();
declare global {
  interface Window {
    __pwaAppReady?: boolean;
    __pwaUpdateBlocked?: () => boolean;
  }
}
export function setPwaUpdateBlock(key: string | symbol, blocked: boolean) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (blocked) blockers.add(key);
  else blockers.delete(key);
  window.__pwaUpdateBlocked = () => blockers.size > 0;
  window.dispatchEvent(new Event('pwa:safety-change'));
}
export function markPwaAppReady() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.__pwaAppReady = true;
  window.dispatchEvent(new Event('pwa:safety-change'));
}
