begin;
set local lock_timeout='5s';
alter table private.profile_share_exports add column runner text, add column started_at timestamptz;
create or replace function public.profile_share_command(operation text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  profile_owner uuid; profile_slug text; current_revision integer; item private.profile_share_exports%rowtype;
  expired private.profile_share_exports%rowtype; removed text[]:='{}'; result jsonb; used bigint;
  today date:=(now() at time zone 'UTC')::date; job uuid;
begin
  perform pg_advisory_xact_lock(1983026,26);
  if operation='cleanup' then
    for expired in select * from private.profile_share_exports where
      state='ready' and expires_at<=now() or state='pending' and lease_until<=now() for update loop
      if expired.path is not null then removed:=array_append(removed,expired.path); end if;
      update private.profile_share_exports set state=case when state='pending' then 'failed' else 'idle' end,
        error_code=case when state='pending' then 'timeout' else null end,path=null,bytes=0 where owner_id=expired.owner_id;
    end loop;
    removed:=removed||array(select name from storage.objects where bucket_id='profile-shares'
      and created_at<now()-interval '24 hours' and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.png$' limit 200);
    return jsonb_build_object('paths',removed);
  end if;
  profile_owner:=(payload->>'owner')::uuid;
  select slug,revision into profile_slug,current_revision from private.profiles where owner_id=profile_owner;
  if not found then raise exception 'Profile unavailable'; end if;
  select * into item from private.profile_share_exports where owner_id=profile_owner for update;
  if operation='status' then
    if item.owner_id is null then return jsonb_build_object('state','idle'); end if;
    if item.revision<>current_revision or item.renderer<>payload->>'renderer' then return jsonb_build_object('state','stale','revision',current_revision); end if;
    if item.state='ready' and item.expires_at<=now() then return jsonb_build_object('state','idle'); end if;
    return to_jsonb(item)-'owner_id'-'attempts'-'request_day'-'last_started';
  end if;
  if operation='begin' then
    if current_revision<>(payload->>'revision')::integer then return jsonb_build_object('state','conflict'); end if;
    if item.revision=current_revision and item.renderer=payload->>'renderer' and
      (item.state='ready' and item.expires_at>now() or item.state='pending' and item.lease_until>now()) then
      return jsonb_build_object('state',item.state,'existing',true);
    end if;
    if item.state='pending' and item.revision<>current_revision then
      if item.path is not null then removed:=array_append(removed,item.path); end if;
      item.state:='failed'; item.lease_until:=null;
    end if;
    if item.state='pending' and item.lease_until>now() then return jsonb_build_object('state','busy'); end if;
    if item.request_day=today and item.attempts>=10 or item.last_started>now()-interval '30 seconds'
      then return jsonb_build_object('state','rate'); end if;
    if (select coalesce(sum(attempts),0) from private.profile_share_exports where request_day=today)>=12
      then return jsonb_build_object('state','quota'); end if;
    if (select count(*) from private.profile_share_exports where state='pending' and lease_until>now())>=2
      then return jsonb_build_object('state','busy'); end if;
    select coalesce(sum(case when state='pending' and lease_until>now() then 20971520 else bytes end),0)
      into used from private.profile_share_exports where state in ('ready','pending');
    used:=greatest(used,
      (select coalesce(sum(case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::bigint else 20971520 end),0) from storage.objects where bucket_id='profile-shares')+
      (select count(*)*20971520 from private.profile_share_exports where state='pending' and lease_until>now()));
    for expired in select * from private.profile_share_exports where state='ready' and owner_id<>profile_owner order by created_at for update loop
      exit when used-coalesce(item.bytes,0)+20971520<=104857600;
      used:=used-expired.bytes;if expired.path is not null then removed:=array_append(removed,expired.path); end if;
      update private.profile_share_exports set state='idle',path=null,bytes=0 where owner_id=expired.owner_id;
    end loop;
    if used-coalesce(item.bytes,0)+20971520>104857600 then return jsonb_build_object('state','busy'); end if;
    if item.path is not null then removed:=array_append(removed,item.path); end if;
    job:=gen_random_uuid();
    insert into private.profile_share_exports(owner_id,revision,renderer,state,job_id,path,lease_until,last_started,attempts)
      values(profile_owner,current_revision,payload->>'renderer','pending',job,profile_owner::text||'/'||job::text||'.png',now()+interval '2 hours',now(),1)
    on conflict(owner_id) do update set revision=current_revision,renderer=excluded.renderer,state='pending',runner=null,started_at=null,job_id=job,
      path=excluded.path,bytes=0,width=null,height=null,error_code=null,created_at=now(),expires_at=null,lease_until=excluded.lease_until,
      attempts=case when private.profile_share_exports.request_day=today then private.profile_share_exports.attempts+1 else 1 end,
      request_day=today,last_started=now();
    return jsonb_build_object('state','pending','job',job,'path',profile_owner::text||'/'||job::text||'.png','slug',profile_slug,'revision',current_revision,'purge',removed);
  end if;
  if operation='finish' then
    if item.owner_id is null or item.state<>'pending' or item.job_id<>(payload->>'job')::uuid or item.lease_until<=now() or item.revision<>current_revision then return jsonb_build_object('accepted',false); end if;
    update private.profile_share_exports set state='ready',bytes=(payload->>'bytes')::integer,width=1920,height=(payload->>'height')::integer,
      expires_at=now()+interval '24 hours',lease_until=null,error_code=null where owner_id=profile_owner;
    return jsonb_build_object('accepted',true);
  end if;
  if operation='fail' then
    update private.profile_share_exports set state='failed',path=null,bytes=0,lease_until=null,
      error_code=case when payload->>'code' in ('quota','timeout','profile_changed','too_large','render_failed','unavailable') then payload->>'code' else 'render_failed' end
      where owner_id=profile_owner and job_id=(payload->>'job')::uuid and state='pending';
    return jsonb_build_object('accepted',true);
  end if;
  raise exception 'Unknown share operation';
end;
$$;

create function public.profile_share_runner(operation text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare item record; jobs jsonb:='[]'; profiles jsonb; removed text[]:='{}'; identity text:=payload->>'runner';
begin
  if identity is null or identity !~ '^[0-9]{1,30}:[0-9]{1,10}$' then raise exception 'Invalid runner'; end if;
  perform pg_advisory_xact_lock(1983026,26);
  if operation='check' then
    for item in select e.owner_id,e.path from private.profile_share_exports e join private.profiles p on p.owner_id=e.owner_id
      where e.state='pending' and e.revision<>p.revision for update of e loop
      if item.path is not null then removed:=array_append(removed,item.path); end if;
      update private.profile_share_exports set state='failed',error_code='profile_changed',path=null,bytes=0,lease_until=null where owner_id=item.owner_id;
    end loop;
    for item in select e.job_id,e.revision,p.slug,p.config from private.profile_share_exports e join private.profiles p on p.owner_id=e.owner_id
      where e.state='pending' and e.runner is null and e.lease_until>now() and e.renderer='desktop-github-1' and e.revision=p.revision
      order by e.created_at limit 2 for update of e skip locked loop
      update private.profile_share_exports set runner=identity,started_at=now(),lease_until=now()+interval '5 minutes' where job_id=item.job_id;
      jobs:=jobs||jsonb_build_array(jsonb_build_object('job',item.job_id,'slug',item.slug,'revision',item.revision,'config',item.config));
    end loop;
    select coalesce(jsonb_agg(to_jsonb(p)),'[]') into profiles from(select slug,revision,config from private.profiles order by slug limit 200)p;
    return jsonb_build_object('profiles',profiles,'jobs',jobs,'purge',removed);
  elsif operation='lookup' then
    select * into item from private.profile_share_exports where job_id=(payload->>'job')::uuid and runner=identity and state='pending' and lease_until>now();
    if not found then return null; end if;
    return jsonb_build_object('owner',item.owner_id,'path',item.path,'revision',item.revision,'job',item.job_id);
  end if;
  raise exception 'Invalid runner operation';
end;
$$;
revoke all on function public.profile_share_runner(text,jsonb) from public,anon,authenticated;
grant execute on function public.profile_share_runner(text,jsonb) to service_role;
commit;
