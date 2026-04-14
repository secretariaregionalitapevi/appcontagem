-- Adiciona os campos usados pela tela de perfil do usuario logado.
-- Pode ser executada com seguranca mais de uma vez.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS cargo TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.profiles.cargo IS
    'Cargo exibido no menu lateral e no topo do sistema.';

COMMENT ON COLUMN public.profiles.avatar_url IS
    'URL ou data URL da imagem de perfil do usuario.';
