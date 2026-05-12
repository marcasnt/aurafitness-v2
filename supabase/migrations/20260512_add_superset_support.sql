-- ============================================================
-- AURA FITNESS ELITE v2 — MIGRATION: SUPERSET SUPPORT
-- Agrega campos para agrupar ejercicios en supersets
-- ============================================================

-- 1. Agregar columnas de superset a exercises
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS superset_group TEXT,
  ADD COLUMN IF NOT EXISTS superset_order INTEGER DEFAULT 0;

-- 2. Índice para agrupar rápido por rutina + grupo
CREATE INDEX IF NOT EXISTS idx_exercises_superset
  ON exercises(routine_id, superset_group, superset_order);

-- 3. Actualizar exercises existentes: superset_group=null, superset_order=0
UPDATE exercises
  SET superset_group = NULL,
      superset_order = 0
  WHERE superset_group IS NULL AND superset_order IS NULL;
