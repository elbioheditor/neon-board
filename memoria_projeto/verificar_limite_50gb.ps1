# Verifica se o tamanho total do projeto e da pasta de memoria esta muito abaixo do limite de 50 GB
$maxBytes = 50L * 1024L * 1024L * 1024L # 50 GB
$projectPath = "C:\Neon"
$memPath = "C:\Neon\memoria_projeto"

$projBytes = (Get-ChildItem -Path $projectPath -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
$memBytes = (Get-ChildItem -Path $memPath -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum

$projMB = [math]::Round(($projBytes / 1MB), 2)
$memKB = [math]::Round(($memBytes / 1KB), 2)

Write-Output "Tamanho da pasta de memoria ($memPath): $memKB KB"
Write-Output "Tamanho total do projeto ($projectPath): $projMB MB / Limite: 51200 MB (50 GB)"

if ($projBytes -gt $maxBytes) {
    Write-Error "ALERTA: O projeto ultrapassou o limite de 50 GB! Limpe arquivos temporarios imediatamente."
    exit 1
}
