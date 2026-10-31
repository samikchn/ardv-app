/* Réglages de l'appli. Laisser vide = mode démo (rien n'est envoyé en ligne). */
window.APP_CONFIG = {
  supabaseUrl: 'https://zpvnutaebvujpplbusae.supabase.co', // projet partagé avec Notre Jardin (tables ardv_*)
  // Clé PUBLIQUE (anon) : elle peut être vue, la sécurité est dans la base (RLS).
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwdm51dGFlYnZ1anBwbGJ1c2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NjcwNjcsImV4cCI6MjEwNzE0MzA2N30.XbF30RP4nULyzKzDe5B5JTu166q-v9OSQhENV_Rc85Q',
  // Clé PUBLIQUE des notifications de rappel (la clé privée reste côté serveur)
  vapidPublicKey: 'BHtVPEGxhDXkDw9MFk9OIhCVczCUuZUOVUhLnrY7G6hX78Mps-Xs2WeFGaRnBqqiNAOxyQg6CZBlPHrGS3xbpZg',
};
