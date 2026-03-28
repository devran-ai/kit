---
description: Preview server management. Start, stop, and check local development server.
version: 2.1.0
sdlc-phase: build
skills: [shell-conventions]
commit-types: [chore]
---

# /preview — Preview Server Management

> **Trigger**: `/preview [sub-command]`
> **Lifecycle**: Build — during development

> Standards: See `rules/workflow-standards.md`

---

## Critical Rules

1. Auto-detect project type from config files
2. Handle port conflicts gracefully
3. No background orphans — track and provide stop commands
4. Platform-aware (web, mobile, API)

---

## Argument Parsing

| Command | Action |
| :--- | :--- |
| `/preview` | Show status |
| `/preview start` | Start dev server |
| `/preview stop` | Stop server |
| `/preview restart` | Restart server |

---

## Steps

// turbo
1. **Detect Type** — scan config files, determine command and port

// turbo
2. **Check State** — server running? Port available? Dependencies installed?

3. **Execute** — start/stop/restart/status

4. **Port Conflicts** — offer alternate port, close conflict, or custom port

---

## Project Detection

| Type | Config | Command | Port |
| :--- | :--- | :--- | :--- |
| Next.js | `next.config.*` | `npm run dev` | 3000 |
| Vite | `vite.config.*` | `npm run dev` | 5173 |
| Expo | `app.json` | `npx expo start` | 8081 |
| NestJS | `nest-cli.json` | `npm run start:dev` | 3000 |
| Django | `manage.py` | `python manage.py runserver` | 8000 |
| FastAPI | `main.py` | `uvicorn main:app --reload` | 8000 |

---

## Output Template

```markdown
## 👁️ Preview Server

- **Type**: [framework]
- **URL**: http://localhost:[port]
- **Status**: Running / Stopped

Stop: `/preview stop` · Restart: `/preview restart`
```

---

## Governance

**PROHIBITED:** Starting without detection · orphaned processes · auto-running without awareness

**REQUIRED:** Project detection · port conflict resolution · clean process management

---

## Completion Criteria

- [ ] Project type detected (Next.js / Vite / Expo / NestJS / Django / FastAPI)
- [ ] Server status confirmed (running / stopped / restarted)
- [ ] Port available or conflict resolved with alternate port offered
- [ ] No orphaned processes — stop command provided
- [ ] Health check passed: `curl -s localhost:[port]` returns HTTP 2xx

---

## Related Resources

- **Cross-cutting**: Available during any Build phase
