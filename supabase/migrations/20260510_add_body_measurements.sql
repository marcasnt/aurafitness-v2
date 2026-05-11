-- ============================================
-- MIGRACION: Agregar campos de medidas corporales y perfil
-- Fecha: 2026-05-10
-- ============================================

-- 1. Agregar columna de genero (para calculo de % grasa)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender TEXT;

-- 2. Agregar columna de edad (para formula Deurenberg)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS age INTEGER;

-- 3. Agregar historial de medidas corporales (JSONB array)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS measurements_history JSONB DEFAULT '[]'::jsonb;

-- 4. Verificar que weight_history existe (ya usado en codigo)
-- Si no existe, descomenta la siguiente linea:
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_history JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en https://supabase.com/dashboard
-- 2. Navega a SQL Editor (izquierda)
-- 3. Crea un "New query"
-- 4. Pega TODO este script
-- 5. Click "Run"
-- 6. Verifica que no hay errores
-- ============================================
