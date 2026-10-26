begin;
set local lock_timeout='5s';
do $$
declare definition text; old_check text:='if used_bytes+(payload->>''bytes'')::bigint > 250000000 then'; new_check text:='if used_bytes+(payload->>''bytes'')::bigint > (case when profile.slug=''internalcheats'' then 500000000 else 250000000 end) then';
begin
 select pg_get_functiondef('public.editor_command(text,jsonb)'::regprocedure) into definition;
 if position(old_check in definition)=0 then raise exception 'Upload quota implementation changed; review before applying'; end if;
 execute replace(definition,old_check,new_check);
end;
$$;
commit;
