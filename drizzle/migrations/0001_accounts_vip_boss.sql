create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.vip_members (
  user_id uuid primary key,
  code_id uuid references public.vip_codes(id) on delete set null,
  expires_at timestamptz,
  granted_at timestamptz not null default now()
);
grant select on public.vip_members to authenticated;
grant insert, update, delete on public.vip_members to authenticated;
grant all on public.vip_members to service_role;
alter table public.vip_members enable row level security;
create policy "own vip read" on public.vip_members for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin vip write" on public.vip_members for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

alter table public.categories add column is_vip boolean not null default false;

create or replace function public.is_vip(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id,'admin') or exists (
    select 1 from public.vip_members m
    left join public.vip_codes c on c.id = m.code_id
    where m.user_id = _user_id
      and (m.expires_at is null or m.expires_at > now())
      and coalesce(c.revoked, false) = false
  )
$$;
grant execute on function public.is_vip(uuid) to authenticated;

create or replace function public.redeem_vip_for_me(_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.vip_codes; uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok',false,'error','Sign in first'); end if;
  select * into r from public.vip_codes where upper(code) = upper(trim(_code));
  if not found then return jsonb_build_object('ok',false,'error','Invalid code'); end if;
  if r.revoked then return jsonb_build_object('ok',false,'error','Code revoked'); end if;
  if r.expires_at is not null and r.expires_at < now() then return jsonb_build_object('ok',false,'error','Code expired'); end if;
  if not (uid::text = any(r.devices)) then
    if coalesce(array_length(r.devices,1),0) >= r.device_limit then
      return jsonb_build_object('ok',false,'error','Code already used on max accounts');
    end if;
    update public.vip_codes set devices = array_append(devices, uid::text) where id = r.id;
  end if;
  insert into public.vip_members(user_id, code_id, expires_at) values (uid, r.id, r.expires_at)
  on conflict (user_id) do update set code_id = excluded.code_id, expires_at = excluded.expires_at, granted_at = now();
  return jsonb_build_object('ok',true,'expires_at',r.expires_at);
end $$;
grant execute on function public.redeem_vip_for_me(text) to authenticated;

-- Boss admin is bound to one email; replaces "first signup becomes admin"
create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = 'ogstreamz196@gmail.com' then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  if new.raw_user_meta_data ? 'username' then
    insert into public.profiles(id, username) values (new.id, lower(new.raw_user_meta_data->>'username')) on conflict do nothing;
  else
    insert into public.profiles(id, username) values (new.id, split_part(lower(new.email),'@',1) || '-' || substr(new.id::text,1,4)) on conflict do nothing;
  end if;
  return new;
end $$;