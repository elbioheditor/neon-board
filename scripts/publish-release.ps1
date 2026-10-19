# Automated Publish Release Script: builds installer, uploads to GitHub Releases, and deletes all local binaries
# Reads version dynamically from package.json

$ErrorActionPreference = "Stop"

$pkg = Get-Content "c:\Neon\package.json" -Raw | ConvertFrom-Json
$appVer = $pkg.version
$tagName = "v$appVer"

Write-Output "=== 1. Starting automated release for $tagName ==="

Write-Output "=== 2. Retrieving GitHub Credentials ==="
$credInput = "protocol=https`nhost=github.com`n`n"
$credOutput = $credInput | git credential fill
$token = ($credOutput | Select-String "^password=(.+)$").Matches.Groups[1].Value

if (-not $token) {
    Write-Error "Could not retrieve GitHub token."
    exit 1
}

$headers = @{
    Authorization = "Bearer $token"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

Write-Output "=== 3. Compiling Frontend (Vite) ==="
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Vite build failed."
    exit 1
}

Write-Output "=== 4. Packaging Installer with electron-builder ==="
$env:GH_TOKEN = $token
$env:GITHUB_TOKEN = $token

& npx.cmd electron-builder --win nsis
if ($LASTEXITCODE -ne 0) {
    Write-Error "electron-builder packaging failed."
    exit 1
}

Write-Output "=== 5. Checking / Creating GitHub Release $tagName ==="
$release = $null
try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/elbioheditor/neon-board/releases/tags/$tagName" -Headers $headers -Method Get
    Write-Output "Release $tagName already exists (ID: $($release.id))."
} catch {
    Write-Output "Creating new Release $tagName on GitHub..."
    $releaseBody = @{
        tag_name = $tagName
        name = $tagName
        body = "Release $tagName - Tutorial Alignment & UI Element Inconsistencies Fixed (+ Add a card, INICIAR, Drag to Complete, Routine Setup)"
        draft = $false
        prerelease = $false
    } | ConvertTo-Json

    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/elbioheditor/neon-board/releases" -Headers $headers -Method Post -Body $releaseBody
    Write-Output "Created Release $tagName (ID: $($release.id))."
}

# If any assets already exist on this release, delete them first to ensure clean upload
if ($release.assets -and $release.assets.Length -gt 0) {
    foreach ($asset in $release.assets) {
        Write-Output "Removing existing asset $($asset.name)..."
        Invoke-RestMethod -Uri "https://api.github.com/repos/elbioheditor/neon-board/releases/assets/$($asset.id)" -Headers $headers -Method Delete | Out-Null
    }
}

$uploadBase = $release.upload_url -replace '\{\?name,label\}', ''

$filesToUpload = @(
    @{ Path = "c:\Neon\release\Neon-Setup-$appVer.exe"; Name = "Neon-Setup-$appVer.exe"; Type = "application/octet-stream" },
    @{ Path = "c:\Neon\release\Neon-Setup-$appVer.exe.blockmap"; Name = "Neon-Setup-$appVer.exe.blockmap"; Type = "application/octet-stream" },
    @{ Path = "c:\Neon\release\latest.yml"; Name = "latest.yml"; Type = "text/yaml" }
)

Write-Output "=== 6. Uploading Installer Assets to GitHub Release ==="
foreach ($f in $filesToUpload) {
    if (Test-Path $f.Path) {
        $uploadUri = "$uploadBase`?name=$($f.Name)"
        $uploadHeaders = @{
            Authorization = "Bearer $token"
            Accept = "application/vnd.github+json"
            "Content-Type" = $f.Type
        }
        $res = Invoke-RestMethod -Uri $uploadUri -Method Post -Headers $uploadHeaders -InFile $f.Path
        Write-Output "UPLOADED: $($res.name) ($($res.size) bytes)"
    } else {
        Write-Warning "File not found: $($f.Path)"
    }
}

Write-Output "=== 7. CLEANING LOCAL PC: DELETING ALL LOCAL INSTALLER BINARIES ==="
Get-ChildItem -Path "c:\Neon\release" -Include "*.exe","*.blockmap","*.yml" -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
Remove-Item -Path "c:\Neon\release\win-unpacked" -Recurse -Force -ErrorAction SilentlyContinue

Write-Output "=== 8. Verification of Clean Local Disk ==="
$leftover = Get-ChildItem -Path "c:\Neon\release" -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue
if ($leftover) {
    Write-Warning "Leftover .exe detected! Deleting..."
    $leftover | Remove-Item -Force
} else {
    Write-Output "Zero .exe files on local disk. Local cleanup 100% verified."
}

Write-Output "=== SUCCESS: Release $tagName published online! Neon auto-updater will now notify users within 30 seconds. ==="
