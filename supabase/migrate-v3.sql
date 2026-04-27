-- =====================================================
-- MIGRACIÓN v3 — IE La Gabriela
-- Agrega: scheduled_at, important a announcements
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS important     BOOLEAN DEFAULT false;

-- =====================================================
-- FIN DE MIGRACIÓN v3
-- =====================================================
