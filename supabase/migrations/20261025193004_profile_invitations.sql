create table private.profile_invitations (
  id uuid primary key default gen_random_uuid(),
  digest text not null unique check (digest ~ '^[a-f0-9]{64}$'),
  email text generated always as (id::text || '@invites.ascendo.invalid') stored unique,
  owner_id uuid unique references auth.users(id),
  claimed_slug text unique references private.profiles(slug),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  claimed_at timestamptz,
  revoked_at timestamptz,
  check (owner_id is null or owner_id = id),
  check (claimed_slug is null or owner_id is not null)
);
alter table private.profile_invitations enable row level security;
revoke all on private.profile_invitations from public, anon, authenticated;
grant select, insert, update, delete on private.profile_invitations to service_role;

create function private.invited_handle_valid(handle text) returns boolean language sql immutable set search_path='' as $$
  select handle ~ '^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$' and handle <> all(array[
    '404','index','assets','downloads','plugins','customize','login','welcome','invite','invitations','api','auth','profile','profiles','vendor','tests','supabase','fonts','admin','administrator','owner','staff','support','security','system','root','www','ascendo','internal','internalcheat','internalcheats','nagyorru','k3rlsen','bal4zs','szikraaaa'
  ]);
$$;
revoke all on function private.invited_handle_valid(text) from public, anon, authenticated;
grant execute on function private.invited_handle_valid(text) to service_role;

create function public.profile_invitation_command(operation text,payload jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  invitation private.profile_invitations%rowtype;
  account private.profiles%rowtype;
  handle text := payload->>'handle';
begin
  if operation='lookup' then
    select * into invitation from private.profile_invitations where digest=payload->>'digest' and revoked_at is null;
    if not found then return null; end if;
    return jsonb_build_object('id',invitation.id,'email',invitation.email,'owner',invitation.owner_id,'slug',invitation.claimed_slug);
  elsif operation='activate' then
    select * into invitation from private.profile_invitations where id=(payload->>'invitation')::uuid and revoked_at is null for update;
    if not found or invitation.id <> (payload->>'owner')::uuid then raise exception 'Invitation unavailable'; end if;
    update private.profile_invitations set owner_id=id,activated_at=coalesce(activated_at,now()) where id=invitation.id;
    return 'true'::jsonb;
  end if;
  select * into account from private.profiles where owner_id=(payload->>'owner')::uuid;
  if operation='status' then
    if found then return jsonb_build_object('needsHandle',false,'slug',account.slug); end if;
    select * into invitation from private.profile_invitations where owner_id=(payload->>'owner')::uuid and revoked_at is null;
    if not found then raise exception 'Invitation unavailable'; end if;
    return jsonb_build_object('needsHandle',invitation.claimed_slug is null,'slug',invitation.claimed_slug);
  end if;
  select * into invitation from private.profile_invitations where owner_id=(payload->>'owner')::uuid and revoked_at is null for update;
  if not found then raise exception 'Invitation unavailable'; end if;
  if invitation.claimed_slug is not null then return jsonb_build_object('needsHandle',false,'slug',invitation.claimed_slug,'claimed',true); end if;
  if not coalesce(private.invited_handle_valid(handle),false) then raise exception 'Invalid handle'; end if;
  if operation='available' then return jsonb_build_object('handle',handle,'available',not exists(select 1 from private.profiles where slug=handle)); end if;
  if operation <> 'claim' then raise exception 'Unknown invitation operation'; end if;
  perform pg_advisory_xact_lock(hashtextextended(handle,795325));
  if exists(select 1 from private.profiles where slug=handle) then return jsonb_build_object('conflict',true); end if;
  if jsonb_typeof(payload->'config') <> 'object' or payload->'config'->>'name' is distinct from handle or coalesce(payload->'config'->>'badge','') <> '' then raise exception 'Invalid initial profile'; end if;
  insert into private.profiles(slug,owner_id,config,defaults) values(handle,invitation.owner_id,payload->'config',payload->'config');
  insert into private.credentials(digest,slug,email) values(invitation.digest,handle,invitation.email);
  update private.profile_invitations set claimed_slug=handle,claimed_at=now() where id=invitation.id;
  return jsonb_build_object('needsHandle',false,'slug',handle,'claimed',true);
exception when unique_violation then
  return jsonb_build_object('conflict',true);
end;
$$;
revoke all on function public.profile_invitation_command(text,jsonb) from public, anon, authenticated;
grant execute on function public.profile_invitation_command(text,jsonb) to service_role;
