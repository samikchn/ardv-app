# Une capture de l'appli en mode démo (Edge sans fenêtre, priorité basse, taille iPhone).
# Exemple : outils\capture.ps1 "ouvrir=coller" feuille -Sombre
param([string]$params = "", [string]$nom = "capture", [int]$hauteur = 844, [switch]$Sombre)
. "$PSScriptRoot\edge-commun.ps1"
$out = Join-Path $Racine "captures"
New-Item -ItemType Directory -Force $out | Out-Null
$fichier = Join-Path $out ($nom + ".png")
Invoke-EdgeHeadless -Url "http://localhost:5174/?demo&$params" -Screenshot $fichier -Largeur 390 -Hauteur $hauteur -Echelle 2 -Sombre:$Sombre
Write-Output "$nom : $(Test-Path $fichier)"
