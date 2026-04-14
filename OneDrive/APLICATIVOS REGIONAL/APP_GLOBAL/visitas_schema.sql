-- Schema: Modulo de Visitas
-- Estrutura integrada para lancamentos mensais consolidados por comum.
-- Compatibilidade:
-- 1. Painel web usa public.visitas_lancamentos com referencia_ano/referencia_mes/municipio.
-- 2. App mobile usa public.visitas_lancamentos com mes_referencia/cidade/total
--    e consulta public.visitas_comuns para listar as comuns oficiais.

create extension if not exists pgcrypto;
create extension if not exists unaccent;

create or replace function public.get_my_role_id()
returns int
language sql
security definer
set search_path = public
as $$
    select role_id
    from public.profiles
    where user_id = auth.uid()
    limit 1;
$$;

create or replace function public.get_my_sector_name()
returns text
language sql
security definer
set search_path = public
as $$
    select sector
    from public.profiles
    where user_id = auth.uid()
    limit 1;
$$;

create or replace function public.can_manage_visitas()
returns boolean
language sql
security definer
set search_path = public
as $$
    select
        coalesce(public.get_my_role_id(), 99) <= 2
        or (
            coalesce(public.get_my_role_id(), 99) = 3
            and lower(unaccent(coalesce(public.get_my_sector_name(), ''))) = 'visitas'
        );
$$;

create table if not exists public.visitas_lancamentos (
    id uuid primary key default gen_random_uuid(),
    referencia_ano int not null default extract(year from current_date)::int check (referencia_ano between 2020 and 2100),
    referencia_mes int not null default extract(month from current_date)::int check (referencia_mes between 1 and 12),
    data_lancamento date not null default current_date,
    municipio text not null,
    comum text not null,
    codigo_comum text null,
    gvi int not null default 0 check (gvi >= 0),
    gvm int not null default 0 check (gvm >= 0),
    gvmu int not null default 0 check (gvmu >= 0),
    rf int not null default 0 check (rf >= 0),
    re int not null default 0 check (re >= 0),
    total_visitas int not null default 0,
    status text not null default 'Lançado',
    observacoes text null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    created_by uuid null,
    updated_by uuid null,
    constraint visitas_lancamentos_referencia_comum_key unique (referencia_ano, referencia_mes, comum)
);

alter table public.visitas_lancamentos
    add column if not exists mes_referencia int null,
    add column if not exists cidade text null,
    add column if not exists total int null,
    add column if not exists identificacao text null,
    add column if not exists ip text null,
    add column if not exists os text null,
    add column if not exists browser text null;

alter table public.visitas_lancamentos
    alter column referencia_ano set default extract(year from current_date)::int,
    alter column referencia_mes set default extract(month from current_date)::int,
    alter column data_lancamento set default current_date,
    alter column gvi set default 0,
    alter column gvm set default 0,
    alter column gvmu set default 0,
    alter column rf set default 0,
    alter column re set default 0,
    alter column total_visitas set default 0,
    alter column total set default 0,
    alter column status set default 'Lançado',
    alter column created_at set default timezone('utc', now()),
    alter column updated_at set default timezone('utc', now());

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'visitas_lancamentos_referencia_comum_key'
          and conrelid = 'public.visitas_lancamentos'::regclass
    ) then
        alter table public.visitas_lancamentos
            add constraint visitas_lancamentos_referencia_comum_key unique (referencia_ano, referencia_mes, comum);
    end if;
exception
    when unique_violation then
        raise notice 'Constraint visitas_lancamentos_referencia_comum_key nao criada porque existem registros duplicados.';
end;
$$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'visitas_lancamentos_mes_referencia_check'
          and conrelid = 'public.visitas_lancamentos'::regclass
    ) then
        alter table public.visitas_lancamentos
            add constraint visitas_lancamentos_mes_referencia_check
            check (mes_referencia is null or mes_referencia between 1 and 12);
    end if;
end;
$$;

create index if not exists idx_visitas_lancamentos_referencia
    on public.visitas_lancamentos (referencia_ano desc, referencia_mes desc);

create index if not exists idx_visitas_lancamentos_municipio
    on public.visitas_lancamentos (municipio);

