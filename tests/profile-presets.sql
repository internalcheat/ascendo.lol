begin;
set local lock_timeout='5s';
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); item jsonb; result jsonb; i integer;
begin
 insert into auth.users(id,email) values(a,a::text||'@preset-fixture.invalid'),(b,b::text||'@preset-fixture.invalid');
 insert into private.profiles(slug,owner_id,config,defaults,revision) values('preset-'||left(a::text,12),a,'{}','{}',1),('preset-'||left(b::text,12),b,'{}','{}',1);
 item:=public.profile_presets_command('create',jsonb_build_object('owner',a,'name','My profile','config','{"name":"Snapshot"}'::jsonb,'media','["https://fixture.invalid/image.png"]'::jsonb));
 assert item->>'name'='My profile','Preset name must survive';
 assert public.profile_presets_command('get',jsonb_build_object('owner',b,'id',item->>'id')) is null,'Another owner cannot read';
 assert public.profile_presets_command('delete',jsonb_build_object('owner',b,'id',item->>'id')) is null,'Another owner cannot delete';
 result:=public.editor_command('mine',jsonb_build_object('owner',a));
 assert result->'presetMedia' ? 'https://fixture.invalid/image.png','Preset media must be protected';
 begin
  perform public.profile_presets_command('create',jsonb_build_object('owner',a,'name','MY PROFILE','config','{}'::jsonb,'media','[]'::jsonb));
  raise exception 'Duplicate name accepted';
 exception when unique_violation then null;
 end;
 for i in 2..10 loop perform public.profile_presets_command('create',jsonb_build_object('owner',a,'name','Preset '||i,'config','{}'::jsonb,'media','[]'::jsonb));end loop;
 result:=public.profile_presets_command('create',jsonb_build_object('owner',a,'name','Overflow','config','{}'::jsonb,'media','[]'::jsonb));
 assert (result->>'limit')::boolean,'Limit must be atomic';
 perform public.profile_presets_command('delete',jsonb_build_object('owner',a,'id',item->>'id'));
 assert not ((public.editor_command('mine',jsonb_build_object('owner',a)))->'presetMedia' ? 'https://fixture.invalid/image.png'),'Deleted preset should release its reference';
 assert (select revision=1 from private.profiles where owner_id=a),'Presets must not publish';
 assert not has_table_privilege('anon','private.profile_presets','select'),'Table is private';
 assert not has_function_privilege('authenticated','public.profile_presets_command(text,jsonb)','execute'),'RPC is service-only';
end;
$$;
rollback;
select 'Preset ownership, limit, unique names, media references and private privileges passed; fixtures rolled back.' as result;
