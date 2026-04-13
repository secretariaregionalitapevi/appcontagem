-- Evita duplicidade de cadastro de criancas na musicalizacao
-- considerando nome, nascimento, polo/comum e celular do responsavel.

CREATE UNIQUE INDEX IF NOT EXISTS musicalizacao_criancas_unique_guard_idx
ON public.musicalizacao_criancas (
    lower(trim(coalesce(nome_crianca, ''))),
    trim(coalesce(data_nascimento, '')),
    lower(trim(coalesce(nullif(polo_participacao, ''), comum_congregacao, ''))),
    regexp_replace(coalesce(celular_responsavel, ''), '\D', '', 'g')
);
