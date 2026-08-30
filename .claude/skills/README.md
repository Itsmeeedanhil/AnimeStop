# Laravel Enterprise Skill Library

A modular library of Claude Code Skills that steer every Laravel project toward
enterprise-grade architecture, security, accessibility, performance, and operability.

Target stack: **Laravel 12 / PHP 8.4**.

## The twelve skills

| # | Skill | Owns | Never owns |
|---|-------|------|------------|
| 1 | `laravel-enterprise-architecture` | Layering, where code goes, patterns, DI, PSR | Query tuning, test writing |
| 2 | `laravel-ui-accessibility` | WCAG 2.2 AA, DICT guidelines, semantics, ARIA | Breakpoints, layout math |
| 3 | `laravel-responsive-design` | Mobile-first layout, breakpoints, touch targets | Contrast, ARIA, semantics |
| 4 | `laravel-performance` | N+1, caching, queues, asset pipeline | Schema design, index choice |
| 5 | `laravel-database-scale` | Schema, indexes, partitioning, growth planning | App-layer caching strategy |
| 6 | `laravel-security` | OWASP defence, authz, headers, secrets, abuse resistance | Upload pipeline mechanics |
| 7 | `laravel-media-management` | Upload validation, derivatives, storage layout, CDN | Generic security headers |
| 8 | `laravel-api-standards` | REST shape, versioning, errors, OpenAPI, Sanctum | UI concerns |
| 9 | `laravel-testing-qa` | Pest/PHPUnit, factories, a11y + security regression tests | Production code design |
| 10 | `laravel-devops-deployment` | Docker, Nginx, Horizon, CI/CD, backups, DR | Application code |
| 11 | `laravel-code-quality` | Pint, PHPStan/Larastan, Rector, dead/duplicate code | Runtime performance |
| 12 | `laravel-ai-coding-standards` | How Claude approaches any change in this repo | Domain-specific rules |

Boundaries are enforced in each `SKILL.md` under **Scope boundaries**. When two skills
seem to apply, the table above decides. Skill 12 is the meta-skill: it loads first and
tells Claude which of 1–11 to pull in.

## Layout of each skill

```
<skill-name>/
├── SKILL.md            # Frontmatter + core rules (always read fully)
├── references/         # Deep documentation, loaded on demand
├── templates/          # Copy-paste stubs, configs, workflows
├── checklists/         # Pre-merge / review gates
├── examples/           # Good vs bad, real-world
└── MAINTENANCE.md      # How to keep this skill current
```

Progressive disclosure: `SKILL.md` stays short enough to read every time; everything
heavy lives one hop away and is referenced by path.

## Installation

See [INSTALL.md](INSTALL.md). Short version:

```powershell
# Global (all projects)
.\install.ps1 -Scope user

# This project only — already done if the library lives in .claude/skills
.\install.ps1 -Scope project -Target C:\path\to\project
```

## Using the library

Skills auto-activate from their `description`. You can also invoke explicitly:

```
/laravel-enterprise-architecture
/laravel-security
```

Recommended `CLAUDE.md` line for any Laravel project using this library:

```markdown
This project follows the Laravel Enterprise Skill Library.
Before writing code, load `laravel-ai-coding-standards`; it will pull in the rest.
```

## Versioning

`LIBRARY_VERSION` in [MAINTENANCE.md](MAINTENANCE.md) tracks the library as a whole.
Individual skills carry a `Last reviewed` date at the bottom of their `SKILL.md`.

## License / reuse

MIT — see [LICENSE](../../LICENSE) at the repository root. Copy freely between projects;
keep the maintenance dates honest.
