// Ce que l'appli sait du restaurant. Injecté dans chaque demande à l'IA (jamais d'e-mail ni de montant).

export const DEFAULT_PROFILE = {
  nom: 'Café Au Rendez-Vous',
  adresse: '11 Allée des 6 Chapelles, 93200 Saint-Denis',
  situation: 'derrière la Basilique de Saint-Denis, dans une impasse piétonne',
  site: 'aurendezvous-saintdenis.fr',
  telephone: '09 84 47 70 16',
  horaires: 'Mar–Ven 11h30–17h · Sam–Dim 11h30–22h',
  specialites: ['galettes et crêpes bretonnes', 'glaces artisanales', 'smoothies', 'café barista', 'crème brûlée maison'],
  equipe: ['Rafiza', 'Sami', 'Chaima'],
  signature: "L'équipe du Café Au Rendez-Vous",
  motsCles: ['crêperie', 'Saint-Denis', 'Basilique de Saint-Denis', 'Café Au Rendez-Vous'],
  devise: "La satisfaction du client d'abord, le commerce ensuite.",
  classement: '4,9/5 sur Google avec plus de 760 avis',
  motsClesPosts: ['crêperie Saint-Denis', 'Basilique Cathédrale de Saint-Denis', 'glacier artisanal Saint-Denis', 'galettes bretonnes faites maison', 'Allée des 6 Chapelles', 'restaurant près de la Basilique', 'Stade de France', 'région parisienne'],
};

const liste = v => (Array.isArray(v) ? v.filter(Boolean).join(', ') : v || '');
const sansEmail = s => String(s).replace(/\S+@\S+/g, '');

export function contexteRestaurant(profil = {}) {
  const p = { ...profil };
  const lignes = [
    ['Restaurant', p.nom],
    ['Type', 'crêperie bretonne et glacier artisanal'],
    ['Adresse', p.adresse],
    ['Situation', p.situation],
    ['Site', p.site],
    ['Téléphone', p.telephone],
    ['Horaires', p.horaires],
    ['Spécialités', liste(p.specialites)],
    ['Équipe', liste(p.equipe)],
    ['Mots-clés locaux', liste(p.motsCles)],
    ['Devise', p.devise],
    ['Classement', p.classement],
  ];
  return lignes.filter(([, v]) => v).map(([k, v]) => `${k} : ${sansEmail(v)}`).join('\n');
}

export function fusionnerProfil(enregistre) {
  return { ...DEFAULT_PROFILE, ...(enregistre || {}) };
}
