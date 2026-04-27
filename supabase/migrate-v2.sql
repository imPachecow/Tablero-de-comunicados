-- =====================================================
-- MIGRACIÓN v2 — IE La Gabriela
-- Actualiza el schema existente al nuevo diseño
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Actualizar tabla announcements
-- -------------------------------------------------------

-- Renombrar body → content
ALTER TABLE public.announcements
  RENAME COLUMN body TO content;

-- Agregar columnas nuevas
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS subtitle    TEXT,
  ADD COLUMN IF NOT EXISTS group_ids   UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pinned      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

-- Migrar datos: copiar group_id (viejo) al nuevo group_ids (array)
UPDATE public.announcements
  SET group_ids = ARRAY[group_id]
  WHERE group_id IS NOT NULL;

-- Eliminar columna vieja group_id
ALTER TABLE public.announcements
  DROP COLUMN IF EXISTS group_id;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.announcements;
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Crear tabla announcement_attachments
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.announcement_attachments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  file_size       BIGINT,
  file_type       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Actualizar tabla groups (quitar columna code si existe)
-- -------------------------------------------------------
ALTER TABLE public.groups
  DROP COLUMN IF EXISTS code;

-- 4. Actualizar RLS de announcements
-- -------------------------------------------------------

-- Eliminar políticas viejas
DROP POLICY IF EXISTS "Docentes gestionan sus anuncios"    ON public.announcements;
DROP POLICY IF EXISTS "Estudiantes ven anuncios de sus grupos" ON public.announcements;

-- Crear políticas nuevas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'announcements' AND policyname = 'Lectura pública de anuncios'
  ) THEN
    CREATE POLICY "Lectura pública de anuncios"
      ON public.announcements FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'announcements' AND policyname = 'Docentes crean anuncios'
  ) THEN
    CREATE POLICY "Docentes crean anuncios"
      ON public.announcements FOR INSERT
      WITH CHECK (teacher_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'announcements' AND policyname = 'Docentes modifican sus anuncios'
  ) THEN
    CREATE POLICY "Docentes modifican sus anuncios"
      ON public.announcements FOR UPDATE
      USING (teacher_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'announcements' AND policyname = 'Docentes eliminan sus anuncios'
  ) THEN
    CREATE POLICY "Docentes eliminan sus anuncios"
      ON public.announcements FOR DELETE
      USING (teacher_id = auth.uid());
  END IF;
END $$;

-- 5. RLS para announcement_attachments
-- -------------------------------------------------------

ALTER TABLE public.announcement_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de adjuntos"
  ON public.announcement_attachments FOR SELECT USING (true);

CREATE POLICY "Docentes insertan adjuntos"
  ON public.announcement_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_id AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Docentes eliminan adjuntos"
  ON public.announcement_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_id AND a.teacher_id = auth.uid()
    )
  );

-- 6. Actualizar RLS de groups (lectura pública)
-- -------------------------------------------------------

DROP POLICY IF EXISTS "Estudiantes ven sus grupos" ON public.groups;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'groups' AND policyname = 'Lectura pública de grupos'
  ) THEN
    CREATE POLICY "Lectura pública de grupos"
      ON public.groups FOR SELECT USING (true);
  END IF;
END $$;

-- 7. Bucket de storage para adjuntos
-- -------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
