-- ============================================================
-- AURA FITNESS ELITE v2 — FIX: REASIGNAR sort_order SECUENCIAL
-- Todos los ejercicios existentes tienen sort_order=0, lo cual
-- rompe el reordenamiento. Esta migration reasigna sort_order
-- basado en created_at dentro de cada rutina (0, 1, 2, 3...).
-- ============================================================

UPDATE exercises e
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY routine_id ORDER BY created_at) - 1 as rn
  FROM exercises
) sub
WHERE e.id = sub.id;

-- Verificar que no haya sort_order duplicados por rutina
SELECT routine_id, sort_order, COUNT(*) as cnt
FROM exercises
GROUP BY routine_id, sort_order
HAVING COUNT(*) > 1;
