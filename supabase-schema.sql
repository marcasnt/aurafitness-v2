-- ============================================================
-- AURA FITNESS ELITE v2 — SUPABASE BACKEND SCHEMA
-- Solo Coach: Marvin Martinez
-- Sin RLS, Sin verificacion de email, Auth custom
-- ============================================================

-- ============================================================
-- EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- STORAGE: BUCKET PARA AVATARES
-- ============================================================
INSERT INTO storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- ============================================================
-- STORAGE RLS POLICIES: Permitir todo en bucket avatars
-- (La app usa auth custom, no Supabase Auth nativo)
-- ============================================================
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow anyone to select (read) avatars
DROP POLICY IF EXISTS "Allow public read avatars" ON storage.objects;
CREATE POLICY "Allow public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow anyone to insert (upload) avatars
DROP POLICY IF EXISTS "Allow public insert avatars" ON storage.objects;
CREATE POLICY "Allow public insert avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

-- Allow anyone to update avatars
DROP POLICY IF EXISTS "Allow public update avatars" ON storage.objects;
CREATE POLICY "Allow public update avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

-- Allow anyone to delete avatars
DROP POLICY IF EXISTS "Allow public delete avatars" ON storage.objects;
CREATE POLICY "Allow public delete avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars');

-- ============================================================
-- TABLA: profiles
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('coach', 'client')),
  avatar_url TEXT,
  goal TEXT,
  phone TEXT,
  streak INTEGER DEFAULT 0,
  adherence_rate INTEGER DEFAULT 100,
  monthly_fee NUMERIC(10,2) DEFAULT 0,
  next_payment_date DATE,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'overdue')),
  weight_history JSONB DEFAULT '[]'::jsonb,
  payment_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- TABLA: routines
-- ============================================================
CREATE TABLE public.routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- TABLA: exercises
-- ============================================================
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Chest',
  sets INTEGER DEFAULT 4,
  reps TEXT DEFAULT '10-12',
  weight NUMERIC(10,2) DEFAULT 0,
  rest_time INTEGER DEFAULT 90,
  notes TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- TABLA: workout_logs
-- ============================================================
CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
  routine_name TEXT,
  date DATE NOT NULL,
  duration_minutes INTEGER DEFAULT 0,
  feeling_score INTEGER DEFAULT 5 CHECK (feeling_score BETWEEN 1 AND 5),
  coach_notes TEXT,
  exercises JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- TABLA: messages
