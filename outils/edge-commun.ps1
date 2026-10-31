# Outils communs aux scripts de test : lancer Edge sans fenêtre SANS faire ramer le PC.
#  - priorité basse : Windows garde la main pour la souris, le clavier et les autres applis ;
#  - un profil temporaire par lancement, EFFACÉ juste après (avant : ils s'accumulaient dans TEMP) ;
#  - options qui allègent Edge (pas d'extensions, pas de synchro, pas de mises à jour en arrière-plan) ;
#  - le petit serveur de test est démarré une seule fois s'il ne tourne pas déjà.
# À inclure avec :  . "$PSScriptRoot\edge-commun.ps1"

$script:EdgeExe = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$script:Racine = Split-Path $PSScriptRoot -Parent

function Assert-ServeurLocal {
  $ok = $false
  try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1', 5174); $ok = $c.Connected; $c.Close() } catch {}
  if ($ok) { return }
  $p = Start-Process python -ArgumentList 'outils/serveur-local.py' -WorkingDirectory $script:Racine -WindowStyle Hidden -PassThru
  try { $p.PriorityClass = 'BelowNormal' } catch {}
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 250
    try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1', 5174); if ($c.Connected) { $c.Close(); return } } catch {}
  }
}

# Lance Edge sans fenêtre en priorité basse. -DumpTo : enregistre la page finale (HTML) dans ce fichier.
function Invoke-EdgeHeadless {
  param(
    [Parameter(Mandatory)][string]$Url,
    [string]$DumpTo = "",
    [string]$Screenshot = "",
    [int]$Largeur = 500, [int]$Hauteur = 1082, [double]$Echelle = 1.6,
    [int]$Budget = 6000, [switch]$Sombre
  )
  Assert-ServeurLocal
  $profil = Join-Path $env:TEMP ("ardv-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
  $opts = @(
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run',
    '--disable-extensions', '--disable-sync', '--disable-background-networking', '--disable-component-update',
    '--disable-default-apps', "--user-data-dir=`"$profil`"",
    "--window-size=$Largeur,$Hauteur", "--force-device-scale-factor=$Echelle", "--virtual-time-budget=$Budget"
  )
  if ($Sombre) { $opts += '--blink-settings=preferredColorScheme=0' } else { $opts += '--blink-settings=preferredColorScheme=1' }
  if ($Screenshot) { $opts += "--screenshot=`"$Screenshot`"" }
  if ($DumpTo) { $opts += '--dump-dom' }
  $opts += "`"$Url`""
  $sp = @{ FilePath = $script:EdgeExe; ArgumentList = $opts; PassThru = $true; WindowStyle = 'Hidden' }
  $err = Join-Path $env:TEMP 'ardv-edge-err.txt'
  if ($DumpTo) { $sp.RedirectStandardOutput = $DumpTo; $sp.RedirectStandardError = $err }
  $p = Start-Process @sp
  # Edge remonte lui-même la priorité de certains sous-processus : on les remet en priorité basse
  # tant que le test tourne, et on les limite à la moitié des cœurs (l'autre moitié reste libre pour toi).
  $coeurs = [Environment]::ProcessorCount
  $masque = [IntPtr]([long][math]::Pow(2, [math]::Max(1, [math]::Floor($coeurs / 2))) - 1)
  $marque = Split-Path $profil -Leaf
  while (-not $p.HasExited) {
    Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue |
      Where-Object { $_.CommandLine -and $_.CommandLine.Contains($marque) } |
      ForEach-Object {
        try {
          $proc = Get-Process -Id $_.ProcessId -ErrorAction Stop
          if ($proc.PriorityClass -ne 'BelowNormal' -and $proc.PriorityClass -ne 'Idle') { $proc.PriorityClass = 'BelowNormal' }
          if ($proc.ProcessorAffinity -ne $masque) { $proc.ProcessorAffinity = $masque }
        } catch {}
      }
    Start-Sleep -Milliseconds 400
  }
  Start-Sleep -Milliseconds 300
  Remove-Item -Recurse -Force $profil -ErrorAction SilentlyContinue
}

# Lit le résultat d'un test écrit par la page dans <pre id="test-out">
function Get-ResultatTest([string]$fichier) {
  if (-not (Test-Path $fichier)) { return "Pas de resultat" }
  $t = Get-Content $fichier -Raw -Encoding UTF8
  $m = [regex]::Match($t, '<pre id="test-out">(.*?)</pre>')
  if ($m.Success) { [System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value) } else { "Pas de resultat (la page n'a pas fini ?)" }
}
