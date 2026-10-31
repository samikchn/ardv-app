// « Modifier » : refaire un texte généré en suivant une consigne de Rafiza (plus court, ajoute ceci…).
// Pur : testé avec node --test. Garde la demande d'origine (règles, exemples, photos) et ajoute la version actuelle.

export function avecModification(demande, versionActuelle, consigne) {
  const c = String(consigne || '').trim();
  if (!c) return demande;
  const actuelle = typeof versionActuelle === 'string' ? versionActuelle : JSON.stringify(versionActuelle);
  return {
    ...demande,
    user: `${demande.user}\n\nCurrent version (written before):\n${actuelle}\n\nThe owner asks for this change: ${c}\nApply exactly this change and keep everything else as it is (same rules, same output format).`,
  };
}
