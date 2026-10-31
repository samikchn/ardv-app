-- Au Rendez-Vous — structure de la base (aucune donnée réelle ici).
-- Seules les adresses de la table `autorises` peuvent lire ou écrire quoi que ce soit.

create table if not exists ardv_autorises (email text primary key);
-- Les deux adresses autorisées sont ajoutées par le script privé a-lancer-2 (pas dans le dépôt public).

create table if not exists ardv_profil (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  maj timestamptz not null default now()
);

create table if not exists ardv_avis (
  id uuid primary key default gen_random_uuid(),
  numero serial,                                 -- numéro du ticket affiché (N° 042)
  source text not null default 'colle',          -- colle | gmail
  cle text unique,                               -- anti-doublon pour les avis venus de Gmail (étape 2)
  auteur text,
  etoiles int check (etoiles between 1 and 5),
  texte text not null default '',
  lien text,
  statut text not null default 'a_repondre' check (statut in ('a_repondre', 'fait')),
  cree timestamptz not null default now()
);
create index if not exists ardv_avis_statut_cree on ardv_avis (statut, cree desc);

create table if not exists ardv_reponses (
  id uuid primary key default gen_random_uuid(),
  avis_id uuid references ardv_avis(id) on delete set null,
  texte text not null,
  cree timestamptz not null default now()
);
create index if not exists ardv_reponses_cree on ardv_reponses (cree desc);

create table if not exists ardv_exemples (id serial primary key, texte text not null);

-- Qui a le droit ? (fonction réutilisée par toutes les règles)
create or replace function ardv_est_autorise() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from ardv_autorises where email = lower(auth.jwt() ->> 'email'));
$$;
revoke all on function ardv_est_autorise() from public;
grant execute on function ardv_est_autorise() to authenticated;

alter table ardv_autorises enable row level security;
alter table ardv_profil    enable row level security;
alter table ardv_avis      enable row level security;
alter table ardv_reponses  enable row level security;
alter table ardv_exemples  enable row level security;

-- autorises : personne ne la lit depuis l'appli (la fonction ci-dessus la lit pour nous)
drop policy if exists "ardv equipe profil" on ardv_profil;
create policy "ardv equipe profil" on ardv_profil for all to authenticated using ((select ardv_est_autorise())) with check ((select ardv_est_autorise()));
drop policy if exists "ardv equipe avis" on ardv_avis;
create policy "ardv equipe avis" on ardv_avis for all to authenticated using ((select ardv_est_autorise())) with check ((select ardv_est_autorise()));
drop policy if exists "ardv equipe reponses" on ardv_reponses;
create policy "ardv equipe reponses" on ardv_reponses for all to authenticated using ((select ardv_est_autorise())) with check ((select ardv_est_autorise()));
drop policy if exists "ardv equipe exemples lecture" on ardv_exemples;
create policy "ardv equipe exemples lecture" on ardv_exemples for select to authenticated using ((select ardv_est_autorise()));
