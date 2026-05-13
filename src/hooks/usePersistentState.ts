import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook que persiste estado en sessionStorage con debounce de 500ms.
 * Util para formularios y UI state que no debe perderse al refrescar.
 * Se limpia automaticamente al cerrar la pestana o navegador.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw !== null) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // ignorar errores de parseo o storage privado
    }
    return initialValue;
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(key, JSON.stringify(state));
      } catch {
        // ignorar errores de storage lleno o privado
      }
    }, 500);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state, key]);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignorar
    }
    setState(initialValue);
  }, [key, initialValue]);

  return [state, setState, clear];
}
