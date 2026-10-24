create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create function public.editor_cleanup_owners() returns jsonb language sql security invoker set search_path='' as $$
  select coalesce(jsonb_agg(owner_id),'[]'::jsonb) from private.profiles where owner_id is not null;
$$;
revoke all on function public.editor_cleanup_owners() from public,anon,authenticated;
grant execute on function public.editor_cleanup_owners() to service_role;

create function private.run_media_cleanup() returns bigint language plpgsql security definer set search_path='' as $$
declare key text;
begin
  select encode(extensions.hmac('cleanup',decrypted_secret,'sha256'),'hex') into key from vault.decrypted_secrets where name='ascendo-code-pepper' limit 1;
  return net.http_post(url:='https://fstdttaxflayhtwhnbih.supabase.co/functions/v1/profile-api/cleanup',headers:=jsonb_build_object('Content-Type','application/json','x-cleanup-proof',key),body:='{}'::jsonb);
end;
$$;
revoke all on function private.run_media_cleanup() from public,anon,authenticated,service_role;
select cron.schedule('ascendo-media-cleanup','27 * * * *','select private.run_media_cleanup();');
