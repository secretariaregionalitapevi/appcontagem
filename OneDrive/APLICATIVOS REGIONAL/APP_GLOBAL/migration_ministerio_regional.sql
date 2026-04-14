create extension if not exists pgcrypto;
create extension if not exists unaccent;

create table if not exists public.ministerio_regional (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    data_apresentacao date null,
    ministerio text not null,
    comum text null,
    municipio text null,
    administracao text null,
    rrm text null,
    aprovador_rrm text null,
    cadastro_completo boolean not null default false,
    status text not null default 'Ativo',
    possui_foto boolean not null default false,
    sexo text null,
    observacoes text null,
    origem_importacao text null,
    imported_at timestamptz null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    created_by uuid null references auth.users(id) on delete set null,
    updated_by uuid null references auth.users(id) on delete set null
);

do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'data_apresentacao'
    ) then
        alter table public.ministerio_regional add column data_apresentacao date null;
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'data_ordenacao'
    ) then
        alter table public.ministerio_regional add column data_ordenacao date null;
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'comum'
    ) then
        alter table public.ministerio_regional add column comum text null;
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'municipio'
    ) then
        alter table public.ministerio_regional add column municipio text null;
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'administracao'
    ) then
        alter table public.ministerio_regional add column administracao text null;
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'rrm'
    ) then
        alter table public.ministerio_regional add column rrm text null;
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'aprovador_rrm'
    ) then
        alter table public.ministerio_regional add column aprovador_rrm text null;
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'cadastro_completo'
    ) then
        alter table public.ministerio_regional add column cadastro_completo boolean not null default false;
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'status'
    ) then
        alter table public.ministerio_regional add column status text not null default 'Ativo';
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'possui_foto'
    ) then
        alter table public.ministerio_regional add column possui_foto boolean not null default false;
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'sexo'
    ) then
        alter table public.ministerio_regional add column sexo text null;
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'observacoes'
    ) then
        alter table public.ministerio_regional add column observacoes text null;
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'origem_importacao'
    ) then
        alter table public.ministerio_regional add column origem_importacao text null;
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'imported_at'
    ) then
        alter table public.ministerio_regional add column imported_at timestamptz null;
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'created_at'
    ) then
        alter table public.ministerio_regional add column created_at timestamptz not null default timezone('utc', now());
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'updated_at'
    ) then
        alter table public.ministerio_regional add column updated_at timestamptz not null default timezone('utc', now());
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'created_by'
    ) then
        alter table public.ministerio_regional add column created_by uuid null references auth.users(id) on delete set null;
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ministerio_regional' and column_name = 'updated_by'
    ) then
        alter table public.ministerio_regional add column updated_by uuid null references auth.users(id) on delete set null;
    end if;
end $$;

update public.ministerio_regional
set
    status = coalesce(nullif(btrim(status), ''), 'Ativo'),
    cadastro_completo = coalesce(cadastro_completo, false),
    possui_foto = coalesce(possui_foto, false),
    sexo = case
        when upper(coalesce(sexo, '')) in ('M', 'MASC', 'MASCULINO') then 'Masculino'
        when upper(coalesce(sexo, '')) in ('F', 'FEM', 'FEMININO') then 'Feminino'
        else nullif(btrim(sexo), '')
    end,
    municipio = coalesce(nullif(btrim(municipio), ''), nullif(trim(split_part(administracao, ' - ', 1)), '')),
    created_at = coalesce(created_at, timezone('utc', now())),
    updated_at = coalesce(updated_at, timezone('utc', now()))
where
    status is null
    or btrim(status) = ''
    or cadastro_completo is null
    or possui_foto is null
    or created_at is null
    or updated_at is null
    or sexo in ('M', 'F')
    or municipio is null
    or btrim(municipio) = '';

alter table public.ministerio_regional
    alter column cadastro_completo set default false,
    alter column status set default 'Ativo',
    alter column possui_foto set default false,
    alter column created_at set default timezone('utc', now()),
    alter column updated_at set default timezone('utc', now());

do $$
begin
    if exists (
        select 1
        from public.ministerio_regional
        where nome is null
           or btrim(nome) = ''
           or ministerio is null
           or btrim(ministerio) = ''
    ) then
        raise exception 'Existem registros em public.ministerio_regional com nome ou ministerio vazios. Corrija os dados antes de aplicar os NOT NULL.';
    end if;
