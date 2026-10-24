create or replace function public.editor_command(operation text, payload jsonb default '{}') returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  profile private.profiles%rowtype;
  upload private.uploads%rowtype;
  result jsonb;
  used_bytes bigint;
  moment timestamptz := now();
begin
  if operation='runtime' then
    return jsonb_build_object('pepper',private.runtime_secret());
  elsif operation='public' then
    select * into profile from private.profiles where slug=payload->>'slug';
    if not found then return null; end if;
    return jsonb_build_object('config',profile.config,'revision',profile.revision);
  elsif operation='lookup' then
    select to_jsonb(credential) into result from private.credentials credential where digest=payload->>'digest';
    return result;
  elsif operation='rate' then
    perform pg_advisory_xact_lock(795321);
    delete from private.login_attempts where created_at < moment - interval '15 minutes';
    if (select count(*) from private.login_attempts) >= 30 or (select count(*) from private.login_attempts where ip_hash=payload->>'ip') >= 5 then return 'false'::jsonb; end if;
    insert into private.login_attempts(ip_hash) values(payload->>'ip');
    return 'true'::jsonb;
  elsif operation='session' then
    return to_jsonb(exists(select 1 from auth.sessions where id=(payload->>'session')::uuid and user_id=(payload->>'owner')::uuid and created_at > moment - interval '8 hours'));
  elsif operation='setup' then
    select to_jsonb(setting) into result from private.setup setting where singleton;
    return result;
  elsif operation='bind' then
    perform pg_advisory_xact_lock(795322);
    if exists(select 1 from private.setup where consumed or expires_at < moment) then raise exception 'Setup closed'; end if;
    update private.profiles set owner_id=(payload->>'owner')::uuid where slug=payload->>'slug' and owner_id is null;
    if not found then raise exception 'Profile already bound'; end if;
    insert into private.credentials(digest,slug,email) values(payload->>'digest',payload->>'slug',payload->>'email');
    return 'true'::jsonb;
  elsif operation='seal' then
    update private.setup set consumed=true, proof_hash=null where singleton;
    return 'true'::jsonb;
  end if;
  select * into profile from private.profiles where owner_id=(payload->>'owner')::uuid for update;
  if not found then raise exception 'Profile unavailable'; end if;
  if operation='mine' then
    return jsonb_build_object('slug',profile.slug,'config',profile.config,'defaults',profile.defaults,'previous',profile.previous,'revision',profile.revision,'usage',coalesce((select sum(bytes) from private.uploads where owner_id=profile.owner_id),0));
  elsif operation='save' then
    if profile.revision <> (payload->>'revision')::integer then return jsonb_build_object('conflict',true); end if;
    if octet_length((payload->'config')::text) > 65536 then raise exception 'Profile too large'; end if;
    update private.profiles set previous=config, config=payload->'config', revision=revision+1, updated_at=moment where slug=profile.slug returning * into profile;
    return jsonb_build_object('config',profile.config,'revision',profile.revision);
  elsif operation='reserve' then
    select coalesce(sum(bytes),0) into used_bytes from private.uploads where owner_id=profile.owner_id;
    if used_bytes+(payload->>'bytes')::bigint > 250000000 then raise exception 'Storage quota reached'; end if;
    insert into private.uploads(id,owner_id,kind,path,bytes,mime) values((payload->>'id')::uuid,profile.owner_id,payload->>'kind',payload->>'path',(payload->>'bytes')::bigint,payload->>'mime') returning * into upload;
    return to_jsonb(upload);
  elsif operation='uploads' then
    return coalesce((select jsonb_agg(to_jsonb(media)) from private.uploads media where owner_id=profile.owner_id),'[]'::jsonb);
  elsif operation='upload' then
    select * into upload from private.uploads where id=(payload->>'id')::uuid and owner_id=profile.owner_id;
    return to_jsonb(upload);
  elsif operation='ready' then
    update private.uploads set state='ready' where id=(payload->>'id')::uuid and owner_id=profile.owner_id and state='pending' returning * into upload;
    return to_jsonb(upload);
  elsif operation='published' then
    update private.uploads set state='published' where id=(payload->>'id')::uuid and owner_id=profile.owner_id and state in ('ready','published');
    return 'true'::jsonb;
  elsif operation='forget' then
    delete from private.uploads where id=(payload->>'id')::uuid and owner_id=profile.owner_id;
    return 'true'::jsonb;
  else raise exception 'Unknown operation'; end if;
end;
$$;
