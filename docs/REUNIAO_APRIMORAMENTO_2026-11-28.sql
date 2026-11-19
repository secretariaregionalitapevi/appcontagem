-- Confirmação pública: Reunião de Aprimoramento Musical, 28/11/2026.
-- Execute uma vez no SQL Editor do mesmo projeto Supabase do aplicativo.
-- Não altera os dados do cadastro, usuários, ensaios ou filas existentes.
begin;

create or replace function public.ram_normalize(value text)
returns text language sql immutable set search_path = ''
as $$
  select pg_catalog.regexp_replace(
    pg_catalog.translate(pg_catalog.upper(pg_catalog.btrim(coalesce(value, ''))),
      'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOOUUUUC'),
    '\s+', ' ', 'g');
$$;
revoke all on function public.ram_normalize(text) from public, anon, authenticated;
-- Função pura, sem acesso a tabelas. Escritas existentes no cadastro também
-- precisam poder calcular a expressão do índice abaixo.
grant execute on function public.ram_normalize(text) to anon, authenticated, service_role;

create index if not exists ram_cadastro_city_common_idx on public.cadastro (
  public.ram_normalize(cidade),
  md5(public.ram_normalize(cidade) || '|' || public.ram_normalize(comum))
);

create table if not exists public.reunioes_publicas (
  slug text primary key,
  titulo text not null,
  data_evento date not null,
  local_evento text not null,
  horario text,
  inscricoes_abertas boolean not null default true,
  encerramento timestamptz not null
);
create table if not exists public.confirmacoes_reuniao (
  id uuid primary key default gen_random_uuid(),
  evento_slug text not null references public.reunioes_publicas(slug),
  pessoa_id text not null,
  nome text not null,
  municipio text not null,
  comum text not null,
  cargo text,
  municipio_chave text not null,
  comum_chave text not null,
  nome_chave text not null,
  confirmado_em timestamptz not null default now(),
  unique (evento_slug, pessoa_id),
  unique (evento_slug, municipio_chave, comum_chave, nome_chave)
);
alter table public.reunioes_publicas enable row level security;
alter table public.confirmacoes_reuniao enable row level security;
revoke all on table public.reunioes_publicas, public.confirmacoes_reuniao from anon, authenticated;
grant all on table public.reunioes_publicas, public.confirmacoes_reuniao to service_role;
create index if not exists confirmacoes_reuniao_evento_idx on public.confirmacoes_reuniao(evento_slug, confirmado_em);

insert into public.reunioes_publicas(slug,titulo,data_evento,local_evento,horario,encerramento)
values ('aprimoramento-musical-2026-11-28','Reunião de Aprimoramento Musical','2026-11-28','Central de Itapevi','09h00','2026-11-29 03:00:00+00')
on conflict (slug) do update set horario=coalesce(public.reunioes_publicas.horario,excluded.horario);

