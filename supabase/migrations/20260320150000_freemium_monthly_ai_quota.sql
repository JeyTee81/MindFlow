-- Freemium : jusqu’à 10 générations de plan IA par mois (reset au changement de mois UTC, format YYYY-MM).

alter table public.profiles add column if not exists ai_quota_month text;

comment on column public.profiles.ai_runs_used is
  'Nombre de runs planner (create-mission) consommés sur le mois courant (plan gratuit).';
comment on column public.profiles.ai_quota_month is
  'Mois UTC (YYYY-MM) auquel se rapporte ai_runs_used ; si différent du mois actuel, le compteur est remis à 0 côté appli.';

-- Rattacher les compteurs existants au mois courant (évite un reset intempestif au premier run après migration).
update public.profiles
set ai_quota_month = to_char((now() at time zone 'utc'), 'YYYY-MM')
where ai_quota_month is null;
