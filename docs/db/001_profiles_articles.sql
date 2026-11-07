-- ==============================================================================
-- Skema Database TelU Knowledge: Profil Pengguna dan Editor Studio Artikel
-- Berkas: docs/db/001_profiles_articles.sql
-- ==============================================================================

-- 1. Ekstensi UUID & Kriptografi
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Tabel Profiles (Publik, berelasi 1:1 ke auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Menyimpan identitas publik pengguna sivitas akademika Telkom University.';
COMMENT ON COLUMN public.profiles.display_name IS 'Nama tampilan pengguna atau username.';
COMMENT ON COLUMN public.profiles.avatar_url IS 'Tautan gambar profil / avatar.';

-- Trigger otomatis membuat profil baru saat ada pendaftaran di auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    COALESCE(new.raw_user_meta_data->>'avatar_url', null)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 3. Tabel Articles (Editor Studio & Publikasi Artikel)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    subtitle TEXT NOT NULL DEFAULT '',
    cover_image_url TEXT,
    content JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
    excerpt TEXT NOT NULL DEFAULT '',
    reading_time_minutes INT4 NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft',
    slug TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_articles_status CHECK (status IN ('draft', 'published'))
);

COMMENT ON TABLE public.articles IS 'Menyimpan draft dan artikel terpublikasi milik sivitas akademika.';
COMMENT ON COLUMN public.articles.content IS 'Struktur dokumen Tiptap JSON yang telah disanitasi.';
COMMENT ON COLUMN public.articles.excerpt IS 'Ringkasan teks polos artikel maksimal 160 karakter.';
COMMENT ON COLUMN public.articles.reading_time_minutes IS 'Estimasi durasi membaca dalam menit (kata / 200, min 1).';

-- ==============================================================================
-- 4. Indeks Performa
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_articles_author_id
    ON public.articles(author_id);

CREATE INDEX IF NOT EXISTS idx_articles_author_status_updated_at
    ON public.articles(author_id, status, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_articles_status_published_at
    ON public.articles(status, published_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_articles_slug
    ON public.articles(slug);

-- ==============================================================================
-- 5. Trigger Pembaruan Otomatis updated_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_articles_updated_at ON public.articles;
CREATE TRIGGER trg_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 6. Row Level Security (RLS) & Policies
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Kebijakan Tabel Profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Kebijakan Tabel Articles
DROP POLICY IF EXISTS "Published articles are viewable by everyone" ON public.articles;
CREATE POLICY "Published articles are viewable by everyone"
    ON public.articles FOR SELECT
    USING (status = 'published');

DROP POLICY IF EXISTS "Authors can view own articles" ON public.articles;
CREATE POLICY "Authors can view own articles"
    ON public.articles FOR SELECT
    USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can insert own articles" ON public.articles;
CREATE POLICY "Authors can insert own articles"
    ON public.articles FOR INSERT
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update own articles" ON public.articles;
CREATE POLICY "Authors can update own articles"
    ON public.articles FOR UPDATE
    USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete own articles" ON public.articles;
CREATE POLICY "Authors can delete own articles"
    ON public.articles FOR DELETE
    USING (auth.uid() = author_id);

-- ==============================================================================
-- 7. Hak Akses (Permissions & Grants)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON TABLE public.profiles TO authenticated, service_role;
GRANT SELECT ON TABLE public.profiles TO anon;

GRANT ALL ON TABLE public.articles TO authenticated, service_role;
GRANT SELECT ON TABLE public.articles TO anon;