end $$;

alter table public.ministerio_regional
    alter column nome set not null,
    alter column ministerio set not null,
    alter column cadastro_completo set not null,
    alter column status set not null,
    alter column possui_foto set not null;

do $$
begin
    if exists (
        select 1
        from pg_constraint
        where conname = 'ministerio_regional_status_check'
    ) then
        alter table public.ministerio_regional drop constraint ministerio_regional_status_check;
    end if;

    if exists (
        select 1
        from pg_constraint
        where conname = 'ministerio_regional_sexo_check'
    ) then
        alter table public.ministerio_regional drop constraint ministerio_regional_sexo_check;
    end if;

    alter table public.ministerio_regional
        add constraint ministerio_regional_status_check
        check (status in ('Ativo', 'Inativo', 'Licenciado', 'Afastado'));

    alter table public.ministerio_regional
        add constraint ministerio_regional_sexo_check
        check (sexo is null or sexo in ('Masculino', 'Feminino'));
end $$;

create index if not exists idx_ministerio_regional_nome on public.ministerio_regional (nome);
create index if not exists idx_ministerio_regional_ministerio on public.ministerio_regional (ministerio);
create index if not exists idx_ministerio_regional_municipio on public.ministerio_regional (municipio);
create index if not exists idx_ministerio_regional_status on public.ministerio_regional (status);
create index if not exists idx_ministerio_regional_comum on public.ministerio_regional (comum);
create unique index if not exists uq_ministerio_regional_nome_ministerio_comum
    on public.ministerio_regional (nome, ministerio, comum);

create table if not exists public.ministerio_regional_import (
    id uuid primary key default gen_random_uuid(),
    nome text null,
    data_apresentacao text null,
    ministerio text null,
    comum text null,
    municipio text null,
    administracao text null,
    rrm text null,
    aprovador_rrm text null,
    cadastro_compleeto text null,
    status text null,
    possui_foto text null,
    sexo text null,
    source_file text null,
    imported_at timestamptz not null default timezone('utc', now()),
    processed_at timestamptz null,
    ministerio_regional_id uuid null references public.ministerio_regional(id) on delete set null,
    observacoes_processamento text null
);

create index if not exists idx_ministerio_regional_import_processed_at
    on public.ministerio_regional_import (processed_at);

create or replace function public.get_my_role_id()
returns int
language sql
security definer
as $$
    select role_id
    from public.profiles
    where user_id = auth.uid()
    limit 1;
$$;

create or replace function public.normalize_ministerio_regional_date(value text)
returns date
language plpgsql
as $$
declare
    normalized text;
begin
    normalized := nullif(btrim(coalesce(value, '')), '');

    if normalized is null or normalized = '-' then
        return null;
    end if;

    begin
        return to_date(normalized, 'DD/MM/YYYY');
    exception
        when others then
            return null;
    end;
end;
$$;

create or replace function public.normalize_ministerio_regional_boolean(value text)
returns boolean
language plpgsql
as $$
declare
    normalized text;
begin
    normalized := lower(unaccent(coalesce(value, '')));
    normalized := regexp_replace(normalized, '\s+', '', 'g');

    if normalized in ('sim', 's', 'true', '1', 'ok') then
        return true;
    end if;

    if normalized in ('nao', 'n', 'false', '0', 'imp.', 'imp', '-') then
        return false;
    end if;

    return false;
end;
$$;

create or replace function public.normalize_ministerio_regional_sexo(value text)
returns text
language plpgsql
as $$
declare
    normalized text;
begin
    normalized := upper(unaccent(nullif(btrim(coalesce(value, '')), '')));

    if normalized in ('M', 'MASC', 'MASCULINO') then
        return 'Masculino';
    end if;

    if normalized in ('F', 'FEM', 'FEMININO') then
        return 'Feminino';
    end if;

    return null;
end;
$$;

create or replace function public.derive_ministerio_regional_municipio(
    raw_municipio text,
    raw_administracao text,
    raw_comum text
)
returns text
language plpgsql
as $$
declare
    municipio text;
    comum_part text;
