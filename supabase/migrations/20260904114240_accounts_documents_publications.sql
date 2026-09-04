create schema if not exists private;
revoke all on schema private from public;

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  content text not null check (octet_length(content) <= 1048576),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create index documents_owner_id_idx on public.documents(owner_id);
create index documents_owner_updated_at_idx on public.documents(owner_id, updated_at desc);

create table public.publications (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  public_token text not null unique check (public_token ~ '^[A-Za-z0-9_-]{32}$'),
  title text not null check (char_length(title) between 1 and 200),
  content text not null check (octet_length(content) <= 1048576),
  source_version integer not null check (source_version > 0),
  published_at timestamptz not null default now(),
  unique (document_id),
  foreign key (document_id, owner_id)
    references public.documents(id, owner_id)
    on delete cascade
);

create index publications_owner_id_idx on public.publications(owner_id);
create index publications_public_token_idx on public.publications(public_token);

create table public.document_imports (
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_document_id uuid not null,
  document_id uuid not null,
  imported_at timestamptz not null default now(),
  primary key (owner_id, local_document_id),
  unique (document_id),
  foreign key (document_id, owner_id)
    references public.documents(id, owner_id)
    on delete cascade
);

create index document_imports_document_id_idx on public.document_imports(document_id);

create table public.rate_limit_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

create index rate_limit_buckets_window_idx on public.rate_limit_buckets(window_started_at);

create function private.set_document_update_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := old.id;
  new.owner_id := old.owner_id;
  new.created_at := old.created_at;
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger documents_set_update_metadata
before update on public.documents
for each row execute function private.set_document_update_metadata();

create function private.enforce_document_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  document_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.owner_id::text, 0));
  select count(*) into document_count
  from public.documents
  where owner_id = new.owner_id;

  if document_count >= 500 then
    raise exception 'document_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger documents_enforce_limit
before insert on public.documents
for each row execute function private.enforce_document_limit();

create function public.consume_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean;
begin
  if p_limit <= 0 or p_window_seconds <= 0 or char_length(p_bucket_key) <> 64 then
    return false;
  end if;

  insert into public.rate_limit_buckets as bucket (
    bucket_key,
    window_started_at,
    request_count
  ) values (
    p_bucket_key,
    now(),
    1
  )
  on conflict (bucket_key) do update
  set
    window_started_at = case
      when bucket.window_started_at <= now() - pg_catalog.make_interval(secs => p_window_seconds)
        then now()
      else bucket.window_started_at
    end,
    request_count = case
      when bucket.window_started_at <= now() - pg_catalog.make_interval(secs => p_window_seconds)
        then 1
      else bucket.request_count + 1
    end
  returning request_count <= p_limit into allowed;

  if random() < 0.01 then
    delete from public.rate_limit_buckets
    where window_started_at < now() - interval '1 day';
  end if;

  return allowed;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

alter table public.documents enable row level security;
alter table public.publications enable row level security;
alter table public.document_imports enable row level security;
alter table public.rate_limit_buckets enable row level security;

revoke all on public.documents from anon, authenticated;
revoke all on public.publications from anon, authenticated;
revoke all on public.document_imports from anon, authenticated;
revoke all on public.rate_limit_buckets from anon, authenticated;

grant select on public.documents to authenticated;
grant insert (owner_id, title, content, created_at) on public.documents to authenticated;
grant update (title, content) on public.documents to authenticated;
grant delete on public.documents to authenticated;

grant select on public.publications to authenticated;
grant insert (document_id, owner_id, public_token, title, content, source_version, published_at)
  on public.publications to authenticated;
grant update (title, content, source_version, published_at)
  on public.publications to authenticated;
grant delete on public.publications to authenticated;

grant select on public.document_imports to authenticated;
grant insert (owner_id, local_document_id, document_id)
  on public.document_imports to authenticated;

create policy documents_select_own
on public.documents for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy documents_insert_own
on public.documents for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy documents_update_own
on public.documents for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy documents_delete_own
on public.documents for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy publications_select_own
on public.publications for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy publications_insert_own
on public.publications for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy publications_update_own
on public.publications for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy publications_delete_own
on public.publications for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy document_imports_select_own
on public.document_imports for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy document_imports_insert_own
on public.document_imports for insert
to authenticated
with check ((select auth.uid()) = owner_id);
