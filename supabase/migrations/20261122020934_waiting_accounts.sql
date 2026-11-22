-- The waiting page has no relationship to legacy profile identities or Auth grants.
create extension if not exists pgcrypto with schema extensions;
create schema waiting_accounts;
revoke all on schema waiting_accounts from public, anon, authenticated, service_role;
grant usage on schema waiting_accounts to service_role;

create table waiting_accounts.accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null check ((username collate pg_catalog."C") ~ '^[A-Za-z0-9_]{3,24}$'),
  username_key text generated always as (lower(username collate pg_catalog."C")) stored unique,
  email text not null unique check (length(email) between 3 and 254),
  password_hash text not null check (length(password_hash) = 60)
);

create table waiting_accounts.sessions (
  token_hash bytea primary key check (octet_length(token_hash) = 32),
  account_id uuid not null references waiting_accounts.accounts(id) on delete cascade,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null
);
create index waiting_accounts_sessions_owner on waiting_accounts.sessions (account_id, created_at desc, token_hash);
create index waiting_accounts_sessions_expiry on waiting_accounts.sessions (expires_at);

create table waiting_accounts.rate_buckets (
  scope text not null check (scope in ('signup', 'login', 'session', 'logout')),
  dimension text not null check (dimension in ('global', 'client', 'identity')),
  subject bytea not null check (octet_length(subject) in (0,32)),
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0),
  primary key (scope, dimension, subject)
);
create index waiting_accounts_rate_expiry on waiting_accounts.rate_buckets (window_start);

alter table waiting_accounts.accounts enable row level security;
alter table waiting_accounts.sessions enable row level security;
alter table waiting_accounts.rate_buckets enable row level security;
revoke all on all tables in schema waiting_accounts from public, anon, authenticated, service_role;

create function waiting_accounts.consume_limit(
  p_scope text, p_dimension text, p_subject bytea, p_window timestamptz, p_limit integer
) returns boolean
language plpgsql set search_path = '' as $$
declare
  v_allowed boolean;
begin
  insert into waiting_accounts.rate_buckets as bucket (scope, dimension, subject, window_start, attempts)
    values (p_scope, p_dimension, p_subject, p_window, 1)
    on conflict (scope, dimension, subject) do update
      set window_start = excluded.window_start,
          attempts = case when bucket.window_start < excluded.window_start then 1 else bucket.attempts + 1 end
      where bucket.window_start < excluded.window_start
        or (bucket.window_start = excluded.window_start and bucket.attempts < p_limit)
    returning true into v_allowed;
  return coalesce(v_allowed, false);
end;
$$;

