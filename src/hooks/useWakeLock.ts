import { useEffect, useRef, useCallback } from 'react';

interface WakeLockSentinel {
  release: () => Promise<void>;
  addEventListener: (type: string, listener: () => void) => void;
}

/**
 * Hook para mantener la pantalla despierta mientras hay un entreno activo.
 * Usa la Screen Wake Lock API nativa del navegador.
 * En iOS/Safari donde no está soportada, muestra un fallback visual.
 */
export function useWakeLock(isActive: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isSupported = 'wakeLock' in navigator;

  const requestWakeLock = useCallback(async () => {
    if (!isSupported || wakeLockRef.current) return;
    try {
      const wakeLock = await (navigator as any).wakeLock.request('screen');
      wakeLockRef.current = wakeLock;
      wakeLock.addEventListener('release', () => {
        wakeLockRef.current = null;
      });
    } catch (err) {
      // Fallo silencioso — la app sigue funcionando sin wake lock
      // (por ejemplo, si la pestaña no está activa al momento de solicitarlo)
    }
  }, [isSupported]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Ignorar errores de release
      }
      wakeLockRef.current = null;
    }
  }, []);

  // Activar/desactivar según isActive
  useEffect(() => {
    if (isActive) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => {
      releaseWakeLock();
    };
  }, [isActive, requestWakeLock, releaseWakeLock]);

  // Re-solicitar wake lock cuando el documento vuelve a ser visible
  // (el navegador lo libera automáticamente al minimizar/pestaña inactiva)
  useEffect(() => {
    if (!isSupported || !isActive) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isActive, isSupported, requestWakeLock]);

  return { isSupported };
}
