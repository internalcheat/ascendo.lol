-- Guest games are private. Only chess-api's server role can read/write them.
create table private.chess_games (
  id text primary key check (id ~ '^[a-f0-9]{32}$'),
  revision integer not null default 1 check (revision>0),
  white_token text check (white_token ~ '^[a-f0-9]{64}$'),
  black_token text check (black_token ~ '^[a-f0-9]{64}$'),
  channel text not null check (channel ~ '^[a-f0-9]{32}$'),
  state jsonb not null check (jsonb_typeof(state)='object' and octet_length(state::text)<100000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '24 hours',
  check (white_token is not null or black_token is not null)
);
create index chess_games_expiry on private.chess_games(expires_at);
alter table private.chess_games enable row level security;
revoke all on private.chess_games from public,anon,authenticated;
grant select,insert,update,delete on private.chess_games to service_role;

create table private.chess_rate_limits (
  key text primary key check (key ~ '^[a-f0-9]{64}$'),
  bucket bigint not null,
  hits integer not null,
  expires_at timestamptz not null
);
create index chess_rate_expiry on private.chess_rate_limits(expires_at);
alter table private.chess_rate_limits enable row level security;
revoke all on private.chess_rate_limits from public,anon,authenticated;
grant select,insert,update,delete on private.chess_rate_limits to service_role;

create function public.chess_command(operation text,payload jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  game private.chess_games%rowtype;
  bucket bigint;
  amount integer;
  seconds integer;
begin
  if operation='rate' then
    seconds:=(payload->>'seconds')::integer;
    if seconds<1 or seconds>86400 or (payload->>'limit')::integer not between 1 and 1000 then raise exception 'Invalid rate'; end if;
    bucket:=floor(extract(epoch from clock_timestamp())/seconds);
    insert into private.chess_rate_limits(key,bucket,hits,expires_at)
    values(payload->>'key',bucket,1,now()+make_interval(secs=>seconds*2))
    on conflict(key) do update set
      hits=case when private.chess_rate_limits.bucket=excluded.bucket then least(private.chess_rate_limits.hits+1,1001) else 1 end,
      bucket=excluded.bucket,expires_at=excluded.expires_at
    returning hits into amount;
    return to_jsonb(amount<=(payload->>'limit')::integer);
  elsif operation='create' then
    insert into private.chess_games(id,white_token,black_token,channel,state)
    values(payload->>'id',payload->>'white_token',payload->>'black_token',payload->>'channel',payload->'state')
    on conflict(id) do nothing;
  elsif operation='commit' then
    select * into game from private.chess_games where id=payload->>'id' and expires_at>now() for update;
    if not found or game.revision<>(payload->>'revision')::integer then return null; end if;
    update private.chess_games set
      revision=revision+1,state=payload->'state',expires_at=now()+interval '7 days',
      white_token=case when coalesce((payload->>'swap')::boolean,false) then game.black_token
        when payload ? 'join_token' and game.white_token is null then payload->>'join_token' else game.white_token end,
      black_token=case when coalesce((payload->>'swap')::boolean,false) then game.white_token
        when payload ? 'join_token' and game.black_token is null then payload->>'join_token' else game.black_token end
    where id=game.id returning * into game;
    -- Notifications contain only a revision. Clients always refetch authenticated state.
    begin
      perform realtime.send(jsonb_build_object('revision',game.revision),'changed','chess:'||game.channel,false);
    exception when others then null; -- Polling/reconnect remains available if realtime is unavailable.
    end;
    return to_jsonb(game);
  elsif operation<>'get' then raise exception 'Unknown chess operation';
  end if;
  select * into game from private.chess_games where id=payload->>'id' and expires_at>now();
  if not found then return null; end if;
  return to_jsonb(game);
end;
$$;
revoke all on function public.chess_command(text,jsonb) from public,anon,authenticated;
grant execute on function public.chess_command(text,jsonb) to service_role;

-- Reserve the real page route without changing any existing profile.
create or replace function private.invited_handle_valid(handle text) returns boolean language sql immutable set search_path='' as $$
  select handle ~ '^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$' and handle <> all(array[
    '404','index','assets','downloads','plugins','chess','customize','login','welcome','invite','invitations','api','auth','profile','profiles','vendor','tests','supabase','fonts','admin','administrator','owner','staff','support','security','system','root','www','ascendo','internal','internalcheat','internalcheats','nagyorru','k3rlsen','bal4zs','szikraaaa'
  ]);
$$;
-- Delete only expired derived chess data; never touch profiles or media.
select cron.schedule('chess-expired-cleanup','17 * * * *',$job$
  delete from private.chess_games where expires_at<now();
  delete from private.chess_rate_limits where expires_at<now();
$job$);
