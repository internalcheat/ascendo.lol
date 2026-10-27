begin;
set local lock_timeout='5s';
alter table private.profile_presets add column version integer not null default 1 check(version>0);
grant update on private.profile_presets to service_role;
create or replace function public.profile_presets_command(operation text,payload jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare profile_owner uuid:=(payload->>'owner')::uuid; item private.profile_presets;
begin
 perform 1 from private.profiles where owner_id=profile_owner for update;
 if not found then raise exception 'Profile unavailable'; end if;
 if operation='list' then
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'createdAt',created_at,'version',version) order by created_at desc) from private.profile_presets where owner_id=profile_owner),'[]');
 elsif operation='create' then
  if (select count(*) from private.profile_presets where owner_id=profile_owner)>=10 then return jsonb_build_object('limit',true); end if;
  insert into private.profile_presets(owner_id,name,config,media) values(profile_owner,btrim(payload->>'name'),payload->'config',payload->'media') returning * into item;
 elsif operation in ('get','delete','rename','replace') then
  select * into item from private.profile_presets where id=(payload->>'id')::uuid and owner_id=profile_owner;
  if not found then return null; end if;
  if operation='delete' then delete from private.profile_presets where id=item.id;return jsonb_build_object('removed',true);end if;
  if operation in ('rename','replace') then
   if payload->>'version' is null or item.version<>(payload->>'version')::integer then return jsonb_build_object('conflict',true);end if;
   if operation='rename' then
    update private.profile_presets set name=btrim(payload->>'name'),version=version+1 where id=item.id and owner_id=profile_owner returning * into item;
   else
    update private.profile_presets set config=payload->'config',media=payload->'media',version=version+1 where id=item.id and owner_id=profile_owner returning * into item;
   end if;
  end if;
 else raise exception 'Unknown preset operation';
 end if;
 return jsonb_build_object('id',item.id,'name',item.name,'config',item.config,'version',item.version,'createdAt',item.created_at);
end;
$$;
revoke all on function public.profile_presets_command(text,jsonb) from public,anon,authenticated;
grant execute on function public.profile_presets_command(text,jsonb) to service_role;
commit;