create function waiting_accounts.rate(p_scope text, p_client text, p_identity text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := statement_timestamp();
  v_epoch constant timestamptz := '2000-01-01T00:00:00Z';
  v_short timestamptz := date_bin('1 minute', v_now, v_epoch);
  v_long timestamptz := date_bin('15 minutes', v_now, v_epoch);
  v_global integer;
  v_client integer;
begin
  if p_client is null or p_client !~ '^[0-9a-f]{64}$'
      or (p_scope = 'login' and (p_identity is null or p_identity !~ '^[0-9a-f]{64}$')) then
    return false;
  end if;

  case p_scope
    when 'signup' then v_global := 30; v_client := 4;
    when 'login' then v_global := 100; v_client := 12;
    when 'session' then v_global := 500; v_client := 100;
    when 'logout' then v_global := 100; v_client := 40;
    else return false;
  end case;

  -- Reserve the global budget before writing client rows, which bounds cardinality.
  if not waiting_accounts.consume_limit(p_scope, 'global', ''::bytea, v_short, v_global) then
    return false;
  end if;

  -- Opportunistic cleanup keeps expired rows from accumulating without a scheduled job.
  if pg_try_advisory_xact_lock(2261122, 2026) then
    delete from waiting_accounts.rate_buckets as bucket
      using (
        select scope, dimension, subject from waiting_accounts.rate_buckets
          where window_start < v_now - interval '30 minutes'
          order by window_start limit 128 for update skip locked
      ) as stale
      where (bucket.scope, bucket.dimension, bucket.subject) = (stale.scope, stale.dimension, stale.subject);

    delete from waiting_accounts.sessions as session
      using (
        select token_hash from waiting_accounts.sessions
          where expires_at <= v_now
          order by expires_at limit 128 for update skip locked
      ) as stale
      where session.token_hash = stale.token_hash;
  end if;

  if not waiting_accounts.consume_limit(p_scope, 'client', decode(p_client, 'hex'), v_long, v_client) then
    return false;
  end if;
  if p_scope = 'login' then
    return waiting_accounts.consume_limit(p_scope, 'identity', decode(p_identity, 'hex'), v_long, 12);
  end if;
  return true;
end;
$$;

create function waiting_accounts.start_session(p_account uuid, p_lifetime interval)
returns text
language plpgsql set search_path = '' as $$
declare
  v_token bytea := extensions.gen_random_bytes(32);
begin
  -- Serialize issuance for one account and limit its active sessions.
  perform id from waiting_accounts.accounts where id = p_account for update;
  delete from waiting_accounts.sessions
    where token_hash in (
      select token_hash from waiting_accounts.sessions where account_id = p_account
        order by created_at desc, token_hash offset 7
    );
  insert into waiting_accounts.sessions (token_hash, account_id, expires_at)
    values (extensions.digest(v_token, 'sha256'), p_account, clock_timestamp() + p_lifetime);
  return encode(v_token, 'hex');
end;
$$;

create function waiting_accounts.signup(p_username text, p_email text, p_password text)
returns jsonb
language plpgsql security definer set search_path = '' as $signup$
declare
  v_username text := btrim(p_username);
  v_email text := lower(btrim(p_email) collate pg_catalog."C");
  v_account uuid;
begin
  if v_username is null or (v_username collate pg_catalog."C") !~ '^[A-Za-z0-9_]{3,24}$'
      or v_email is null or length(v_email) > 254
      or (v_email collate pg_catalog."C") !~ $email$^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$$email$
      or p_password is null or length(p_password) < 8 or octet_length(p_password) > 72 then
    return jsonb_build_object('status', 'invalid_input');
  end if;
  insert into waiting_accounts.accounts (username, email, password_hash)
    values (v_username, v_email, extensions.crypt(p_password, extensions.gen_salt('bf', 11)))
    on conflict do nothing returning id into v_account;
  if v_account is null then
    return jsonb_build_object('status', 'account_unavailable');
  end if;
  return jsonb_build_object('status', 'ok', 'username', v_username, 'token',
    waiting_accounts.start_session(v_account, interval '12 hours'));
end;
$signup$;

create function waiting_accounts.login(p_login text, p_password text, p_remember boolean)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_login text := lower(btrim(p_login) collate pg_catalog."C");
  v_account waiting_accounts.accounts%rowtype;
  v_hash text;
  v_verified boolean;
begin
  if v_login is null or length(v_login) not between 3 and 254
      or p_password is null or length(p_password) < 8 or octet_length(p_password) > 72 then
    return jsonb_build_object('status', 'invalid_credentials');
  end if;

  if strpos(v_login, '@') > 0 then
    select * into v_account from waiting_accounts.accounts where email = v_login;
  else
    select * into v_account from waiting_accounts.accounts where username_key = v_login;
  end if;
  -- Perform one bcrypt operation on either path to avoid an obvious timing oracle.
  v_hash := coalesce(v_account.password_hash, '$2a$11$eDm4z5.OrXm0u7ZqjpQyju13qnpo15t5Pt701eERRtuD3mW/rLV62');
  v_verified := extensions.crypt(p_password, v_hash) = v_hash;
  if not coalesce(v_verified, false) or v_account.id is null then
    return jsonb_build_object('status', 'invalid_credentials');
  end if;
  return jsonb_build_object('status', 'ok', 'username', v_account.username, 'token',
    waiting_accounts.start_session(v_account.id, case when p_remember then interval '7 days' else interval '12 hours' end));
end;
$$;

create function waiting_accounts.get_session(p_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_username text;
begin
  if p_token is not null and p_token ~ '^[0-9a-f]{64}$' then
    select account.username into v_username
      from waiting_accounts.sessions as session
      join waiting_accounts.accounts as account on account.id = session.account_id
      where session.token_hash = extensions.digest(decode(p_token, 'hex'), 'sha256')
        and session.expires_at > statement_timestamp();
  end if;
  if v_username is null then
    return jsonb_build_object('status', 'invalid_session');
  end if;
  return jsonb_build_object('status', 'ok', 'username', v_username);
end;
$$;

create function waiting_accounts.logout(p_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if p_token is not null and p_token ~ '^[0-9a-f]{64}$' then
    delete from waiting_accounts.sessions
      where token_hash = extensions.digest(decode(p_token, 'hex'), 'sha256');
  end if;
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Data API wrappers run as service_role and delegate restricted private operations.
create function public.waiting_account_rate(p_scope text, p_client text, p_identity text)
returns boolean
language sql security invoker set search_path = '' set statement_timeout = '6s' set lock_timeout = '2s' as $$
  select waiting_accounts.rate(p_scope, p_client, p_identity)
$$;

create function public.waiting_account_signup(p_username text, p_email text, p_password text)
returns jsonb
language sql security invoker set search_path = '' set statement_timeout = '6s' set lock_timeout = '2s' as $$
  select waiting_accounts.signup(p_username, p_email, p_password)
$$;

create function public.waiting_account_login(p_login text, p_password text, p_remember boolean)
returns jsonb
language sql security invoker set search_path = '' set statement_timeout = '6s' set lock_timeout = '2s' as $$
  select waiting_accounts.login(p_login, p_password, p_remember)
$$;

create function public.waiting_account_session(p_token text)
returns jsonb
language sql security invoker set search_path = '' set statement_timeout = '6s' set lock_timeout = '2s' as $$
  select waiting_accounts.get_session(p_token)
$$;

create function public.waiting_account_logout(p_token text)
returns jsonb
language sql security invoker set search_path = '' set statement_timeout = '6s' set lock_timeout = '2s' as $$
  select waiting_accounts.logout(p_token)
$$;

revoke all on all functions in schema waiting_accounts from public, anon, authenticated, service_role;
grant execute on function
  waiting_accounts.rate(text, text, text),
  waiting_accounts.signup(text, text, text),
  waiting_accounts.login(text, text, boolean),
  waiting_accounts.get_session(text),
  waiting_accounts.logout(text)
to service_role;

revoke all on function
  public.waiting_account_rate(text, text, text),
  public.waiting_account_signup(text, text, text),
  public.waiting_account_login(text, text, boolean),
  public.waiting_account_session(text),
  public.waiting_account_logout(text)
from public, anon, authenticated, service_role;

grant execute on function
  public.waiting_account_rate(text, text, text),
  public.waiting_account_signup(text, text, text),
  public.waiting_account_login(text, text, boolean),
  public.waiting_account_session(text),
  public.waiting_account_logout(text)
to service_role;
