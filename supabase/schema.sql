-- =====================================================
-- PLATAFORMA EDUCATIVA — IE LA GABRIELA
-- Schema simplificado: Grupos + Anuncios + Adjuntos
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: profiles  (solo docentes)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  role       TEXT NOT NULL DEFAULT 'teacher' CHECK (role = 'teacher'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: groups
-- Grupos/clases visibles públicamente
-- =====================================================
CREATE TABLE IF NOT EXISTS public.groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  teacher_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: announcements
-- Anuncios/comunicados de la docente
-- =====================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      TEXT NOT NULL,
  subtitle   TEXT,
  content    TEXT NOT NULL,        -- contenido HTML enriquecido
  group_ids  UUID[] NOT NULL DEFAULT '{}', -- grupos destinatarios
  teacher_id UUID NOT NULL REFERENCES public.profiles(id),
  pinned       BOOLEAN DEFAULT false,
  important    BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: announcement_attachments
-- Archivos adjuntos a los anuncios
-- =====================================================
CREATE TABLE IF NOT EXISTS public.announcement_attachments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_path       TEXT NOT NULL,  -- ruta en Supabase Storage bucket 'attachments'
  file_size       BIGINT,
  file_type       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FUNCIÓN: handle_new_user
-- Crea perfil de docente automáticamente al registrarse
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Docente'),
    'teacher'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- FUNCIÓN: update_updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_attachments ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Docente ve su propio perfil"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Docente actualiza su propio perfil"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- GROUPS — lectura pública (anon), escritura solo docente autenticado
CREATE POLICY "Lectura pública de grupos"
  ON public.groups FOR SELECT USING (true);

CREATE POLICY "Docentes crean grupos"
  ON public.groups FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Docentes modifican sus grupos"
  ON public.groups FOR UPDATE
  USING (teacher_id = auth.uid());

CREATE POLICY "Docentes eliminan sus grupos"
  ON public.groups FOR DELETE
  USING (teacher_id = auth.uid());

-- ANNOUNCEMENTS — lectura pública, escritura solo docente
CREATE POLICY "Lectura pública de anuncios"
  ON public.announcements FOR SELECT USING (true);

CREATE POLICY "Docentes crean anuncios"
  ON public.announcements FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Docentes modifican sus anuncios"
  ON public.announcements FOR UPDATE
  USING (teacher_id = auth.uid());

CREATE POLICY "Docentes eliminan sus anuncios"
  ON public.announcements FOR DELETE
  USING (teacher_id = auth.uid());

-- ATTACHMENTS — lectura pública, escritura solo docente (vía anuncio propio)
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

-- =====================================================
-- STORAGE: Bucket 'attachments' (público)
-- =====================================================
-- Ejecutar también en SQL Editor:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('attachments', 'attachments', true)
-- ON CONFLICT (id) DO NOTHING;
--
-- Políticas de storage (Dashboard → Storage → Policies):
--   SELECT: public (para que estudiantes puedan descargar)
--   INSERT: auth (solo docente autenticado)
--   DELETE: auth (solo docente autenticado)

-- =====================================================
-- CONFIGURACIÓN INICIAL
-- =====================================================
-- 1. Crear la cuenta de la docente en Auth Dashboard (email + contraseña)
-- 2. El trigger handle_new_user crea el perfil automáticamente
-- 3. Si necesitas ajustar el nombre:
--    UPDATE public.profiles
--    SET full_name = 'Nombre de la Docente'
--    WHERE email = 'docente@lagabriela.edu.co';
