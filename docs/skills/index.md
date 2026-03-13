# Skills

Skills are domain expertise modules that extend AI capabilities with specialized knowledge and patterns. **31 skills** across 7 categories.

---

## Skill Categories

### 🔧 Operational Skills

Core runtime capabilities for AI agent operation.

| Skill                   | Purpose                                       |
| :---------------------- | :-------------------------------------------- |
| **verification-loop**   | Continuous quality gates (build, lint, test)  |
| **continuous-learning** | Pattern extraction from sessions (PAAL cycle) |
| **strategic-compact**   | Context window management                     |
| **eval-harness**        | Performance evaluation metrics                |
| **context-budget**      | Context window budget management              |

---

### 🎯 Orchestration Skills

Multi-agent coordination and routing.

| Skill                   | Purpose                                                 |
| :---------------------- | :------------------------------------------------------ |
| **intelligent-routing** | Automatic agent selection based on task                 |
| **parallel-agents**     | Multi-agent orchestration for complex tasks             |
| **behavioral-modes**    | Adaptive AI operation modes (brainstorm, debug, review) |

---

### 💻 Development Skills

Core development patterns and best practices.

| Skill                 | Purpose                                     |
| :-------------------- | :------------------------------------------ |
| **app-builder**       | Full-stack application scaffolding          |
| **frontend-patterns** | React, component patterns, state management |
| **nodejs-patterns**   | Backend/NestJS patterns                     |
| **typescript-expert** | Advanced TypeScript patterns                |
| **api-patterns**      | RESTful API design principles               |
| **clean-code**        | Code quality principles (SOLID, DRY)        |
| **database-design**   | Schema design and optimization              |

---

### ✅ Quality Skills

Testing, debugging, and security.

| Skill                    | Purpose                         |
| :----------------------- | :------------------------------ |
| **testing-patterns**     | TDD, unit, integration testing  |
| **debugging-strategies** | Systematic debugging approaches |
| **security-practices**   | OWASP, vulnerability prevention |
| **webapp-testing**       | E2E and Playwright testing      |

---

### 🚀 Infrastructure Skills

DevOps, deployment, and performance.

| Skill                     | Purpose                                     |
| :------------------------ | :------------------------------------------ |
| **docker-patterns**       | Containerization best practices             |
| **git-workflow**          | Branching, commits, PRs                     |
| **deployment-procedures** | CI/CD and rollback strategies               |
| **performance-profiling** | Core Web Vitals optimization                |
| **shell-conventions**     | Windows PowerShell conventions (avoid bash) |

---

### 🎨 Design & Planning Skills

Architecture, design, and planning.

| Skill              | Purpose                                            |
| :----------------- | :------------------------------------------------- |
| **architecture**   | System design patterns (SOLID, Clean Architecture) |
| **mobile-design**  | Mobile UI/UX patterns for iOS/Android              |
| **brainstorming**  | Socratic discovery protocol                        |
| **plan-writing**   | Structured task breakdown                          |
| **ui-ux-pro-max**  | Design intelligence with searchable style database |

---

### 🌐 Domain Skills

Specialized domain expertise modules.

| Skill                  | Purpose                                           |
| :--------------------- | :------------------------------------------------ |
| **i18n-localization**  | Internationalization and localization patterns     |
| **mcp-integration**    | Model Context Protocol integration patterns       |

---

## Using Skills

Skills are loaded automatically based on task context:

```
User Request → Keyword Analysis → Skill Match → Load SKILL.md → Apply Context
```

The `intelligent-routing` skill coordinates automatic skill selection.
