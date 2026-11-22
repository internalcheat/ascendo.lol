create or replace function waiting_accounts.rate(p_scope text, p_client text, p_identity text)
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

  -- Reserve capacity before writing client rows and roll back rejected attempts.
  begin
    if not waiting_accounts.consume_limit(p_scope, 'global', ''::bytea, v_short, v_global) then
      return false;
    end if;
    if not waiting_accounts.consume_limit(p_scope, 'client', decode(p_client, 'hex'), v_long, v_client) then
      raise sqlstate 'P0429';
    end if;
    if p_scope = 'login'
        and not waiting_accounts.consume_limit(p_scope, 'identity', decode(p_identity, 'hex'), v_long, 12) then
      raise sqlstate 'P0429';
    end if;
  exception when sqlstate 'P0429' then
    return false;
  end;

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

  return true;
end;
$$;
