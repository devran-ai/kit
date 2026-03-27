---
name: workflow-standards
description: Shared standards for all workflows — referenced, not duplicated
---

# Workflow Standards

## Artifact Discipline
- NEVER create temporary files, artifacts, or intermediate documents during workflow execution
- All analysis, plans, and outputs go directly into the conversation or PR/commit
- If a workflow produces a document, it is the final deliverable, not an intermediate step

## Conventional Commits
PR titles and commit messages follow: `type(scope): description`
Types: feat, fix, refactor, docs, test, chore, perf, ci

## Branch Strategy Detection
1. Check for `dev` branch existence → GitFlow (feature→dev→main)
2. No dev branch → Trunk-based (feature→main)
3. Target branch follows detected strategy automatically

## Evidence Standard
Every finding, recommendation, or issue MUST include `file:line` reference. Findings without evidence are rejected.

## Governance Template
All workflows follow these universal rules:

- STOP on any failed critical step — do not skip or continue
- Run verification (tests, lint, type-check) after every code change
- Never commit secrets, credentials, or PII
- Follow the project's existing patterns and conventions
