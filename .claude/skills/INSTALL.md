# Installing the Laravel Enterprise Skill Library

## Where skills can live

| Scope | Path | Applies to |
|-------|------|-----------|
| User (global) | `~/.claude/skills/<skill-name>/SKILL.md` | Every project you open |
| Project | `<project>/.claude/skills/<skill-name>/SKILL.md` | That project only |
| Plugin | bundled in a Claude Code plugin | Wherever the plugin is enabled |

Windows user path: `C:\Users\<you>\.claude\skills\`.

Project skills win over user skills when names collide, so you can override a global
rule locally by copying the skill folder into the project and editing it.

## Option A — global install (recommended)

```powershell
# From the directory containing this file
.\install.ps1 -Scope user
```

Or manually:

```powershell
$src = "C:\xampp\htdocs\proj1\.claude\skills"
$dst = "$env:USERPROFILE\.claude\skills"
New-Item -ItemType Directory -Force $dst | Out-Null
Get-ChildItem $src -Directory | ForEach-Object {
    Copy-Item $_.FullName -Destination $dst -Recurse -Force
}
```

## Option B — per-project install

```powershell
.\install.ps1 -Scope project -Target "C:\xampp\htdocs\my-laravel-app"
```

Commit `.claude/skills/` to the repo so the whole team gets the same guidance.

## Option C — git submodule (keeps projects in sync)

```bash
git submodule add git@your-host:org/laravel-enterprise-skills.git .claude/skills
git submodule update --remote   # pull library updates later
```

## Verify

1. Restart Claude Code (or run `/doctor`).
2. Run `/help` or start typing `/laravel-` — the skills should be listed.
3. Ask: *"What layer should a Stripe webhook handler live in?"* — the architecture
   skill should activate without being named.

## Wire it into a project

Add to the project's `CLAUDE.md`:

```markdown
## Engineering standards

This project follows the Laravel Enterprise Skill Library (Laravel 12 / PHP 8.4).

- Load `laravel-ai-coding-standards` before any code change; it routes to the others.
- Non-negotiable gates before merge: `laravel-code-quality` checklist and
  `laravel-security` checklist.
- Public-facing UI additionally requires `laravel-ui-accessibility` and
  `laravel-responsive-design` sign-off.
```

## Optional: enforce the gates with hooks

`.claude/settings.json` in the project:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "php -l \"$CLAUDE_FILE_PATH\" 2>&1 | Select-String -NotMatch 'No syntax errors'"
          }
        ]
      }
    ]
  }
}
```

See each skill's `templates/` folder for CI equivalents (GitHub Actions) that enforce
the same gates outside the editor.

## Uninstall

```powershell
Get-ChildItem "$env:USERPROFILE\.claude\skills" -Directory -Filter "laravel-*" |
    Remove-Item -Recurse -Force -Confirm:$false
```
