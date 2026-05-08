# 🚀 AURA Elite — Guía de Despliegue con Supabase + Vercel

> Esta guía te lleva paso a paso desde crear el backend en Supabase hasta tener la app 100% funcional en Vercel, con datos persistentes en tiempo real.

---

## 📋 Índice

1. [Crear proyecto en Supabase](#1-crear-proyecto-en-supabase)
2. [Ejecutar el SQL (Tablas + RLS)](#2-ejecutar-el-sql-tablas--rls)
3. [Instalar dependencias en el proyecto](#3-instalar-dependencias-en-el-proyecto)
4. [Crear cliente de Supabase](#4-crear-cliente-de-supabase)
5. [Configurar autenticación real](#5-configurar-autenticación-real)
6. [Variables de entorno en Vercel](#6-variables-de-entorno-en-vercel)
7. [Desplegar en Vercel](#7-desplegar-en-vercel)
8. [Migrar datos de localStorage a Supabase](#8-migrar-datos-de-localstorage-a-supabase)

---

## 1. Crear proyecto en Supabase

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**
2. Elige un nombre (ej: `aura-fitness-elite`)
3. Crea una contraseña segura para la DB
4. Selecciona region: `eu-west-1` (más cercano a España/Europa)
5. Espera ~2 min a que se provisione

> ✅ Copia los valores de **Project URL** y **anon public key** desde:
> **Project Settings → API → Project URL** y **Project API Keys → anon/public**

---

## 2. Ejecutar el SQL (Tablas + RLS)

Ve a **SQL Editor** en tu dashboard de Supabase, crea un nuevo query y pega todo el siguiente código:

```sql
-- ============================================================
-- AURA ELITE FITNESS — Schema Completo para Supabase
-- Ejecuta este SQL completo en el SQL Editor de Supabase
-- ============================================================

-- --------------------------------------------------
-- 1. EXTENSIONES ÚTILES
-- --------------------------------------------------
create extension if not exists "uuid-ossp";

-- --------------------------------------------------
-- 2. TABLA: profiles (Usuarios: Coach + Clientes)
-- --------------------------------------------------
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  name text not null,
  role text not null default 'client' check (role in ('coach', 'client')),
  avatar text,
  selfie_url text,
  goal text default 'Hipertrofia General',
  phone text,
  streak integer default 0,
  adherence_rate integer default 100,
  weight_history jsonb default '[]'::jsonb,
  -- Campos de pago
  monthly_fee numeric(10,2) default 120,
  next_payment_date date,
  payment_status text default 'pending' check (payment_status in ('paid', 'pending', 'overdue')),
  payment_history jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- --------------------------------------------------
-- 3. TABLA: routines (Días de entrenamiento)
-- --------------------------------------------------
create table public.routines (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- --------------------------------------------------
-- 4. TABLA: exercises (Ejercicios por rutina)
-- --------------------------------------------------
create table public.exercises (
  id uuid default gen_random_uuid() primary key,
  routine_id uuid references public.routines(id) on delete cascade not null,
  name text not null,
  category text default 'Chest',
  sets integer default 4,
  reps text default '10-12',
  weight numeric(10,2) default 20,
  rest_time integer default 90,
  notes text,
  image_url text,
  position integer default 0,
  created_at timestamptz default now()
);

-- --------------------------------------------------
-- 5. TABLA: workout_logs (Registros de entrenamientos)
-- --------------------------------------------------
create table public.workout_logs (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) on delete cascade not null,
  routine_id uuid references public.routines(id) on delete set null,
  routine_name text,
  workout_date date not null,
  duration_minutes integer default 60,
  exercises jsonb default '[]'::jsonb,
  feeling_score integer default 5,
  coach_notes text,
  created_at timestamptz default now()
);

-- --------------------------------------------------
-- 6. TABLA: messages (Chat Coach-Cliente)
-- --------------------------------------------------
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- --------------------------------------------------
-- 7. TABLA: payments (Registro detallado de pagos)
-- --------------------------------------------------
create table public.payments (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(10,2) not null,
  status text default 'pending' check (status in ('paid', 'pending', 'overdue', 'refunded')),
  method text default '',
  payment_date date not null,
  notes text,
  created_at timestamptz default now()
);

-- --------------------------------------------------
-- 8. TRIGGERS: Actualizar `updated_at` automáticamente
-- --------------------------------------------------
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_profiles before update on public.profiles
  for each row execute function update_updated_at_column();

create trigger set_updated_at_routines before update on public.routines
  for each row execute function update_updated_at_column();

-- --------------------------------------------------
-- 9. TRIGGER: Crear profile automáticamente al registrarse
-- --------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.email), 'client');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------
-- 10. INDICES para rendimiento
-- --------------------------------------------------
create index idx_routines_client on public.routines(client_id);
create index idx_exercises_routine on public.exercises(routine_id);
create index idx_workout_logs_client on public.workout_logs(client_id);
create index idx_workout_logs_date on public.workout_logs(workout_date);
create index idx_messages_sender on public.messages(sender_id);
create index idx_messages_receiver on public.messages(receiver_id);
create index idx_payments_client on public.payments(client_id);

-- --------------------------------------------------
-- 11. POLÍTICAS ROW LEVEL SECURITY (RLS)
-- --------------------------------------------------
alter table public.profiles enable row level security;
alter table public.routines enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.messages enable row level security;
alter table public.payments enable row level security;

-- 11a. POLICIES: profiles
create policy "Profiles son visibles para todos los usuarios autenticados"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Coach puede crear profiles de clientes"
  on public.profiles for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );

create policy "Coach puede actualizar perfiles de clientes"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );

create policy "Coach puede eliminar perfiles de clientes"
  on public.profiles for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );

create policy "Los usuarios pueden ver su propio perfil"
  on public.profiles for select
  using (id = auth.uid());

-- 11b. POLICIES: routines
create policy "Coach puede gestionar rutinas"
  on public.routines for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );

create policy "Clientes ven sus propias rutinas"
  on public.routines for select
  using (client_id = auth.uid());

-- 11c. POLICIES: exercises
create policy "Coach puede gestionar ejercicios"
  on public.exercises for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );

create policy "Clientes ven ejercicios de sus rutinas"
  on public.exercises for select
  using (
    routine_id in (
      select id from public.routines where client_id = auth.uid()
    )
  );

-- 11d. POLICIES: workout_logs
create policy "Coach puede ver todos los logs"
  on public.workout_logs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );

create policy "Clientes pueden crear sus propios logs"
  on public.workout_logs for insert
  with check (client_id = auth.uid());

create policy "Clientes pueden ver sus propios logs"
  on public.workout_logs for select
  using (client_id = auth.uid());

-- 11e. POLICIES: messages
create policy "Coach puede ver y enviar mensajes"
  on public.messages for select
  using (
    sender_id = auth.uid() or receiver_id = auth.uid()
  );

create policy "Usuarios pueden enviar mensajes"
  on public.messages for insert
  with check (sender_id = auth.uid());

create policy "Coach puede marcar mensajes como leídos"
  on public.messages for update
  using (auth.uid() in (sender_id, receiver_id))
  with check (auth.uid() in (sender_id, receiver_id));

-- 11f. POLICIES: payments
create policy "Coach puede gestionar pagos"
  on public.payments for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );

-- --------------------------------------------------
-- 12. SEED DATA: Crear al Coach por defecto
-- --------------------------------------------------
-- PRIMERO crea un usuario en Auth → luego inserta aquí su UUID
-- Para crearlo manualmente:
-- auth.admin.createUser({email: 'marcasnt@gmail.com', password: 'TU_PASSWORD'})
-- y luego pega el UUID generado aquí:

-- insert into public.profiles (id, email, name, role, monthly_fee, payment_status)
-- values ('PEGA-AQUI-EL-UUID-DEL-COACH', 'marcasnt@gmail.com', 'Coach Marcus', 'coach', 0, 'paid');

-- --------------------------------------------------
-- 13. REALTIME: Habilitar suscripciones en tiempo real
-- --------------------------------------------------
-- En el dashboard: Database → Replication → Habilitar para:
-- workout_logs, messages, profiles (payment_status)
```

> ⚠️ **IMPORTANTE**: Después de ejecutar el SQL:
> 1. Ve a **Authentication → Users** en Supabase
> 2. Crea el usuario del coach manualmente: `marcasnt@gmail.com`
> 3. Copia su `UUID` generado
> 4. Descomenta y ejecuta la sección **12. SEED DATA** con ese UUID
> 5. Ve a **Database → Replication** y habilita realtime para: `workout_logs`, `messages`, `profiles`

---

## 3. Instalar dependencias en el proyecto

```bash
npm install @supabase/supabase-js @supabase/ssr
```

---

## 4. Crear cliente de Supabase

Crea el archivo `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno de Supabase');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ============================================================
// HELPERS DE RECURSOS (reemplazan el localStorage actual)
// ============================================================

// --- Profiles ---
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

export const getAllClients = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createClientProfile = async (profile: {
  id: string;
  email: string;
  name: string;
  goal?: string;
  phone?: string;
  monthly_fee: number;
  next_payment_date: string;
  payment_status: 'paid' | 'pending' | 'overdue';
  avatar?: string;
  selfie_url?: string;
}) => {
  // 1. Crear usuario en Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: profile.email,
    password: profile.name, // o usa una contraseña real
    email_confirm: true,
    user_metadata: { name: profile.name },
  });
  if (authError) throw authError;

  // 2. Crear perfil
  const { error } = await supabase.from('profiles').insert({
    id: authData.user.id,
    ...profile,
  });
  if (error) throw error;
  return authData.user.id;
};

export const updateProfile = async (userId: string, updates: any) => {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
};

export const deleteClient = async (clientId: string) => {
  // Delete cascades automatically via FK
  const { error } = await supabase.from('profiles').delete().eq('id', clientId);
  if (error) throw error;
};

// --- Routines ---
export const getRoutinesByClient = async (clientId: string) => {
  const { data, error } = await supabase
    .from('routines')
    .select('*, exercises(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const getAllRoutines = async () => {
  const { data, error } = await supabase
    .from('routines')
    .select('*, exercises(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createRoutine = async (routine: {
  client_id: string;
  name: string;
  description?: string;
  is_active: boolean;
}) => {
  const { data, error } = await supabase.from('routines').insert(routine).select().single();
  if (error) throw error;
  return data;
};

export const addExercise = async (exercise: {
  routine_id: string;
  name: string;
  category: string;
  sets: number;
  reps: string;
  weight: number;
  rest_time: number;
  notes?: string;
  image_url?: string;
  position: number;
}) => {
  const { error } = await supabase.from('exercises').insert(exercise);
  if (error) throw error;
};

export const deleteExercise = async (exerciseId: string) => {
  const { error } = await supabase.from('exercises').delete().eq('id', exerciseId);
  if (error) throw error;
};

// --- Workout Logs ---
export const getLogsByClient = async (clientId: string) => {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('client_id', clientId)
    .order('workout_date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createWorkoutLog = async (log: {
  client_id: string;
  routine_id: string;
  routine_name: string;
  workout_date: string;
  duration_minutes: number;
  exercises: any;
  feeling_score: number;
  coach_notes?: string;
}) => {
  const { data, error } = await supabase.from('workout_logs').insert(log).select().single();
  if (error) throw error;
  return data;
};

// --- Messages ---
export const getMessages = async (userId1: string, userId2: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${userId1},sender_id.eq.${userId2}`)
    .or(`receiver_id.eq.${userId1},receiver_id.eq.${userId2}`)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const sendMessage = async (msg: {
  sender_id: string;
  receiver_id: string;
  content: string;
}) => {
  const { data, error } = await supabase.from('messages').insert(msg).select().single();
  if (error) throw error;
  return data;
};

// --- Payments ---
export const createPayment = async (payment: {
  client_id: string;
  amount: number;
  status: string;
  method: string;
  payment_date: string;
  notes?: string;
}) => {
  const { data, error } = await supabase.from('payments').insert(payment).select().single();
  if (error) throw error;
  return data;
};

export const getPaymentsByClient = async (clientId: string) => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('client_id', clientId)
    .order('payment_date', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data || [];
};

// ============================================================
// REALTIME SUBSCRIPTIONS
// ============================================================

// Suscribirse a nuevos mensajes en tiempo real
export const subscribeToMessages = (
  channelId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      callback
    )
    .subscribe();
};

// Suscribirse a nuevos workout logs
export const subscribeToWorkoutLogs = (
  clientId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`logs-${clientId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'workout_logs', filter: `client_id=eq.${clientId}` },
      callback
    )
    .subscribe();
};

// Suscribirse a cambios de pago
export const subscribeToPayments = (
  clientId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`payments-${clientId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${clientId}` },
      callback
    )
    .subscribe();
};
```

---

## 5. Configurar autenticación real

Crea `src/lib/auth.ts`:

```typescript
import { supabase } from './supabase';

// --- Login con email/contraseña ---
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

// --- Logout ---
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// --- Obtener usuario actual ---
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// --- Suscribirse a cambios de sesión ---
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

// --- Crear cuenta de cliente (Admin/Coach) ---
export const createClientAccount = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) throw error;
  return data;
};
```

---

## 6. Variables de entorno en Vercel

### En tu proyecto local, crea `.env.local`:

```env
VITE_SUPABASE_URL=https://TU-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### En Vercel (Production):

1. Ve a tu proyecto en **Vercel Dashboard**
2. **Settings → Environment Variables**
3. Agrega ambas variables:
   - `VITE_SUPABASE_URL` → `https://TU-PROJECT-REF.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` → `tu-anon-key-aqui`
4. ✅ Asegúrate de añadirlas en **Production**, **Preview** y **Development**
5. Redeploy para que se activen

> ⚠️ La clave `anon/public` es segura de exponer en el frontend porque las políticas RLS controlan el acceso real a los datos.

---

## 7. Desplegar en Vercel

### 7.1 Preparar el proyecto

```bash
# Asegúrate de que todo compila
npm run build
```

### 7.2 Conectar con Vercel

```bash
# Instalar CLI de Vercel
npm i -g vercel

# Login y deploy
vercel login
vercel           # para preview
vercel --prod    # para producción
```

### 7.3 O desde GitHub

1. Push tu código a un repositorio de GitHub
2. En Vercel: **Add New → Project → Import from GitHub**
3. Conecta tu repo
4. Vercel detecta automáticamente que es Vite + React
5. Agrega las variables de entorno en el wizard de Vercel
6. Click **Deploy**

### 7.4 Build Command en Vercel

Vercel detecta automáticamente, pero si necesitas configurarlo:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

---

## 8. Migrar datos de localStorage a Supabase

Cuando despliegues con Supabase, necesitas reemplazar los handlers del `App.tsx` para que usen la DB en vez de localStorage. Aquí la lógica de migración:

### 8.1 Script de importación inicial (ejecutar UNA VEZ)

Desde el **SQL Editor** de Supabase, importa los clientes existentes:

```sql
-- Ejemplo: Insertar clientes iniciales
-- Reemplaza los UUIDs con los reales de auth.users

INSERT INTO public.profiles (id, email, name, role, goal, phone, monthly_fee, next_payment_date, payment_status, payment_history)
VALUES
  ('UUID-CARLOS', 'carlos@aura.com', 'Carlos Mendoza', 'client', 'Hipertrofia', '+34611223344', 120, '2026-03-28', 'paid',
   '[{"date":"2026-01-28","amount":120,"status":"paid"},{"date":"2026-02-28","amount":120,"status":"paid"}]'),
  ('UUID-VALERIA', 'valeria@aura.com', 'Valeria Gómez', 'client', 'Definición', '+34622334455', 150, '2026-03-20', 'pending',
   '[{"date":"2026-01-20","amount":150,"status":"paid"},{"date":"2026-02-20","amount":150,"status":"paid"}]'),
  ('UUID-SANTIAGO', 'santiago@aura.com', 'Santiago Rey', 'client', 'Powerlifting', '+34633445566', 200, '2026-03-10', 'overdue',
   '[{"date":"2026-01-10","amount":200,"status":"paid"},{"date":"2026-02-10","amount":200,"status":"overdue"}]');
```

### 8.2 Reemplazar localStorage por Supabase en `App.tsx`

La idea general es reemplazar cada `setClients(...)` por una llamada al helper de `src/lib/supabase.ts`. Ejemplo:

```typescript
// ANTES (localStorage)
const handleAddLog = (newLog: WorkoutLog) => {
  setLogs((prev) => [newLog, ...prev]);
};

// DESPUÉS (Supabase)
const handleAddLog = async (newLog: WorkoutLog) => {
  await createWorkoutLog(newLog);
  const updated = await getLogsByClient(client.id);
  setLogs(updated);
};
```

### 8.3 Patrón de carga inicial

```typescript
useEffect(() => {
  const load = async () => {
    const user = await getCurrentUser();
    if (!user) return;

    setCurrentUser(await getProfile(user.id));

    if (user.role === 'coach') {
      setClients(await getAllClients());
      setRoutines(await getAllRoutines());
    } else {
      setRoutines(await getRoutinesByClient(user.id));
      setLogs(await getLogsByClient(user.id));
    }
  };
  load();
}, []);
```

---

## 📐 Diagrama de Base de Datos

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   profiles   │ 1──N  │   routines   │ 1──N  │  exercises   │
│──────────────│       │──────────────│       │──────────────│
│ id (UUID)    │       │ id (UUID)    │       │ id (UUID)    │
│ email        │       │ client_id →  │       │ routine_id → │
│ name         │       │ name         │       │ name         │
│ role         │       │ is_active    │       │ category     │
│ avatar       │       │ created_at   │       │ sets         │
│ monthly_fee  │       └──────────────┘       │ reps         │
│ payment_stat │                              │ weight       │
│ payment_hist │                              │ rest_time    │
│ streak       │                              │ image_url    │
└──────┬───────┘                              │ notes        │
       │                                      └──────────────┘
       │ 1──N
       ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│workout_logs  │       │   messages   │       │   payments   │
│──────────────│       │──────────────│       │──────────────│
│ id (UUID)    │       │ id (UUID)    │       │ id (UUID)    │
│ client_id →  │       │ sender_id →  │       │ client_id →  │
│ routine_id → │       │ receiver_id →│       │ amount       │
│ workout_date │       │ content      │       │ status       │
│ duration_min │       │ is_read      │       │ method       │
│ exercises    │       │ created_at   │       │ payment_date │
│ feeling_scor │       └──────────────┘       │ notes        │
│ coach_notes  │                              └──────────────┘
└──────────────┘
```

---

## 🔑 Resumen de Credenciales de Demo

| Rol | Email | Password | Notas |
|-----|-------|----------|-------|
| **Coach** | `marcasnt@gmail.com` | Tu contraseña real en Supabase Auth | Único coach |
| **Carlos** | `carlos@aura.com` | `fit2026_carlos` | Hipertrofia, €120/mes |
| **Valeria** | `valeria@aura.com` | `fit2026_valeria` | Definición, €150/mes |
| **Santiago** | `santiago@aura.com` | `fit2026_santi` | Powerlifting, €200/mes |

---

## ✅ Checklist Final de Despliegue

- [ ] Proyecto creado en Supabase
- [ ] SQL completo ejecutado en SQL Editor
- [ ] Coach creado en Auth con UUID en profiles
- [ ] Realtime habilitado en `workout_logs`, `messages`, `profiles`
- [ ] `@supabase/supabase-js` instalado
- [ ] `src/lib/supabase.ts` creado
- [ ] `src/lib/auth.ts` creado
- [ ] Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configuradas en Vercel
- [ ] Handlers de App.tsx migrados de localStorage a Supabase
- [ ] `npm run build` compila sin errores
- [ ] Desplegado en Vercel
- [ ] URL de producción verificada y funcional

---

> 💡 **Tip**: Durante la transición, puedes mantener el `localStorage` como fallback. Simplemente envuelve las llamadas a Supabase en try/catch y si fallan, usa el comportamiento local actual. Esto permite una migración sin downtime.
