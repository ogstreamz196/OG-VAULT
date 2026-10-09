create type public.app_role as enum ('admin','user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- first signed-up user becomes admin
create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_first_admin after insert on auth.users
for each row execute function public.handle_first_admin();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public read" on public.categories for select to anon, authenticated using (true);
create policy "categories admin write" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.apps (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  package_name text not null default '',
  version text not null default '1.0.0',
  build_number int not null default 1,
  description text not null default '',
  changelog text not null default '',
  tier text not null default 'free',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  category_id uuid references public.categories(id) on delete set null,
  icon_url text,
  banner_url text,
  screenshots text[] not null default '{}',
  apk_url text,
  file_size text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.apps to anon, authenticated;
grant insert, update, delete on public.apps to authenticated;
grant all on public.apps to service_role;
alter table public.apps enable row level security;
create policy "apps public read active" on public.apps for select to anon, authenticated using (is_active or public.has_role(auth.uid(),'admin'));
create policy "apps admin write" on public.apps for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.vip_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  device_limit int not null default 1,
  devices text[] not null default '{}',
  expires_at timestamptz,
  revoked boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.vip_codes to authenticated;
grant all on public.vip_codes to service_role;
alter table public.vip_codes enable row level security;
create policy "vip admin all" on public.vip_codes for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.redeem_vip_code(_code text, _device text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.vip_codes;
begin
  select * into r from public.vip_codes where upper(code) = upper(trim(_code));
  if not found then return jsonb_build_object('ok',false,'error','Invalid code'); end if;
  if r.revoked then return jsonb_build_object('ok',false,'error','Code revoked'); end if;
  if r.expires_at is not null and r.expires_at < now() then return jsonb_build_object('ok',false,'error','Code expired'); end if;
  if not (_device = any(r.devices)) then
    if coalesce(array_length(r.devices,1),0) >= r.device_limit then
      return jsonb_build_object('ok',false,'error','Device limit reached');
    end if;
    update public.vip_codes set devices = array_append(devices, _device) where id = r.id;
  end if;
  return jsonb_build_object('ok',true,'expires_at',r.expires_at);
end $$;
grant execute on function public.redeem_vip_code(text,text) to anon, authenticated;

create table public.m3u_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  require_active_status boolean not null default true,
  reject_expired boolean not null default true,
  allowed_hosts text[] not null default '{}',
  min_connections int not null default 0,
  timeout_ms int not null default 8000,
  updated_at timestamptz not null default now()
);
grant select on public.m3u_settings to anon, authenticated;
grant update, insert on public.m3u_settings to authenticated;
grant all on public.m3u_settings to service_role;
alter table public.m3u_settings enable row level security;
create policy "m3u public read" on public.m3u_settings for select to anon, authenticated using (true);
create policy "m3u admin write" on public.m3u_settings for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.m3u_settings(id) values (1);

insert into public.categories(name, slug, sort_order) values
 ('Media','media',1),('Live TV','live-tv',2),('Tools','tools',3),('Utilities','utilities',4);

insert into public.apps(title, package_name, version, build_number, description, changelog, tier, is_featured, category_id, apk_url, file_size) values
 ('OG Player','com.ogstreamz.player','2.4.1',241,'Premium 4K media player tuned for Firestick with hardware decoding, subtitles and external player support.','- Faster startup\n- AV1 support\n- Bug fixes','free',true,(select id from public.categories where slug='media'),null,'28 MB'),
 ('OGSTREAMZ Live','com.ogstreamz.live','5.0.0',500,'Live TV with full EPG, catch-up and multi-view. Requires VIP.','- New EPG grid\n- Multi-view x4','vip',true,(select id from public.categories where slug='live-tv'),null,'34 MB'),
 ('Speed Test TV','com.ogstreamz.speed','1.2.0',12,'Measure your connection speed with a remote-friendly UI.','- Initial release','free',false,(select id from public.categories where slug='tools'),null,'6 MB'),
 ('File Commander','com.ogstreamz.files','3.1.0',310,'Browse, copy and clean storage on your device.','- Cache cleaner','free',false,(select id from public.categories where slug='utilities'),null,'9 MB'),
 ('OG Sports Hub','com.ogstreamz.sports','1.8.2',182,'Scores, replays and live sports channels.','- Replay fixes','vip',false,(select id from public.categories where slug='live-tv'),null,'21 MB');

create policy "media admin insert" on storage.objects for insert to authenticated with check (bucket_id in ('app-media','apks') and public.has_role(auth.uid(),'admin'));
create policy "media admin update" on storage.objects for update to authenticated using (bucket_id in ('app-media','apks') and public.has_role(auth.uid(),'admin'));
create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id in ('app-media','apks') and public.has_role(auth.uid(),'admin'));
create policy "media public read" on storage.objects for select using (bucket_id in ('app-media','apks'));