create or replace function public.ram_public_catalog(p_evento text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_evento public.reunioes_publicas%rowtype; v_municipios jsonb;
begin
  select * into v_evento from public.reunioes_publicas where slug = p_evento;
  if not found then raise exception 'EVENTO_INDISPONIVEL' using errcode = '22023'; end if;
  with comuns as (
    select public.ram_normalize(c.cidade) as municipio_chave,
      min(btrim(c.cidade)) as municipio_nome,
      md5(public.ram_normalize(c.cidade) || '|' || public.ram_normalize(c.comum)) as comum_chave,
      min(btrim(c.comum)) as comum_nome
    from public.cadastro c
    where nullif(btrim(c.cidade),'') is not null and nullif(btrim(c.comum),'') is not null
      and nullif(btrim(c.nome),'') is not null
    group by public.ram_normalize(c.cidade), public.ram_normalize(c.comum)
  ), municipios as (
    select municipio_chave, min(municipio_nome) as nome,
      jsonb_agg(jsonb_build_object('id',comum_chave,'nome',comum_nome) order by comum_nome) as comuns
    from comuns group by municipio_chave
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',municipio_chave,'nome',nome,'comuns',comuns) order by nome),'[]'::jsonb)
    into v_municipios from municipios;
  return jsonb_build_object('evento',jsonb_build_object(
    'slug',v_evento.slug,'titulo',v_evento.titulo,'data',v_evento.data_evento,
    'local',v_evento.local_evento,'horario',v_evento.horario,
    'aberto',v_evento.inscricoes_abertas and now() < v_evento.encerramento
  ),'municipios',v_municipios);
end;
$$;

create or replace function public.ram_public_people(p_evento text,p_municipio text,p_comum text,p_busca text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  if not exists(select 1 from public.reunioes_publicas where slug=p_evento and inscricoes_abertas and now()<encerramento)
    then raise exception 'INSCRICOES_ENCERRADAS' using errcode='22023'; end if;
  if char_length(public.ram_normalize(p_busca)) not between 2 and 80 or char_length(p_municipio)>150 or char_length(p_comum)<>32
    then return '[]'::jsonb; end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nome',p.nome,'cargo',p.cargo) order by p.nome),'[]'::jsonb)
    from (
      select distinct on (public.ram_normalize(c.nome)) c.id::text as id, btrim(c.nome) as nome, c.cargo
      from public.cadastro c
      where public.ram_normalize(c.cidade)=p_municipio
        and md5(public.ram_normalize(c.cidade)||'|'||public.ram_normalize(c.comum))=p_comum
        and strpos(public.ram_normalize(c.nome),public.ram_normalize(p_busca))>0
      order by public.ram_normalize(c.nome),c.id::text limit 25
    ) p
  );
end;
$$;

create or replace function public.ram_public_confirm(p_evento text,p_municipio text,p_comum text,p_pessoa text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_pessoa record; v_id uuid; v_receipt record;
begin
  if not exists(select 1 from public.reunioes_publicas where slug=p_evento and inscricoes_abertas and now()<encerramento)
    then raise exception 'INSCRICOES_ENCERRADAS' using errcode='22023'; end if;
  if p_pessoa is null or char_length(p_pessoa)>150 or p_municipio is null or char_length(p_municipio)>150 or char_length(p_comum)<>32
    then raise exception 'PARTICIPANTE_INVALIDO' using errcode='22023'; end if;
  select c.id::text as id,btrim(c.nome) as nome,btrim(c.cidade) as cidade,btrim(c.comum) as comum,c.cargo
    into v_pessoa from public.cadastro c
    where c.id::text=p_pessoa and public.ram_normalize(c.cidade)=p_municipio
      and md5(public.ram_normalize(c.cidade)||'|'||public.ram_normalize(c.comum))=p_comum;
  if not found or nullif(v_pessoa.nome,'') is null
    then raise exception 'PARTICIPANTE_INVALIDO' using errcode='22023'; end if;
  insert into public.confirmacoes_reuniao(evento_slug,pessoa_id,nome,municipio,comum,cargo,municipio_chave,comum_chave,nome_chave)
    values(p_evento,v_pessoa.id,v_pessoa.nome,v_pessoa.cidade,v_pessoa.comum,v_pessoa.cargo,p_municipio,p_comum,public.ram_normalize(v_pessoa.nome))
    on conflict do nothing returning id into v_id;
  select id,confirmado_em into v_receipt from public.confirmacoes_reuniao
    where evento_slug=p_evento and (pessoa_id=p_pessoa or
      (municipio_chave=p_municipio and comum_chave=p_comum and nome_chave=public.ram_normalize(v_pessoa.nome)))
    order by confirmado_em limit 1;
  return jsonb_build_object('id',v_receipt.id,'confirmado_em',v_receipt.confirmado_em,'ja_confirmado',v_id is null);
end;
$$;

revoke all on function public.ram_public_catalog(text), public.ram_public_people(text,text,text,text),
  public.ram_public_confirm(text,text,text,text) from public, anon, authenticated;
grant execute on function public.ram_public_catalog(text), public.ram_public_people(text,text,text,text),
  public.ram_public_confirm(text,text,text,text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
