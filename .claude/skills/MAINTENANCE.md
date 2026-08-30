# Maintaining the Laravel Enterprise Skill Library

`LIBRARY_VERSION: 1.0.0`
Target stack: **Laravel 12 / PHP 8.4**
Last full review: **2026-07-31**

Each skill has its own `MAINTENANCE.md` covering its subject matter. This file covers the
library as a whole.

## Review cadence

| Skill | Cadence | Why |
|---|---|---|
| `laravel-security` | **3 months** | Advisories and OWASP guidance move constantly |
| `laravel-devops-deployment` | **3 months** | Names specific versions, paths, and provider behaviour |
| Everything else | 6 months | Plus immediately on a Laravel or PHP major |

Trigger a full-library review on: a Laravel major release, a PHP major release, or a WCAG
version change.

## What goes stale, and where

| Category | Files | Failure mode |
|---|---|---|
| Version-specific paths | devops (`php8.4-fpm.sock`, `/etc/php/8.4/`) | Silently wrong after an upgrade |
| Tool rule-set names | code-quality (`LARAVEL_120`, Pint rules) | Config fails at runtime |
| Sizing numbers | devops, database | Copied verbatim onto smaller hardware |
| Regulatory claims | security (RA 10173), accessibility (DICT) | Confidently stated and out of date |
| Browser/CSS support | responsive, accessibility | Recommends something unsupported, or over-hedges something now safe |
| Provider specifics | devops, media (R2, S3, Hostinger) | Pricing and capabilities change |

Search across the library when a version changes:

```powershell
Select-String -Path .\**\*.md,.\**\templates\* -Pattern '8\.4|LARAVEL_1[0-9]0|mysql:8' |
    Select-Object Path, LineNumber, Line
```

## The hedges that must survive editing

Three claims in this library are deliberately qualified. An edit that strengthens any of
them is wrong.

**1. DDoS** (`laravel-security`). Application rate limiting does not stop volumetric
attacks. The layered model names what each layer actually does. Never let it collapse into
"we have DDoS protection".

**2. Legal compliance** (`laravel-security/references/data-privacy-ph.md`,
`laravel-ui-accessibility/references/dict-philippines.md`). Both carry scope notes saying
they are not legal authorities. Circular numbers and mandatory-page lists change. The
stable, safe claim is that WCAG 2.2 AA meets or exceeds the DICT technical bar — build to
that.

**3. Backups** (`laravel-devops-deployment`). A backup that has never been restored has an
unknown success rate. The DR checklist exists to make that measurable.

## Cross-skill consistency

Shared topics are owned by one skill and referenced by others. When you change guidance in
a shared area, **change both places in the same commit.**

| Topic | Owner | Also mentions it |
|---|---|---|
| WCAG 1.4.10 / 1.4.4 | accessibility (criterion) | responsive (technique) |
| Index selection | database-scale | performance (check the plan) |
| Multi-tenancy | database-scale (schema) | security (enforcement) |
| `per_page` cap | performance | security, api-standards |
| Upload validation | media-management (rules) | security (why) |
| `alt` text | accessibility (content) | media-management (make it required) |
| Rate limiting | security (definitions) | devops (Nginx/CDN) |
| Query-count assertions | performance (why) | testing (the helper) |
| `Http::preventStrayRequests` | testing | — |
| Composer scripts | architecture | code-quality, devops |
| Deploy sequence | devops | — (appears in 4 files **within** devops) |
| Error envelope | api-standards | — (appears in 4 files **within** api-standards) |

The last two are internal duplications inside a single skill. They are the ones most likely
to drift.

## Verifying the library

```powershell
# Every skill has the required structure
Get-ChildItem -Directory | Where-Object { $_.Name -like 'laravel-*' } | ForEach-Object {
    $missing = @('SKILL.md','MAINTENANCE.md') | Where-Object { -not (Test-Path "$($_.FullName)\$_") }
    if ($missing) { "$($_.Name): missing $($missing -join ', ')" }
}

# Frontmatter name matches the folder name
Get-ChildItem -Directory -Filter 'laravel-*' | ForEach-Object {
    $name = (Select-String -Path "$($_.FullName)\SKILL.md" -Pattern '^name:\s*(.+)$').Matches.Groups[1].Value.Trim()
    if ($name -ne $_.Name) { "$($_.Name): frontmatter says '$name'" }
}

# Every path referenced in a SKILL.md exists
Get-ChildItem -Directory -Filter 'laravel-*' | ForEach-Object {
    Push-Location $_.FullName
    Select-String -Path .\SKILL.md -Pattern '`([a-z]+/[a-z0-9\-\.]+)`' -AllMatches |
        ForEach-Object { $_.Matches.Groups[1].Value } | Sort-Object -Unique |
        Where-Object { -not (Test-Path $_) } |
        ForEach-Object { "$($args[0]): missing $_" }
    Pop-Location
}
```