-- ============================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- TABLA: payments
-- ============================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
  method TEXT,
  payment_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- TRIGGERS: updated_at automatico
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_routines_updated_at
  BEFORE UPDATE ON public.routines
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- INDICES para optimizacion
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_routines_client_id ON public.routines(client_id);
CREATE INDEX IF NOT EXISTS idx_exercises_routine_id ON public.exercises(routine_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_client_id ON public.workout_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON public.workout_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ============================================================
-- FUNCION: Marcar mensajes como leidos
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_messages_read(
  p_receiver_id UUID,
  p_sender_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE public.messages
  SET is_read = true
  WHERE receiver_id = p_receiver_id
    AND sender_id = p_sender_id
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCION: Obtener o crear cliente (utility login)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_client(
  p_email TEXT,
  p_name TEXT,
  p_password_hash TEXT
) RETURNS public.profiles AS $$
DECLARE
  v_client public.profiles;
BEGIN
  SELECT * INTO v_client FROM public.profiles WHERE email = p_email AND role = 'client';

  IF v_client.id IS NULL THEN
    INSERT INTO public.profiles (email, name, password_hash, role)
    VALUES (p_email, p_name, p_password_hash, 'client')
    RETURNING * INTO v_client;
  END IF;

  RETURN v_client;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SEED: COACH Marvin Martinez (UNICO USUARIO COACH)
-- Password: mamcyj11jm  (hash bcrypt generado)
-- ============================================================
INSERT INTO public.profiles (
  id,
  email,
  name,
  password_hash,
  role,
  avatar_url,
  streak,
  adherence_rate,
  monthly_fee,
  next_payment_date,
  payment_status
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'marcasnt@gmail.com',
  'Marvin Martinez',
  '$2b$10$8znCgD7i/QoqwScp6KTM9exBUC1/ETq0PJAPItUzme0fFQG5RuNji',
  'coach',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=200',
  0,
  100,
  0,
  NULL,
  'paid'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role;

-- ============================================================
-- SEED: Catalogo base de ejercicios (sin routine_id = globales)
-- ============================================================
INSERT INTO public.exercises (
  id, routine_id, name, category, sets, reps, weight, rest_time, notes
) VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 'Press de Banca Plano con Barra', 'Chest', 4, '8-10', 60, 120, 'Mantén los pies firmes en el suelo. Controla la fase excéntrica.'),
  ('00000000-0000-0000-0000-000000000002', NULL, 'Press de Banca Inclinado con Mancuernas', 'Chest', 4, '8-10', 34, 90, 'Mantén un arco escapular firme. RPE 8.5. Descanso completo.'),
  ('00000000-0000-0000-0000-000000000003', NULL, 'Aperturas en Polea Baja', 'Chest', 3, '12-15', 20, 60, 'Conexión mente-músculo. Contracción máxima arriba.'),
  ('00000000-0000-0000-0000-000000000004', NULL, 'Fondos en Paralelas (Lastrado)', 'Chest', 3, '10', 15, 90, 'Inclinación ligera hacia adelante para mayor estímulo pectoral.'),
  ('00000000-0000-0000-0000-000000000005', NULL, 'Dominadas Pronas (Lastradas)', 'Back', 4, '6-8', 10, 120, 'Amplitud completa abajo. Sin balanceo.'),
  ('00000000-0000-0000-0000-000000000006', NULL, 'Remo con Barra Prono', 'Back', 4, '8', 70, 90, 'Lleva la barra hacia el ombligo manteniendo la espalda paralela al suelo.'),
  ('00000000-0000-0000-0000-000000000007', NULL, 'Jalón al Pecho con Agarre Neutro', 'Back', 4, '10-12', 65, 75, 'Contracción de 1 segundo abajo apretando las dorsales.'),
  ('00000000-0000-0000-0000-000000000008', NULL, 'Remo Gironda (Polea Baja)', 'Back', 3, '12', 30, 60, 'Control total en la fase negativa.'),
  ('00000000-0000-0000-0000-000000000009', NULL, 'Sentadilla Libre con Barra Back', 'Legs', 4, '6-8', 80, 180, 'Core activado. Baja hasta paralela o ligeramente abajo.'),
  ('00000000-0000-0000-0000-000000000010', NULL, 'Prensa Atlética de 45 Grados', 'Legs', 4, '10-12', 120, 120, 'Expande bien las rodillas abajo sin redondear la espalda.'),
  ('00000000-0000-0000-0000-000000000011', NULL, 'Sentadilla Búlgara', 'Legs', 4, '10 por pierna', 18, 90, 'Paso largo para enfocar glúteo. Baja hasta rozar el suelo.'),
  ('00000000-0000-0000-0000-000000000012', NULL, 'Hip Thrust de Élite', 'Legs', 4, '12', 100, 120, 'Bloqueo pélvico superior de 2 segundos. Banda elástica opcional.'),
  ('00000000-0000-0000-0000-000000000013', NULL, 'Peso Muerto Rumano', 'Legs', 3, '12', 24, 90, 'Lleva la cadera bien hacia atrás sintiendo el estiramiento en femorales.'),
  ('00000000-0000-0000-0000-000000000014', NULL, 'Press Militar de Pie', 'Shoulders', 3, '6-8', 50, 120, 'Activa glúteos y core fuertemente para evitar hiperextensión lumbar.'),
  ('00000000-0000-0000-0000-000000000015', NULL, 'Elevaciones Laterales con Mancuerna', 'Shoulders', 3, '12-15', 8, 60, 'Codo ligeramente flexionado. Eleva hasta la línea de los hombros.'),
  ('00000000-0000-0000-0000-000000000016', NULL, 'Pájaros en Polea Posterior', 'Shoulders', 3, '15', 15, 60, 'Aprieta los omóplatos al cerrar. Controla el peso.'),
  ('00000000-0000-0000-0000-000000000017', NULL, 'Curl de Bíceps con Barra Z', 'Arms', 3, '10', 30, 60, 'Sin balanceo. Contracción máxima arriba.'),
  ('00000000-0000-0000-0000-000000000018', NULL, 'Curl Martillo Alterno', 'Arms', 3, '10 por brazo', 12, 60, 'Extensión completa abajo sin balancear los codos.'),
  ('00000000-0000-0000-0000-000000000019', NULL, 'Fondos en Paralelas', 'Arms', 3, '10', 0, 90, 'Baja hasta tener los codos a 90 grados.'),
  ('00000000-0000-0000-0000-000000000020', NULL, 'Extensiones de Tríceps sobre la Cabeza', 'Arms', 4, '12-15', 25, 60, 'Bloqueo completo al final de cada repetición.'),
  ('00000000-0000-0000-0000-000000000021', NULL, 'Abdominales en Polea Alta (Crunch)', 'Core', 3, '20', 30, 60, 'Controla la subida y baja. Sin momentum.'),
  ('00000000-0000-0000-0000-000000000022', NULL, 'Plancha Isométrica con Lastre', 'Core', 3, '45 seg', 10, 60, 'Cadera alineada con hombros y tobillos. Sin arqueo.')
ON CONFLICT (id) DO NOTHING;
