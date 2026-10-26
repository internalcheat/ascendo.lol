-- Run only as the service/database administrator. Every fixture is rolled back.
begin;
set local lock_timeout='5s';
do $$
declare
  first_owner uuid:=gen_random_uuid(); second_owner uuid:=gen_random_uuid();
  first_job jsonb; second_job jsonb; result jsonb; wrong_job uuid:=gen_random_uuid();
begin
  insert into auth.users(id,email) values(first_owner,first_owner::text||'@sharing-fixture.invalid'),(second_owner,second_owner::text||'@sharing-fixture.invalid');
  insert into private.profiles(slug,owner_id,config,defaults,revision) values
    ('share-'||left(first_owner::text,12),first_owner,'{}','{}',7),('share-'||left(second_owner::text,12),second_owner,'{}','{}',7);
  result:=public.profile_share_command('status',jsonb_build_object('owner',first_owner,'renderer','fixture'));
  assert result->>'state'='idle','New owner must start idle';
  result:=public.profile_share_command('begin',jsonb_build_object('owner',first_owner,'renderer','fixture','revision',6));
  assert result->>'state'='conflict','Stale revision must not start';
  first_job:=public.profile_share_command('begin',jsonb_build_object('owner',first_owner,'renderer','fixture','revision',7));
  assert first_job->>'state'='pending','Expected a pending job';
  assert first_job->>'path'=first_owner::text||'/'||(first_job->>'job')||'.png','Path must belong to verified owner';
  result:=public.profile_share_command('begin',jsonb_build_object('owner',first_owner,'renderer','fixture','revision',7));
  assert (result->>'existing')::boolean,'Concurrent requests must reuse the active job';
  second_job:=public.profile_share_command('begin',jsonb_build_object('owner',second_owner,'renderer','fixture','revision',7));
  assert second_job->>'path'<>first_job->>'path','Owners must have separate paths';
  result:=public.profile_share_command('finish',jsonb_build_object('owner',first_owner,'job',wrong_job,'bytes',1024,'height',900));
  assert not (result->>'accepted')::boolean,'Wrong job must not finish';
  begin
    perform public.profile_share_command('finish',jsonb_build_object('owner',first_owner,'job',first_job->>'job','bytes',1024,'height',16001));
    raise exception 'Oversized height was accepted';
  exception when check_violation then null;
  end;
  result:=public.profile_share_command('finish',jsonb_build_object('owner',first_owner,'job',first_job->>'job','bytes',1024,'height',900));
  assert (result->>'accepted')::boolean,'Valid PNG dimensions must finish';
  result:=public.profile_share_command('status',jsonb_build_object('owner',first_owner,'renderer','fixture'));
  assert result->>'state'='ready' and (result->>'width')::integer=1920,'Ready export must retain dimensions';
  assert not result ? 'owner_id','Status must not expose owner IDs';
  result:=public.profile_share_command('begin',jsonb_build_object('owner',first_owner,'renderer','fixture','revision',7));
  assert (result->>'existing')::boolean,'Completed revision should be cached';
  update private.profiles set revision=8 where owner_id=first_owner;
  result:=public.profile_share_command('status',jsonb_build_object('owner',first_owner,'renderer','fixture'));
  assert result->>'state'='stale','Changed saved profile must invalidate export';
  update private.profile_share_exports set last_started=now()-interval '31 seconds' where owner_id=first_owner;
  first_job:=public.profile_share_command('begin',jsonb_build_object('owner',first_owner,'renderer','fixture','revision',8));
  update private.profiles set revision=9 where owner_id=first_owner;
  result:=public.profile_share_command('finish',jsonb_build_object('owner',first_owner,'job',first_job->>'job','bytes',1024,'height',900));
  assert not (result->>'accepted')::boolean,'Revision race must reject completion';
  update private.profile_share_exports set lease_until=now()-interval '1 second' where owner_id=first_owner;
  result:=public.profile_share_command('cleanup');
  assert result->'paths' ? (first_job->>'path'),'Expired lease should return only its derived path';
  assert (select state='failed' and error_code='timeout' from private.profile_share_exports where owner_id=first_owner),'Expired lease must fail';
  result:=public.profile_share_command('finish',jsonb_build_object('owner',second_owner,'job',second_job->>'job','bytes',1024,'height',900));
  update private.profile_share_exports set expires_at=now()-interval '1 second' where owner_id=second_owner;
  result:=public.profile_share_command('cleanup');
  assert result->'paths' ? (second_job->>'path'),'Expired completed export should be removed';
  update private.profile_share_exports set attempts=10,last_started=now()-interval '31 seconds' where owner_id=first_owner;
  result:=public.profile_share_command('begin',jsonb_build_object('owner',first_owner,'renderer','fixture','revision',9));
  assert result->>'state'='rate','Owner generation allowance must be bounded';
  assert not has_function_privilege('anon','public.profile_share_command(text,jsonb)','EXECUTE'),'Anonymous RPC access must stay denied';
  assert not has_function_privilege('authenticated','public.profile_share_command(text,jsonb)','EXECUTE'),'Direct client RPC access must stay denied';
end;
$$;
rollback;
select 'Sharing cache ownership, revisions, bounds, reuse, expiry and privileges passed; fixtures rolled back.' as verification;
