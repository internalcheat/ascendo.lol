begin;
set local lock_timeout = '5s';
alter table private.uploads drop constraint uploads_kind_check;
alter table private.uploads add constraint uploads_kind_check check (kind in ('avatar','poster','backgroundImage','video','overlayImage','overlayVideo'));
commit;
