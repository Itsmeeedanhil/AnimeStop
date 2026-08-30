<#
.SYNOPSIS
    Installs the Laravel Enterprise Skill Library into a user or project skills directory.

.EXAMPLE
    .\install.ps1 -Scope user
.EXAMPLE
    .\install.ps1 -Scope project -Target "C:\xampp\htdocs\my-app"
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('user', 'project')]
    [string]$Scope,

    [string]$Target,

    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$source = $PSScriptRoot

if ($Scope -eq 'user') {
    $destination = Join-Path $env:USERPROFILE '.claude\skills'
}
else {
    if (-not $Target) { throw "-Target is required when -Scope is 'project'." }
    if (-not (Test-Path $Target)) { throw "Target path does not exist: $Target" }
    $destination = Join-Path $Target '.claude\skills'
}

if ((Resolve-Path $source).Path -eq (Resolve-Path -ErrorAction SilentlyContinue $destination).Path) {
    Write-Host "Source and destination are the same. Nothing to do."
    return
}

New-Item -ItemType Directory -Force -Path $destination | Out-Null

$skills = Get-ChildItem $source -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'SKILL.md') }

if (-not $skills) { throw "No skill folders (containing SKILL.md) found in $source" }

foreach ($skill in $skills) {
    $dest = Join-Path $destination $skill.Name
    if ((Test-Path $dest) -and -not $Force) {
        Write-Host ("SKIP  {0} (already exists; use -Force to overwrite)" -f $skill.Name)
        continue
    }
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
    Copy-Item $skill.FullName -Destination $destination -Recurse -Force
    Write-Host ("OK    {0}" -f $skill.Name)
}

Write-Host ""
Write-Host ("Installed {0} skill(s) to {1}" -f $skills.Count, $destination)
Write-Host "Restart Claude Code, then type '/laravel-' to confirm they are loaded."
