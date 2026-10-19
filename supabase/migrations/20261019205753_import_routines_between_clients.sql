-- Guardar la configuración de cada serie para las rutinas nuevas y editadas.
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS set_details JSONB;

-- Copia atómica: la rutina original permanece intacta y la copia queda sin día.
CREATE OR REPLACE FUNCTION public.copy_routine_to_client(
  p_source_routine_id UUID,
  p_target_client_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_source public.routines%ROWTYPE;
  v_new_routine_id UUID;
BEGIN
  SELECT * INTO v_source
  FROM public.routines
  WHERE id = p_source_routine_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rutina de origen no encontrada';
  END IF;

  IF v_source.client_id = p_target_client_id THEN
    RAISE EXCEPTION 'Selecciona un atleta diferente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_target_client_id AND role = 'client'
  ) THEN
    RAISE EXCEPTION 'Atleta de destino no encontrado';
  END IF;

  INSERT INTO public.routines (client_id, name, description, is_active, weekday)
  VALUES (p_target_client_id, v_source.name, v_source.description, true, NULL)
  RETURNING id INTO v_new_routine_id;

  INSERT INTO public.exercises (
    routine_id, name, category, sets, reps, weight, set_details,
    rest_time, notes, image_url, sort_order, superset_group, superset_order
  )
  SELECT
    v_new_routine_id, name, category, sets, reps, weight, set_details,
    rest_time, notes, image_url, sort_order, superset_group, superset_order
  FROM public.exercises
  WHERE routine_id = p_source_routine_id;

  RETURN v_new_routine_id;
END;
$$;