begin
    municipio := nullif(btrim(coalesce(raw_municipio, '')), '');
    if municipio is not null then
        return municipio;
    end if;

    municipio := nullif(trim(split_part(coalesce(raw_administracao, ''), ' - ', 1)), '');
    if municipio is not null then
        return initcap(lower(municipio));
    end if;

    comum_part := regexp_replace(coalesce(raw_comum, ''), '^BR-\d+-\d+\s*-\s*', '', 'i');
    municipio := nullif(trim(split_part(comum_part, ' - ', 1)), '');
    if municipio is not null then
        return initcap(lower(municipio));
    end if;

    return null;
end;
$$;

create or replace function public.set_ministerio_regional_audit_fields()
returns trigger
language plpgsql
as $$
begin
    if tg_op = 'INSERT' then
        new.created_at = coalesce(new.created_at, timezone('utc', now()));
        new.created_by = coalesce(new.created_by, auth.uid());
    end if;

    if new.sexo is not null then
        new.sexo = public.normalize_ministerio_regional_sexo(new.sexo);
    end if;

    if coalesce(btrim(new.municipio), '') = '' then
        new.municipio = public.derive_ministerio_regional_municipio(new.municipio, new.administracao, new.comum);
    end if;

    new.updated_at = timezone('utc', now());
    new.updated_by = auth.uid();

    return new;
end;
$$;

drop trigger if exists trg_ministerio_regional_updated_at on public.ministerio_regional;
drop trigger if exists trg_ministerio_regional_audit_fields on public.ministerio_regional;
create trigger trg_ministerio_regional_audit_fields
before insert or update on public.ministerio_regional
for each row
execute function public.set_ministerio_regional_audit_fields();

