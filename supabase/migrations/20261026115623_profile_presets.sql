begin;
set local lock_timeout='5s';
create table private.profile_presets(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 40),
 config jsonb not null check(jsonb_typeof(config)='object' and octet_length(config::text)<=65536),
 media jsonb not null default '[]' check(jsonb_typeof(media)='array'),
 created_at timestamptz not null default now()
);
create unique index profile_presets_owner_name on private.profile_presets(owner_id,lower(name));
alter table private.profile_presets enable row level security;
revoke all on private.profile_presets from public,anon,authenticated;
grant select,insert,delete on private.profile_presets to service_role;
create function public.profile_presets_command(operation text,payload jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare profile_owner uuid:=(payload->>'owner')::uuid; item private.profile_presets; result jsonb;
begin
 perform 1 from private.profiles where owner_id=profile_owner for update;
 if not found then raise exception 'Profile unavailable'; end if;
 if operation='list' then
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'createdAt',created_at) order by created_at desc) from private.profile_presets where owner_id=profile_owner),'[]');
 elsif operation='create' then
  if (select count(*) from private.profile_presets where owner_id=profile_owner)>=10 then return jsonb_build_object('limit',true); end if;
  insert into private.profile_presets(owner_id,name,config,media) values(profile_owner,btrim(payload->>'name'),payload->'config',payload->'media') returning * into item;
  return jsonb_build_object('id',item.id,'name',item.name,'createdAt',item.created_at);
 elsif operation in ('get','delete') then
  select * into item from private.profile_presets where id=(payload->>'id')::uuid and owner_id=profile_owner;
  if not found then return null; end if;
  if operation='delete' then delete from private.profile_presets where id=item.id;return jsonb_build_object('removed',true);end if;
  return jsonb_build_object('id',item.id,'name',item.name,'config',item.config);
 end if;
 raise exception 'Unknown preset operation';
end;
$$;
revoke all on function public.profile_presets_command(text,jsonb) from public,anon,authenticated;
grant execute on function public.profile_presets_command(text,jsonb) to service_role;
do $$
declare definition text; before_text text:='''usage'',coalesce'; after_text text:='''presetMedia'',coalesce((select jsonb_agg(refs.value) from private.profile_presets p cross join lateral jsonb_array_elements_text(p.media) as refs(value) where p.owner_id=profile.owner_id),''[]''::jsonb),''usage'',coalesce';
begin
 select pg_get_functiondef('public.editor_command(text,jsonb)'::regprocedure) into definition;
 if position(before_text in definition)=0 then raise exception 'Profile media implementation changed; review before applying'; end if;
 execute replace(definition,before_text,after_text);
end;
$$;
commit;
