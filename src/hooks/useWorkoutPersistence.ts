import { useCallback, useEffect, useRef } from 'react';

export interface PersistedWorkoutState {
  selectedRoutineId: string | null;
  cs: Record<string, boolean>;
  lr: Record<string, number>;
  lw: Record<string, number>;
  expId: string | null;
  startTime: number; // timestamp cuando empezó el entreno
  lastSaved: number;
}

const STORAGE_KEY = (clientId: string) => `aura_workout_${clientId}`;

/**
 * Hook para persistir el progreso del entreno en localStorage.
 * Permite recuperar el entreno si el usuario cierra la pestaña,
 * el navegador se recarga, o el SO mata la app.
 */
export function useWorkoutPersistence(clientId: string) {
  const key = STORAGE_KEY(clientId);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback((state: PersistedWorkoutState) => {
    try {
      localStorage.setItem(key, JSON.stringify({ ...state, lastSaved: Date.now() }));
    } catch {
      // localStorage lleno o privado — la app sigue funcionando
    }
  }, [key]);

  const load = useCallback((): PersistedWorkoutState | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedWorkoutState;
      // Validar que el entreno no sea muy antiguo (máximo 6 horas)
      if (Date.now() - parsed.lastSaved > 6 * 60 * 60 * 1000) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, [key]);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignorar
    }
  }, [key]);

  // Debounced save para no escribir en cada render
  const scheduleSave = useCallback((state: PersistedWorkoutState) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => save(state), 500);
  }, [save]);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return { save, load, clear, scheduleSave };
}
