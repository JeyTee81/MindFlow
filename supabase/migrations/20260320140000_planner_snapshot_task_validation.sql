-- Snapshot complet du planner (audit / relecture du graphe généré)
alter table public.missions add column if not exists planner_snapshot jsonb;

comment on column public.missions.planner_snapshot is 'Réponse JSON structurée du planner IA (rejeu / audit).';

-- Validation manuelle « étape faite » par l’utilisateur
alter table public.tasks add column if not exists user_validated boolean not null default false;

comment on column public.tasks.user_validated is 'Coché par l’utilisateur quand l’étape est considérée comme réalisée.';

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own"
  on public.tasks for update
  using (
    exists (
      select 1 from public.missions m
      where m.id = mission_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.missions m
      where m.id = mission_id and m.user_id = auth.uid()
    )
  );
