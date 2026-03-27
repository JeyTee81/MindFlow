-- Grandes étapes (phases) + sous-tâches pour l’UI « parcours ».

alter table public.tasks add column if not exists phase_index int not null default 0;
alter table public.tasks add column if not exists phase_title text;

comment on column public.tasks.phase_index is 'Ordre de la grande étape (0 = première).';
comment on column public.tasks.phase_title is 'Titre de la grande étape (répété sur chaque sous-tâche du groupe).';