create index if not exists idx_visitas_lancamentos_comum
    on public.visitas_lancamentos (comum);

create index if not exists idx_visitas_lancamentos_data_lancamento
    on public.visitas_lancamentos (data_lancamento desc);

create index if not exists idx_visitas_lancamentos_mes_referencia
    on public.visitas_lancamentos (mes_referencia);

create index if not exists idx_visitas_lancamentos_cidade
    on public.visitas_lancamentos (cidade);

create or replace function public.derive_visitas_municipio(raw_municipio text, raw_comum text)
returns text
language plpgsql
as $$
declare
    normalized text;
begin
    normalized := nullif(btrim(coalesce(raw_municipio, '')), '');
    if normalized is not null then
        return normalized;
    end if;

    normalized := regexp_replace(coalesce(raw_comum, ''), '^BR-\d+-\d+\s*-\s*', '', 'i');
    normalized := nullif(btrim(split_part(normalized, ' - ', 1)), '');

    if normalized is not null then
        return initcap(lower(normalized));
    end if;

    return null;
end;
$$;

create or replace function public.set_visitas_lancamentos_audit_fields()
returns trigger
language plpgsql
as $$
declare
    resolved_municipio text;
    resolved_total int;
begin
    if tg_op = 'INSERT' then
        new.created_at = coalesce(new.created_at, timezone('utc', now()));
        new.created_by = coalesce(new.created_by, auth.uid());
    end if;

    new.data_lancamento = coalesce(new.data_lancamento, current_date);
    new.referencia_ano = coalesce(new.referencia_ano, extract(year from new.data_lancamento)::int, extract(year from current_date)::int);
    new.referencia_mes = coalesce(new.referencia_mes, new.mes_referencia, extract(month from new.data_lancamento)::int, extract(month from current_date)::int);
    new.mes_referencia = coalesce(new.mes_referencia, new.referencia_mes);

    resolved_municipio := coalesce(
        public.derive_visitas_municipio(new.municipio, new.comum),
        public.derive_visitas_municipio(new.cidade, new.comum),
        nullif(btrim(coalesce(new.municipio, '')), ''),
        nullif(btrim(coalesce(new.cidade, '')), '')
    );

    new.municipio = resolved_municipio;
    new.cidade = coalesce(resolved_municipio, new.cidade, new.municipio);
    new.comum = nullif(btrim(coalesce(new.comum, '')), '');
    new.status = coalesce(nullif(btrim(coalesce(new.status, '')), ''), 'Lançado');
    new.gvi = greatest(coalesce(new.gvi, 0), 0);
    new.gvm = greatest(coalesce(new.gvm, 0), 0);
    new.gvmu = greatest(coalesce(new.gvmu, 0), 0);
    new.rf = greatest(coalesce(new.rf, 0), 0);
    new.re = greatest(coalesce(new.re, 0), 0);

    resolved_total := coalesce(new.gvi, 0) + coalesce(new.gvm, 0) + coalesce(new.gvmu, 0) + coalesce(new.rf, 0) + coalesce(new.re, 0);
    new.total = resolved_total;
    new.total_visitas = resolved_total;

    new.updated_at = timezone('utc', now());
    new.updated_by = auth.uid();

    return new;
end;
$$;

do $$
declare
    visitas_comuns_kind "char";
begin
    select c.relkind
    into visitas_comuns_kind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'visitas_comuns'
    limit 1;

    if visitas_comuns_kind in ('r', 'p') then
        execute format(
            'alter table public.visitas_comuns rename to %I',
            'visitas_comuns_legacy_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS')
        );
    elsif visitas_comuns_kind = 'f' then
        execute format(
            'alter foreign table public.visitas_comuns rename to %I',
            'visitas_comuns_legacy_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS')
        );
    elsif visitas_comuns_kind = 'm' then
        execute 'drop materialized view public.visitas_comuns';
    elsif visitas_comuns_kind = 'v' then
        execute 'drop view public.visitas_comuns';
    end if;
end;
$$;

