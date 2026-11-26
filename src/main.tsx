import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// RetroArch Emscripten WASM calls navigator.wakeLock.request('screen') without catching
// iframe Permissions-Policy rejections. Fall back to a no-op sentinel when disallowed.
if (typeof window !== 'undefined' && 'wakeLock' in navigator && navigator.wakeLock) {
  const wakeLockGlobal = (
    window as unknown as {
      WakeLock?: {prototype?: {request?: (type?: WakeLockType) => Promise<WakeLockSentinel>}};
    }
  ).WakeLock;
  const target =
    wakeLockGlobal?.prototype && typeof wakeLockGlobal.prototype.request === 'function'
      ? wakeLockGlobal.prototype
      : (navigator.wakeLock as unknown as {
          request?: (type?: WakeLockType) => Promise<WakeLockSentinel>;
        });
  const originalRequest = target.request;

  if (typeof originalRequest === 'function') {
    const noopSentinel = {
      released: false,
      type: 'screen' as WakeLockType,
      onrelease: null,
      release: async () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as unknown as WakeLockSentinel;

    target.request = function (this: unknown, type: WakeLockType = 'screen') {
      try {
        return Promise.resolve(originalRequest.call(this, type)).catch(() => noopSentinel);
      } catch {
        return Promise.resolve(noopSentinel);
      }
    };
  }
}

// Prevent Emscripten/RetroArch synchronous canvas resizing from triggering
// Chromium ResizeObserver loop notifications inside the iframe.
if (typeof window !== 'undefined') {
  const OriginalResizeObserver = window.ResizeObserver;
  if (typeof OriginalResizeObserver === 'function') {
    window.ResizeObserver = class DeferredResizeObserver extends OriginalResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        let rafId = 0;
        super((entries, observer) => {
          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
            callback(entries, observer);
          });
        });
      }
    };
  }

  window.addEventListener(
    'error',
    (event) => {
      const msg = event.message || '';
      if (
        msg.includes('ResizeObserver loop completed with undelivered notifications') ||
        msg.includes('ResizeObserver loop limit exceeded')
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(<App />);
