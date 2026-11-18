-- Reserve the public download page without changing existing profiles or access.
create or replace function private.invited_handle_valid(handle text) returns boolean language sql immutable set search_path='' as $$
  select handle ~ '^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$' and handle <> all(array[
    '404','index','assets','downloads','plugins','chess','forge','randomff','cracks','customize','login','welcome','invite','invitations','api','auth','profile','profiles','vendor','tests','supabase','fonts','admin','administrator','owner','staff','support','security','system','root','www','ascendo','internal','internalcheat','internalcheats','nagyorru','k3rlsen','bal4zs','szikraaaa'
  ]);
$$;