```bash
# PHP templates parse.
# NOTE: only plain .php templates are lintable. Files containing {{ Placeholder }}
# tokens are NOT valid PHP by design — substitute the placeholders before linting.
find . -name '*.php' | xargs -I{} php -l {} 2>&1 | grep -v 'No syntax errors'

# Placeholder stubs: lint after substitution
for f in $(find . -name '*.stub'); do
    sed -E 's/\{\{ *[A-Za-z]+ *\}\}/Placeholder/g' "$f" > /tmp/stub.php
    php -l /tmp/stub.php 2>&1 | grep -v 'No syntax errors' && echo "  in $f"
done

# JS and JSON parse
find . -name '*.js' | xargs -I{} node --check {}
find . -name '*.json' | xargs -I{} node -e "JSON.parse(require('fs').readFileSync('{}'))"

# Shell scripts parse
bash -n laravel-devops-deployment/templates/deploy.sh
bash -n laravel-code-quality/templates/pre-commit
```

## Behavioural tests

Structure checks prove the files exist. These prove the library works. Run after any
significant edit:

| Prompt | Expected |
|---|---|
| "Add an endpoint to list a user's orders" | `whenLoaded`, whitelisted sort, capped `per_page`, `cursorPaginate` |
| "Let users upload a profile picture" | `mimetypes:`, generated filename, private disk, queued job |
| "Show the order status as a coloured dot" | Pushes back on colour-only encoding |
| "How do we protect against DDoS?" | The layered model, not "add throttle middleware" |
| "My deploy went through but the code didn't change" | OPcache reload **and** `queue:restart` |
| "Fix the typo in the welcome email" | Does **not** produce a nine-file change |
| "PHPStan is failing with 200 errors" | Baseline and reduce, not lower the level |
| "Should I extract this duplicated code?" | "When the copies must change together", not "always" |

The sixth is the most important regression test. A library that applies full ceremony to
trivial changes stops being used.

## Adding a skill

1. Follow the existing structure: `SKILL.md`, `references/`, `templates/`, `checklists/`,
   `examples/`, `MAINTENANCE.md`
2. Frontmatter `name` matches the folder, kebab-case
3. `description` is trigger-rich — it is how the skill activates
4. `SKILL.md` under ~250 lines; depth goes in `references/`
5. Add a **Scope boundaries** section naming what it does *not* own
6. Add it to the ownership table in `README.md`
7. **Add it to the routing table in `laravel-ai-coding-standards`** — in both `SKILL.md`
   and `references/routing.md`
8. Check for overlap with existing skills; if found, agree the split and record it in both

Step 7 is the one that gets missed. Without it the skill exists but is never routed to.

## Removing or renaming a skill

`laravel-ai-coding-standards` names every other skill explicitly. Renaming one breaks the
routing silently — the text still reads correctly but points at nothing.

```powershell
# Run this after any rename
Push-Location laravel-ai-coding-standards
Select-String -Path .\SKILL.md,.\references\routing.md -Pattern '`(laravel-[a-z\-]+)`' -AllMatches |
    ForEach-Object { $_.Matches.Groups[1].Value } | Sort-Object -Unique |
    Where-Object { -not (Test-Path "..\$_\SKILL.md") }
Pop-Location
```

## Deprecating guidance

Delete it. Do not leave a rule marked "deprecated" — `SKILL.md` is read in full on every
activation, and a stale rule costs attention every time.

Record the removal in the skill's own changelog so the reasoning is not lost.

## Boundary discipline — the library-level rule

Every skill has a **Scope boundaries** section. They exist because overlapping skills
produce contradictory advice, which is worse than a gap.

When adding guidance, ask: *does another skill already own this topic?* If yes, add a
one-line handoff rather than a second copy.

The meta-skill (`laravel-ai-coding-standards`) owns **no technical rules at all**. If an
edit puts a rule about indexes or ARIA into the routing skill, that edit is wrong.

## Library changelog

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-07-31 | Initial release. Twelve skills, Laravel 12 / PHP 8.4. |
