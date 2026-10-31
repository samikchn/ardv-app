/**
 * Au Rendez-Vous — script Gmail (Google Apps Script, sur le compte Google du restaurant).
 * Toutes les 15 minutes : cherche les e-mails Google « nouvel avis » pas encore envoyés,
 * les envoie à l'appli (qui crée les tickets à répondre), puis leur met l'étiquette « ardv-envoye ».
 * Il ne lit QUE ces e-mails, n'envoie aucun e-mail et ne supprime rien.
 *
 * Installation : coller ce code sur script.google.com, choisir la fonction « installer », cliquer Exécuter, autoriser.
 * La version à coller (avec le jeton) est dans donnees-privees/script-gmail.gs, jamais dans le dépôt public.
 */
const URL_APPLI = 'https://zpvnutaebvujpplbusae.supabase.co/functions/v1/ardv-avis-gmail';
const JETON = 'A_REMPLACER';
// Seulement les e-mails venant de Google (un e-mail piégé d'un autre expéditeur est ignoré)
const RECHERCHE = 'from:google.com (subject:avis OR subject:review) newer_than:30d -label:ardv-envoye';

function envoyerAvis() {
  const etiquette = GmailApp.getUserLabelByName('ardv-envoye') || GmailApp.createLabel('ardv-envoye');
  const fils = GmailApp.search(RECHERCHE, 0, 30);
  if (!fils.length) return;
  const emails = [];
  fils.forEach(fil => fil.getMessages().forEach(m => emails.push({
    id: m.getId(), de: m.getFrom(), sujet: m.getSubject(), date: m.getDate().toISOString(), texte: m.getPlainBody(),
  })));
  const r = UrlFetchApp.fetch(URL_APPLI, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-ardv-jeton': JETON }, payload: JSON.stringify({ emails }),
  });
  console.log(r.getResponseCode() + ' ' + r.getContentText());
  if (r.getResponseCode() === 200) fils.forEach(fil => fil.addLabel(etiquette));
}

function installer() {
  ScriptApp.getProjectTriggers().forEach(d => ScriptApp.deleteTrigger(d));
  ScriptApp.newTrigger('envoyerAvis').timeBased().everyMinutes(15).create();
  envoyerAvis();
}