create view public.visitas_comuns as
with base as (
    select
        to_jsonb(c) as row_data,
        nullif(btrim(coalesce(
            to_jsonb(c)->>'comum',
            to_jsonb(c)->>'nome_comum',
            to_jsonb(c)->>'nome',
            to_jsonb(c)->>'descricao',
            to_jsonb(c)->>'name',
            to_jsonb(c)->>'description'
        )), '') as comum_nome
    from public.comum c
),
normalized as (
    select
        coalesce(
            nullif(row_data->>'id', ''),
            md5(lower(coalesce(comum_nome, '') || '|' || coalesce(
                nullif(btrim(coalesce(row_data->>'cidade', row_data->>'municipio', row_data->>'localidade')), ''),
                public.derive_visitas_municipio(null, comum_nome),
                ''
            )))
        ) as id,
        comum_nome as comum,
        coalesce(
            nullif(btrim(coalesce(row_data->>'cidade', row_data->>'municipio', row_data->>'localidade')), ''),
            public.derive_visitas_municipio(null, comum_nome)
        ) as cidade
    from base
)
select distinct on (lower(comum), lower(cidade))
    id,
    comum,
    cidade
from normalized
where comum is not null
  and comum <> ''
order by lower(comum), lower(cidade), id;

drop trigger if exists trg_visitas_lancamentos_audit_fields on public.visitas_lancamentos;
create trigger trg_visitas_lancamentos_audit_fields
before insert or update on public.visitas_lancamentos
for each row
execute function public.set_visitas_lancamentos_audit_fields();

update public.visitas_lancamentos
set
    data_lancamento = coalesce(data_lancamento, current_date),
    referencia_ano = coalesce(referencia_ano, extract(year from coalesce(data_lancamento, current_date))::int),
    referencia_mes = coalesce(referencia_mes, mes_referencia, extract(month from coalesce(data_lancamento, current_date))::int),
    mes_referencia = coalesce(mes_referencia, referencia_mes, extract(month from coalesce(data_lancamento, current_date))::int),
    municipio = coalesce(
        public.derive_visitas_municipio(municipio, comum),
        public.derive_visitas_municipio(cidade, comum),
        municipio,
        cidade
    ),
    cidade = coalesce(
        public.derive_visitas_municipio(cidade, comum),
        public.derive_visitas_municipio(municipio, comum),
        cidade,
        municipio
    ),
    status = coalesce(nullif(btrim(coalesce(status, '')), ''), 'Lançado'),
    gvi = greatest(coalesce(gvi, 0), 0),
    gvm = greatest(coalesce(gvm, 0), 0),
    gvmu = greatest(coalesce(gvmu, 0), 0),
    rf = greatest(coalesce(rf, 0), 0),
    re = greatest(coalesce(re, 0), 0),
    total = coalesce(gvi, 0) + coalesce(gvm, 0) + coalesce(gvmu, 0) + coalesce(rf, 0) + coalesce(re, 0),
    total_visitas = coalesce(gvi, 0) + coalesce(gvm, 0) + coalesce(gvmu, 0) + coalesce(rf, 0) + coalesce(re, 0);

update public.profiles
set sector = 'Visitas'
where translate(lower(unaccent(coalesce(sector, ''))), 's', '') = 'viita';

grant all on table public.visitas_lancamentos to authenticated;
grant all on table public.visitas_lancamentos to service_role;
grant select on public.visitas_comuns to authenticated;
grant select on public.visitas_comuns to service_role;

alter table public.visitas_lancamentos enable row level security;

drop policy if exists visitas_lancamentos_select_authenticated on public.visitas_lancamentos;
create policy visitas_lancamentos_select_authenticated
on public.visitas_lancamentos
for select
to authenticated
using (true);

drop policy if exists visitas_lancamentos_insert_authenticated on public.visitas_lancamentos;
create policy visitas_lancamentos_insert_authenticated
on public.visitas_lancamentos
for insert
to authenticated
with check (public.can_manage_visitas());

drop policy if exists visitas_lancamentos_update_authenticated on public.visitas_lancamentos;
create policy visitas_lancamentos_update_authenticated
on public.visitas_lancamentos
for update
to authenticated
using (public.can_manage_visitas())
with check (public.can_manage_visitas());

drop policy if exists visitas_lancamentos_delete_authenticated on public.visitas_lancamentos;
create policy visitas_lancamentos_delete_authenticated
on public.visitas_lancamentos
for delete
to authenticated
using (public.can_manage_visitas());
