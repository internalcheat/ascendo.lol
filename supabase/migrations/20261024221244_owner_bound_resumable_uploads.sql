grant usage on schema private to authenticated;
create function private.owns_reserved_upload(object_path text) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from private.uploads where path=object_path and owner_id=(select auth.uid()) and state in ('pending','ready') and created_at>now()-interval '24 hours');
$$;
revoke all on function private.owns_reserved_upload(text) from public,anon;
grant execute on function private.owns_reserved_upload(text) to authenticated;
create policy owner_reserved_draft_insert on storage.objects for insert to authenticated with check(bucket_id='profile-drafts' and private.owns_reserved_upload(name));
create policy owner_reserved_draft_select on storage.objects for select to authenticated using(bucket_id='profile-drafts' and private.owns_reserved_upload(name));
