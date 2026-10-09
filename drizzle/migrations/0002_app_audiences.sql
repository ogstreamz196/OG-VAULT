alter table public.apps add column audiences text[] not null default '{free,vip}';
update public.apps set audiences = case when tier = 'vip' then '{vip}'::text[] else '{free,vip}'::text[] end;

create or replace function public.user_level(_user_id uuid)
returns text language sql stable security definer set search_path = public, auth as $$
  select case
    when _user_id is null then 'none'
    when public.has_role(_user_id,'admin') then 'admin'
    when public.is_vip(_user_id) then 'vip'
    when exists (select 1 from auth.users u where u.id = _user_id and lower(u.email) like '%@users.ogvault.app') then 'free'
    else 'guest'
  end
$$;
grant execute on function public.user_level(uuid) to authenticated;

drop policy "apps public read active" on public.apps;
create policy "apps read by audience" on public.apps for select to authenticated using (
  public.has_role(auth.uid(),'admin')
  or (is_active and public.user_level(auth.uid()) = any(audiences))
);