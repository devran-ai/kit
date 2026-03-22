---
name: architecture
description: "System design patterns, DDD, 12-Factor App, SOLID principles, event-driven architecture, and architectural decision frameworks"
triggers: [context, architecture, design, system]
---

# Architecture Skill

> **Purpose**: Apply proven architectural patterns for scalable, maintainable systems

---

## Architectural Patterns — When to Use

| Pattern | When to Use |
|:--------|:-----------|
| Layered | Simple apps with clear separation; each layer imports only from below |
| Clean Architecture | Complex domains; dependency rule: source code deps always point inward |
| Hexagonal (Ports & Adapters) | Testable domain cores; domain defines ports, adapters implement them |
| Monolith | MVP, small team, simple domain |
| Modular Monolith | Growing team, clear bounded contexts, not ready for distributed |
| Microservices | Large team, independent scaling, domain maturity |
| Serverless | Variable load, cost optimization, simple functions |

---

## Domain-Driven Design (DDD)

### Strategic DDD

- **Bounded Context**: Boundary where a domain model is consistent ("Order" differs in Sales vs Shipping)
- **Ubiquitous Language**: Shared vocabulary within a bounded context
- **Context Map**: Visual map of relationships between contexts
- **Anti-Corruption Layer**: Translation layer between contexts with different models

### Tactical DDD Building Blocks

| Block | Purpose | Key Rule |
|:------|:--------|:---------|
| Entity | Object with identity over time | Has unique ID, mutable state |
| Value Object | Immutable, defined by attributes | No ID, compared by value |
| Aggregate | Cluster with root enforcing invariants | External access through root only |
| Repository | Interface for aggregate persistence | One per aggregate |
| Domain Service | Stateless logic spanning aggregates | When logic doesn't belong to one entity |
| Domain Event | Record of something that happened | Immutable, past tense (OrderPlaced) |
| Factory | Complex creation logic | Encapsulates invariant enforcement |

### Aggregate Design Rules

1. Protect invariants within aggregate boundaries
2. Reference other aggregates by ID only
3. One transaction per aggregate
4. Design small aggregates
5. Eventual consistency between aggregates via domain events

---

## 12-Factor App

Apply all 12 factors (codebase in VCS, explicit deps, config in env, backing services as resources, separate build/release/run, stateless processes, port binding, process-model concurrency, fast startup + graceful shutdown, dev/prod parity, logs as event streams, admin tasks as one-off processes). Reference the 12-Factor methodology for implementation details.

---

## Event-Driven Architecture — Pattern Selection

| Pattern | Use When | Consistency |
|:--------|:---------|:-----------|
| Request/Response | Synchronous, simple ops | Strong |
| Event Notification | Inform services something happened | Eventual |
| Event-Carried State Transfer | Share data without coupling | Eventual |
| Event Sourcing | Full audit trail, state reconstruction | Strong (per aggregate) |
| CQRS | Different read/write models needed | Eventual (between models) |

**Event design**: Events are immutable facts (past tense), carry sufficient data, have versioned schemas, ordered within aggregate.

---

## Design Principles

Apply SOLID principles: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion. Also DRY (but avoid premature abstraction), KISS, YAGNI.

---

## Module Structure (DDD-Aligned)

```
src/
├── domain/           # Core business logic (no framework imports)
│   ├── entities/     # value-objects/ events/ services/ repositories/ (ports)
├── application/      # Use cases: commands/ queries/ handlers/
├── infrastructure/   # Adapters: database/ messaging/ external-apis/ config/
└── interfaces/       # Entry points: http/ events/ cli/
```

---

## Architecture Decision Records (ADRs)

Write when choosing between approaches, technologies, patterns, or making trade-offs.

Template: Status (Proposed/Accepted/Deprecated/Superseded) → Date → Context → Decision → Consequences → Alternatives Considered.
