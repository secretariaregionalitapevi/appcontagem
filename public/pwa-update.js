/* Installed PWAs use this updater without reinstalling or clearing user data. */
(() => {
  const BUILD_ID = '__PWA_BUILD_ID__';
  if (!('serviceWorker' in navigator)) return;
  if (BUILD_ID.startsWith('__')) {
    // Preserve the remote branch's development fix without clearing user data.
    if (['localhost', '127.0.0.1', '::1', '[::1]'].includes(window.location.hostname)) {
      navigator.serviceWorker
        .getRegistrations()
        .then(registrations =>
          Promise.all(
            registrations
              .filter(item => item.scope === window.location.origin + '/')
              .map(item => item.unregister())
          )
        )
        .catch(() => {});
      if ('caches' in window)
        caches
          .keys()
          .then(names =>
            Promise.all(
              names
                .filter(name => /^(ccb-contagem-build-|app-presenca-v|runtime-cache-v)/.test(name))
                .map(name => caches.delete(name))
            )
          )
          .catch(() => {});
    }
    return;
  }
  let registration,
    checking = false,
    starting = false,
    pending = false,
    refreshing = false,
    timer;
  let lastActivity = Date.now();
  const active = () => document.visibilityState === 'visible' && navigator.onLine !== false;
  const hasDraft = () =>
    Array.from(document.querySelectorAll('input, textarea')).some(
      input =>
        !['date', 'time', 'checkbox', 'radio', 'button', 'submit', 'hidden'].includes(input.type) &&
        input.value &&
        input.getClientRects().length > 0
    );
  const safe = () =>
    active() &&
    window.__pwaAppReady === true &&
    !(window.__pwaUpdateBlocked && window.__pwaUpdateBlocked()) &&
    !hasDraft() &&
    !document.querySelector('[aria-modal="true"], .swal2-container') &&
    !['INPUT', 'TEXTAREA', 'SELECT'].includes(
      document.activeElement && document.activeElement.tagName
    ) &&
    Date.now() - lastActivity >= 2000;
  const apply = () => {
    clearTimeout(timer);
    if (!pending || refreshing) return;
    if (!safe()) {
      timer = setTimeout(apply, 2000);
      return;
    }
    refreshing = true;
    window.location.reload();
  };
  const inspectController = () => {
    const worker = navigator.serviceWorker.controller;
    if (!worker) return;
    const channel = new MessageChannel();
    const timeout = setTimeout(() => channel.port1.close(), 3000);
    channel.port1.onmessage = event => {
      clearTimeout(timeout);
      channel.port1.close();
      if (event.data && event.data.buildId && event.data.buildId !== BUILD_ID) {
        pending = true;
        apply();
      }
    };
    worker.postMessage({ type: 'GET_BUILD_ID' }, [channel.port2]);
  };
  const check = async () => {
    if (!registration || checking || !active()) return;
    checking = true;
    try {
      await registration.update();
      inspectController();
    } catch (error) {
      /* Offline: keep installed release and retry on reconnect. */
    } finally {
      checking = false;
    }
  };
  navigator.serviceWorker.addEventListener('controllerchange', inspectController);
  ['pointerdown', 'keydown', 'input', 'change'].forEach(type =>
    document.addEventListener(
      type,
      () => {
        lastActivity = Date.now();
      },
      { passive: true }
    )
  );
  document.addEventListener('visibilitychange', () => {
    if (active()) {
      if (!registration) start();
      else check();
      apply();
    }
  });
  window.addEventListener('online', () => {
    if (!registration) start();
    else check();
    apply();
  });
  window.addEventListener('pageshow', () => {
    check();
    inspectController();
  });
  window.addEventListener('pwa:safety-change', () => {
    // React may release one screen's guard before registering the next screen's guard.
    clearTimeout(timer);
    timer = setTimeout(apply, 2000);
  });
  const start = async () => {
    if (starting || registration) return;
    starting = true;
    try {
      registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      await check();
      inspectController();
      setInterval(check, 60000);
    } catch (error) {
      console.warn('[PWA] Update registration unavailable', error);
    } finally {
      starting = false;
    }
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();
