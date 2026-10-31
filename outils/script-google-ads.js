/**
 * Au Rendez-Vous — script Google Ads (Outils → Actions groupées → Scripts, dans le compte Ads du restaurant).
 * LECTURE SEULE : il lit les chiffres des campagnes et les envoie à l'appli. Il ne modifie rien dans le compte.
 * À programmer « Toutes les heures ».
 * La version à coller (avec le jeton) est dans donnees-privees/script-google-ads.js, jamais dans le dépôt public.
 */
var URL_APPLI = 'https://zpvnutaebvujpplbusae.supabase.co/functions/v1/ardv-pubs';
var JETON = 'A_REMPLACER';

function main() {
  var campagnes = {};
  // 1. Toutes les campagnes (même sans chiffres sur la période)
  var base = AdsApp.search("SELECT campaign.id, campaign.name, campaign.status, campaign.primary_status, campaign_budget.amount_micros FROM campaign WHERE campaign.status != 'REMOVED'");
  while (base.hasNext()) {
    var r = base.next();
    campagnes[r.campaign.id] = {
      nom: r.campaign.name, statut: r.campaign.status, etat: r.campaign.primaryStatus,
      budget: Math.round((+(r.campaignBudget && r.campaignBudget.amountMicros) || 0) / 1e4) / 100,
    };
  }
  // 2. Chiffres : hier et 7 jours
  [['hier', 'YESTERDAY'], ['semaine', 'LAST_7_DAYS']].forEach(function (p) {
    var lignes = AdsApp.search('SELECT campaign.id, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.phone_calls FROM campaign WHERE campaign.status != \'REMOVED\' AND segments.date DURING ' + p[1]);
    while (lignes.hasNext()) {
      var l = lignes.next();
      var c = campagnes[l.campaign.id];
      if (!c) continue;
      c[p[0]] = {
        clics: +l.metrics.clicks || 0, impressions: +l.metrics.impressions || 0,
        cout: Math.round((+l.metrics.costMicros || 0) / 1e4) / 100,
        conversions: Math.round((+l.metrics.conversions || 0) * 10) / 10, appels: +l.metrics.phoneCalls || 0,
      };
    }
  });
  // 3. Ce que les gens ont tapé (7 jours), les plus chers d'abord
  var termes = [];
  var t = AdsApp.search('SELECT search_term_view.search_term, metrics.clicks, metrics.cost_micros FROM search_term_view WHERE segments.date DURING LAST_7_DAYS ORDER BY metrics.cost_micros DESC LIMIT 15');
  while (t.hasNext()) {
    var x = t.next();
    termes.push({ terme: x.searchTermView.searchTerm, clics: +x.metrics.clicks || 0, cout: Math.round((+x.metrics.costMicros || 0) / 1e4) / 100 });
  }
  var envoi = { date: new Date().toISOString(), campagnes: Object.keys(campagnes).map(function (k) { return campagnes[k]; }), termes: termes };
  var reponse = UrlFetchApp.fetch(URL_APPLI, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-ardv-jeton': JETON }, payload: JSON.stringify(envoi),
  });
  Logger.log(reponse.getResponseCode() + ' ' + reponse.getContentText());
}
