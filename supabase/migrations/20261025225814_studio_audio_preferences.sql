begin;
set local lock_timeout = '5s';
alter table private.uploads drop constraint uploads_kind_check;
alter table private.uploads add constraint uploads_kind_check check (kind in ('avatar','poster','backgroundImage','video','overlayImage','overlayVideo','audio'));
update storage.buckets set allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif','video/mp4','audio/mpeg'] where id in ('profile-drafts','profile-media');
create table private.editor_preferences (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'en' check (language in ('en','hu'))
);
alter table private.editor_preferences enable row level security;
revoke all on private.editor_preferences from public,anon,authenticated;
grant select,insert,update on private.editor_preferences to service_role;
create function public.profile_editor_language(profile_owner uuid,selected_language text default null) returns text
language plpgsql security invoker set search_path='' as $$
declare result text;
begin
  if not exists(select 1 from private.profiles where owner_id=profile_owner) then raise exception 'Profile unavailable'; end if;
  if selected_language is not null then
    if selected_language not in ('en','hu') then raise exception 'Invalid language'; end if;
    insert into private.editor_preferences(owner_id,language) values(profile_owner,selected_language)
      on conflict(owner_id) do update set language=excluded.language;
  end if;
  select language into result from private.editor_preferences where owner_id=profile_owner;
  return coalesce(result,'en');
end;
$$;
revoke all on function public.profile_editor_language(uuid,text) from public,anon,authenticated;
grant execute on function public.profile_editor_language(uuid,text) to service_role;
commit;