create or replace function public.process_ministerio_regional_import()
returns table (
    importado integer,
    atualizados integer,
    ignorados integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
    rec record;
    v_existing_id uuid;
    v_target_id uuid;
    v_inserted integer := 0;
    v_updated integer := 0;
    v_ignored integer := 0;
begin
    for rec in
        select *
        from public.ministerio_regional_import
        where processed_at is null
        order by imported_at, nome nulls last
    loop
        if nullif(btrim(coalesce(rec.nome, '')), '') is null
           or nullif(btrim(coalesce(rec.ministerio, '')), '') is null then
            update public.ministerio_regional_import
            set
                processed_at = timezone('utc', now()),
                observacoes_processamento = 'Ignorado: nome ou ministerio vazio.'
            where id = rec.id;

            v_ignored := v_ignored + 1;
            continue;
        end if;

        select mr.id
        into v_existing_id
        from public.ministerio_regional mr
        where mr.nome = btrim(rec.nome)
          and mr.ministerio = btrim(rec.ministerio)
          and coalesce(mr.comum, '') = coalesce(btrim(rec.comum), '')
        limit 1;

        if v_existing_id is null then
            insert into public.ministerio_regional (
                nome,
                data_apresentacao,
                ministerio,
                comum,
                municipio,
                administracao,
                rrm,
                aprovador_rrm,
                cadastro_completo,
                status,
                possui_foto,
                sexo,
                origem_importacao,
                imported_at,
                observacoes
            ) values (
                btrim(rec.nome),
                public.normalize_ministerio_regional_date(rec.data_apresentacao),
                btrim(rec.ministerio),
                nullif(btrim(coalesce(rec.comum, '')), ''),
                public.derive_ministerio_regional_municipio(rec.municipio, rec.administracao, rec.comum),
                nullif(btrim(coalesce(rec.administracao, '')), ''),
                nullif(btrim(coalesce(rec.rrm, '')), ''),
                nullif(btrim(coalesce(rec.aprovador_rrm, '')), ''),
                public.normalize_ministerio_regional_boolean(rec.cadastro_compleeto),
                coalesce(nullif(btrim(rec.status), ''), 'Ativo'),
                public.normalize_ministerio_regional_boolean(rec.possui_foto),
                public.normalize_ministerio_regional_sexo(rec.sexo),
                coalesce(nullif(btrim(rec.source_file), ''), 'CSV Ministerio Regional'),
                coalesce(rec.imported_at, timezone('utc', now())),
                case
                    when lower(unaccent(coalesce(rec.cadastro_compleeto, ''))) in ('imp.', 'imp') then 'Importado com cadastro incompleto (origem CSV).'
                    else null
                end
            )
            returning id into v_target_id;

            v_inserted := v_inserted + 1;
        else
            update public.ministerio_regional
            set
                data_apresentacao = coalesce(public.normalize_ministerio_regional_date(rec.data_apresentacao), public.ministerio_regional.data_apresentacao),
                comum = coalesce(nullif(btrim(coalesce(rec.comum, '')), ''), public.ministerio_regional.comum),
                municipio = coalesce(public.derive_ministerio_regional_municipio(rec.municipio, rec.administracao, rec.comum), public.ministerio_regional.municipio),
                administracao = coalesce(nullif(btrim(coalesce(rec.administracao, '')), ''), public.ministerio_regional.administracao),
                rrm = coalesce(nullif(btrim(coalesce(rec.rrm, '')), ''), public.ministerio_regional.rrm),
                aprovador_rrm = coalesce(nullif(btrim(coalesce(rec.aprovador_rrm, '')), ''), public.ministerio_regional.aprovador_rrm),
                cadastro_completo = public.normalize_ministerio_regional_boolean(rec.cadastro_compleeto),
                status = coalesce(nullif(btrim(rec.status), ''), public.ministerio_regional.status),
                possui_foto = public.normalize_ministerio_regional_boolean(rec.possui_foto),
                sexo = coalesce(public.normalize_ministerio_regional_sexo(rec.sexo), public.ministerio_regional.sexo),
                origem_importacao = coalesce(nullif(btrim(rec.source_file), ''), public.ministerio_regional.origem_importacao),
                imported_at = coalesce(rec.imported_at, public.ministerio_regional.imported_at)
            where id = v_existing_id
            returning id into v_target_id;

            v_updated := v_updated + 1;
        end if;

        update public.ministerio_regional_import
        set
            processed_at = timezone('utc', now()),
            ministerio_regional_id = v_target_id,
            observacoes_processamento = 'Processado com sucesso.'
        where id = rec.id;
    end loop;

    return query
    select v_inserted, v_updated, v_ignored;
end;
$$;

alter table public.ministerio_regional enable row level security;
alter table public.ministerio_regional_import enable row level security;

drop policy if exists ministerio_regional_select_authenticated on public.ministerio_regional;
create policy ministerio_regional_select_authenticated
on public.ministerio_regional
for select
to authenticated
using (true);

drop policy if exists ministerio_regional_insert_authenticated on public.ministerio_regional;
create policy ministerio_regional_insert_authenticated
on public.ministerio_regional
for insert
to authenticated
with check (coalesce(public.get_my_role_id(), 99) <= 2);

drop policy if exists ministerio_regional_update_authenticated on public.ministerio_regional;
create policy ministerio_regional_update_authenticated
on public.ministerio_regional
for update
to authenticated
using (coalesce(public.get_my_role_id(), 99) <= 2)
with check (coalesce(public.get_my_role_id(), 99) <= 2);

drop policy if exists ministerio_regional_delete_authenticated on public.ministerio_regional;
create policy ministerio_regional_delete_authenticated
on public.ministerio_regional
for delete
to authenticated
using (coalesce(public.get_my_role_id(), 99) <= 2);

drop policy if exists ministerio_regional_import_select_authenticated on public.ministerio_regional_import;
create policy ministerio_regional_import_select_authenticated
on public.ministerio_regional_import
for select
to authenticated
using (coalesce(public.get_my_role_id(), 99) <= 2);

drop policy if exists ministerio_regional_import_insert_authenticated on public.ministerio_regional_import;
create policy ministerio_regional_import_insert_authenticated
on public.ministerio_regional_import
for insert
to authenticated
with check (coalesce(public.get_my_role_id(), 99) <= 2);

drop policy if exists ministerio_regional_import_update_authenticated on public.ministerio_regional_import;
create policy ministerio_regional_import_update_authenticated
on public.ministerio_regional_import
for update
to authenticated
using (coalesce(public.get_my_role_id(), 99) <= 2)
with check (coalesce(public.get_my_role_id(), 99) <= 2);

drop policy if exists ministerio_regional_import_delete_authenticated on public.ministerio_regional_import;
create policy ministerio_regional_import_delete_authenticated
on public.ministerio_regional_import
for delete
to authenticated
using (coalesce(public.get_my_role_id(), 99) <= 2);
