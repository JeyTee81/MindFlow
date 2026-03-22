-- Profils (freemium / premium) + quota "1 run IA" (planner) pour le plan free.
-- À appliquer via SQL Editor ou `supabase db push` (si lié au projet).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'premium')),
  ai_runs_used int not null default 0,
  updated_at timestamptz default now()
);

comment on table public.profiles is 'Plan d’abonnement et usage IA (runs planner côté free).';

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Nouveaux comptes : ligne profil automatique
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Comptes existants sans profil
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Free : si une mission existe déjà, considérer le run test comme utilisé
update public.profiles p
set ai_runs_used = 1
where p.subscription_tier = 'free'
  and exists (select 1 from public.missions m where m.user_id = p.id limit 1);

-- Liste des missions : lecture de ses lignes uniquement (si pas déjà défini)
alter table public.missions enable row level security;

drop policy if exists "missions_select_own" on public.missions;
create policy "missions_select_own"
  on public.missions for select
  using (auth.uid() = user_id);

-- Tâches / dépendances : lecture si la mission appartient à l’utilisateur
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
  on public.tasks for select
  using (
    exists (
      select 1 from public.missions m
      where m.id = mission_id and m.user_id = auth.uid()
    )
  );

alter table public.task_dependencies enable row level security;

drop policy if exists "task_deps_select_own" on public.task_dependencies;
create policy "task_deps_select_own"
  on public.task_dependencies for select
  using (
    exists (
      select 1 from public.tasks t
      join public.missions m on m.id = t.mission_id
      where t.id = task_id and m.user_id = auth.uid()
    )
  );
