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

-- ===== Ajouts du 31/10/2026 (déjà appliqués en ligne) =====
-- E-mails « nouvel avis » reçus du script Gmail et jetons des scripts (lisibles seulement par les fonctions serveur)
create table if not exists ardv_emails (id text primary key, sujet text, date timestamptz, texte text, nb_avis int not null default 0, recu timestamptz not null default now());
alter table ardv_emails enable row level security;
create table if not exists ardv_jetons (nom text primary key, jeton text not null);
alter table ardv_jetons enable row level security;
insert into ardv_jetons(nom, jeton) values ('gmail', encode(extensions.gen_random_bytes(24), 'hex')), ('ads', encode(extensions.gen_random_bytes(24), 'hex')), ('cron', encode(extensions.gen_random_bytes(24), 'hex')) on conflict do nothing;
-- ('vapid' : paire de clés de notification générée à part, au format JWK)

-- Posts, abonnements aux notifications, photos
create table if not exists ardv_posts (id uuid primary key default gen_random_uuid(), numero serial, idee text not null default '', textes jsonb not null default '{}'::jsonb, photos text[] not null default '{}', rappel timestamptz, rappel_envoye boolean not null default false, statut text not null default 'prevu' check (statut in ('prevu', 'publie')), cree timestamptz not null default now());
alter table ardv_posts enable row level security;
create policy "ardv equipe posts" on ardv_posts for all to authenticated using ((select ardv_est_autorise())) with check ((select ardv_est_autorise()));
create table if not exists ardv_push (endpoint text primary key, email text not null, abonnement jsonb not null, cree timestamptz not null default now());
alter table ardv_push enable row level security;
create policy "ardv equipe push" on ardv_push for all to authenticated using ((select ardv_est_autorise())) with check ((select ardv_est_autorise()));
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('ardv-photos', 'ardv-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']) on conflict (id) do nothing;
create policy "ardv photos lecture" on storage.objects for select to authenticated using (bucket_id = 'ardv-photos' and (select ardv_est_autorise()));
create policy "ardv photos ajout" on storage.objects for insert to authenticated with check (bucket_id = 'ardv-photos' and (select ardv_est_autorise()));
create policy "ardv photos suppression" on storage.objects for delete to authenticated using (bucket_id = 'ardv-photos' and (select ardv_est_autorise()));

-- Chiffres Google Ads et résumé du coach
create table if not exists ardv_pubs (id bigserial primary key, recu timestamptz not null default now(), donnees jsonb not null, coach text, coach_date date);
alter table ardv_pubs enable row level security;
create policy "ardv equipe pubs lecture" on ardv_pubs for select to authenticated using ((select ardv_est_autorise()));
create policy "ardv equipe pubs coach" on ardv_pubs for update to authenticated using ((select ardv_est_autorise())) with check ((select ardv_est_autorise()));

-- Rappels : toutes les 5 minutes
select cron.schedule('ardv-rappels', '*/5 * * * *', $$ select net.http_post(
  url := 'https://zpvnutaebvujpplbusae.supabase.co/functions/v1/ardv-rappels',
  headers := jsonb_build_object('Content-Type', 'application/json', 'x-ardv-jeton', (select jeton from public.ardv_jetons where nom = 'cron')),
  body := '{}'::jsonb) $$);
