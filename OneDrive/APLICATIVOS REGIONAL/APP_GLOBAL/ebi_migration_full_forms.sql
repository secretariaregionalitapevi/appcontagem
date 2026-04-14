-- Expansão dos formulários EBI para espelhar os campos do CADASTROMUSIC

ALTER TABLE public.ebi_criancas
    ADD COLUMN IF NOT EXISTS comum_congregacao TEXT,
    ADD COLUMN IF NOT EXISTS polo_participacao TEXT,
    ADD COLUMN IF NOT EXISTS nome_pai TEXT,
    ADD COLUMN IF NOT EXISTS pai_e_crente TEXT,
    ADD COLUMN IF NOT EXISTS nome_mae TEXT,
    ADD COLUMN IF NOT EXISTS mae_e_crente TEXT,
    ADD COLUMN IF NOT EXISTS pais_vivem_juntos TEXT,
    ADD COLUMN IF NOT EXISTS crianca_vive_com_os_pais TEXT,
    ADD COLUMN IF NOT EXISTS se_nao_vive_com_pais_com_quem_vive TEXT,
    ADD COLUMN IF NOT EXISTS tem_whatsapp TEXT,
    ADD COLUMN IF NOT EXISTS participa_reunioes_jovens_menores TEXT,
    ADD COLUMN IF NOT EXISTS participa_espaco_infantil TEXT,
    ADD COLUMN IF NOT EXISTS logradouro_numero TEXT,
    ADD COLUMN IF NOT EXISTS complemento TEXT,
    ADD COLUMN IF NOT EXISTS bairro TEXT,
    ADD COLUMN IF NOT EXISTS cidade TEXT,
    ADD COLUMN IF NOT EXISTS cep TEXT,
    ADD COLUMN IF NOT EXISTS dificuldade_aprendizagem TEXT,
    ADD COLUMN IF NOT EXISTS dificuldade_descricao TEXT,
    ADD COLUMN IF NOT EXISTS faz_terapia TEXT,
    ADD COLUMN IF NOT EXISTS terapia_especialidade TEXT;

ALTER TABLE public.ebi_monitores
    ADD COLUMN IF NOT EXISTS comum_congregacao TEXT,
    ADD COLUMN IF NOT EXISTS idade TEXT,
    ADD COLUMN IF NOT EXISTS batizado TEXT,
    ADD COLUMN IF NOT EXISTS data_batismo TEXT,
    ADD COLUMN IF NOT EXISTS polo_auxilio TEXT,
    ADD COLUMN IF NOT EXISTS musico_ou_musicista TEXT,
    ADD COLUMN IF NOT EXISTS oficializado TEXT,
    ADD COLUMN IF NOT EXISTS data_oficializacao TEXT,
    ADD COLUMN IF NOT EXISTS instrutor_atualmente TEXT,
    ADD COLUMN IF NOT EXISTS instrutor_em_qual_igreja TEXT,
    ADD COLUMN IF NOT EXISTS formacao_musica TEXT,
    ADD COLUMN IF NOT EXISTS formacao_qual TEXT,
    ADD COLUMN IF NOT EXISTS formacao_data TEXT,
    ADD COLUMN IF NOT EXISTS pedagogo TEXT,
    ADD COLUMN IF NOT EXISTS pedagogo_desde TEXT,
    ADD COLUMN IF NOT EXISTS atua_na_area TEXT,
    ADD COLUMN IF NOT EXISTS afinidade_criancas TEXT,
    ADD COLUMN IF NOT EXISTS cursos_conhecimentos TEXT,
    ADD COLUMN IF NOT EXISTS de_acordo_voluntario TEXT,
    ADD COLUMN IF NOT EXISTS autoriza_tratamento_dados TEXT;


