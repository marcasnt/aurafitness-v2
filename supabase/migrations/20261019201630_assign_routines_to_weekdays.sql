-- Una rutina puede estar vacante o tener un día fijo de la semana.
-- Se conservan todas las rutinas existentes sin día asignado.
ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS weekday SMALLINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'routines_weekday_range'
      AND conrelid = 'public.routines'::regclass
  ) THEN
    ALTER TABLE public.routines
      ADD CONSTRAINT routines_weekday_range CHECK (weekday BETWEEN 1 AND 7);
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS routines_one_per_client_weekday
  ON public.routines (client_id, weekday)
  WHERE weekday IS NOT NULL;

-- Mover la asignación en una sola transacción. La rutina desplazada queda vacante.
CREATE OR REPLACE FUNCTION public.assign_routine_weekday(
  p_routine_id UUID,
  p_weekday SMALLINT
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id UUID;
BEGIN
  IF p_weekday IS NOT NULL AND p_weekday NOT BETWEEN 1 AND 7 THEN
    RAISE EXCEPTION 'El día debe estar entre lunes (1) y domingo (7)';
  END IF;

  SELECT client_id INTO v_client_id
  FROM public.routines
  WHERE id = p_routine_id;

  IF NOT FOUND OR v_client_id IS NULL THEN
    RAISE EXCEPTION 'Rutina no encontrada';
  END IF;

  -- Serializa asignaciones simultáneas del mismo cliente.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_client_id::text, 0));

  IF p_weekday IS NOT NULL THEN
    UPDATE public.routines
    SET weekday = NULL
    WHERE client_id = v_client_id
      AND weekday = p_weekday
      AND id <> p_routine_id;
  END IF;

  UPDATE public.routines
  SET weekday = p_weekday
  WHERE id = p_routine_id;
END;
$$;
