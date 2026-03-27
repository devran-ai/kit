# Contributor Guide — End-to-End Project Lifecycle

> **Audience**: Developers adopting Devran AI Kit for their projects  
> **Goal**: Transform any project into an AI-driven engineering platform  
> **Time to Onboard**: ~5 minutes

---

## Table of Contents

- [1. Project Onboarding](#1-project-onboarding)
- [2. Developer Identity Setup](#2-developer-identity-setup)
- [3. Sprint Planning](#3-sprint-planning)
- [4. Task Management](#4-task-management)
- [5. Working on Tasks](#5-working-on-tasks)
- [6. Code Review & Quality Gates](#6-code-review--quality-gates)
- [7. Sprint Completion](#7-sprint-completion)
- [End-to-End Example](#end-to-end-example-building-a-todo-api)

---

## 1. Project Onboarding

### Install Devran AI Kit

```bash
# Option A: Install globally
npm install -g @devran-ai/kit

# Option B: Use npx (no install)
npx @devran-ai/kit init
```

### Initialize Your Project

Navigate to your project root and run:

```bash
cd my-project
kit init
```

This creates the `.agent/` folder with:
- **23 AI agents** — specialized roles for every development task
- **37 commands** — slash commands for development workflows
- **35 skills** — domain expertise modules
- **22 workflows** — complete development lifecycles

### Verify Installation

```bash
kit status
```

You should see a dashboard showing all capabilities are loaded.

---

## 2. Developer Identity Setup

Before starting work, register your developer identity. This links your tasks, decisions, and audit trail to you.

### In Your AI Assistant (VS Code, Cursor, Windsurf)

Tell your AI assistant:

```
Set up my developer identity for this project.
My name is [Your Name] and my role is [lead/contributor/reviewer].
```

The AI will use the **Identity module** to create your profile at `.agent/engine/identity.json`. This enables:
- Task ownership tracking
- Decision audit trail
- Contribution attribution

---

## 3. Sprint Planning

### Create a Sprint

Tell your AI assistant:

```
Create Sprint 1 for our project.
Sprint goal: Build the core API with authentication and CRUD operations.
Duration: 2 weeks.
```

The AI uses the **Engineering Manager** module to:
1. Break down the goal into tasks
2. Estimate complexity
3. Auto-assign agents based on expertise and reputation scores

### Define Tasks Manually

You can also define tasks yourself:

```
Create the following tasks for Sprint 1:
1. Set up Express.js server with TypeScript — assign to Backend agent
2. Implement JWT authentication — assign to Security agent  
3. Create user CRUD endpoints — assign to Backend agent
4. Write API tests — assign to TDD Specialist agent
5. Set up CI/CD pipeline — assign to DevOps agent
```

### View Sprint Plan

```
Show me the sprint plan with task assignments and priorities.
```

The Engineering Manager considers:
- **Agent reputation scores** — agents with higher track records get priority
- **Task dependencies** — dependent tasks are ordered correctly
- **Workload balance** — no agent gets overloaded

---

## 4. Task Management

### Assign Tasks

```
# Assign a task to yourself
Assign task "Set up Express.js server" to me.

# Assign an entire sprint to yourself  
Assign all Sprint 1 tasks to me.

# Let the AI auto-assign based on expertise
Auto-assign all Sprint 1 tasks based on agent expertise.
```

### Check Task Status

```
Show me the status of all Sprint 1 tasks.
```

### Task Lifecycle

Every task follows this lifecycle:

```
pending → in_progress → review → completed
                ↓
            blocked (if dependencies unmet)
```

### Lock a Task (Prevent Conflicts)

When you start working, the **Task Governance** module locks the task:

```
Start working on task "Implement JWT authentication".
```

This prevents other agents from modifying the same files simultaneously.

---

## 5. Working on Tasks

### The Trust-Grade Workflow

Every task follows the **Trust-Grade workflow**. This is the core of Devran AI Kit:

```
/explore → /plan → /work → /review
```

### Step 1: Explore (`/explore`)

```
/explore the authentication requirements for our API.
What are the best practices for JWT in Node.js?
```

The AI researches the topic using loaded skills (API patterns, security practices, clean code) and provides recommendations.

### Step 2: Plan (`/plan`)

```
/plan the JWT authentication implementation.
Include middleware, token generation, and refresh token strategy.
```

The AI creates a detailed implementation plan as a markdown artifact. Review it before proceeding.

### Step 3: Implement (`/work` or `/create`)

```
/create the JWT authentication module based on our plan.
```

The AI implements the code following the approved plan. It uses:
- **Workflow Engine** — ensures proper state transitions
- **Skill Sandbox** — loads only relevant skills with permission enforcement
- **Conflict Detector** — prevents file ownership conflicts

### Step 4: Review (`/review`)

```
/review the authentication implementation.
Run the full quality gate pipeline.
```

This triggers:
1. Lint check
2. Type check  
3. Unit tests
4. Security scan
5. Build verification

### Using Specialized Commands

| Command | Use Case |
|:---|:---|
| `/debug` | Systematic debugging when something breaks |
| `/test` | Write tests for your implementation |
| `/enhance` | Improve existing code |
| `/deploy` | Deploy with pre-flight checks |
| `/project_status` | Check project and sprint status |
| `/security-scan` | Run security analysis |
| `/retrospective` | Sprint review and audit |

---

## 6. Code Review & Quality Gates

### Run a Full Review

```
/review my changes before I push.
```

The review pipeline runs:

| Gate | What It Checks |
|:---|:---|
| **Lint** | Code style and formatting |
| **Type Check** | Type safety violations |
| **Tests** | All unit and integration tests pass |
| **Security** | No secrets, no injection patterns |
| **Build** | Production build succeeds |

### Self-Healing for CI Failures

If your CI pipeline fails, use the **Self-Healing** module:

```bash
kit heal --file ci-output.log
```

The module:
1. Detects failure patterns (lint, type, test, build)
2. Diagnoses root causes
3. Generates JSON patches to fix issues

---

## 7. Sprint Completion

### Close Completed Tasks

```
Mark task "Implement JWT authentication" as completed.
```

### Run Sprint Retrospective

```
/retrospective for Sprint 1.
Run full quality gates, security scan, and architecture review.
```

This generates:
- Quality gate results
- Code coverage summary
- Security scan findings
- Architecture assessment
- Recommendations for next sprint

### Update Tracking Documents

```
Update the ROADMAP and CHANGELOG for Sprint 1 completion.
Commit all tracking files.
```

### Start Next Sprint

```
Create Sprint 2 based on the retrospective findings. 
Include any carry-over tasks from Sprint 1.
```

---

## End-to-End Example: Building a Todo API

Here's a complete walkthrough of using Devran AI Kit to build a Todo API from scratch.

### 1. Onboard the Project

```bash
mkdir todo-api && cd todo-api
npm init -y
kit init
```

### 2. Set Up Identity & Sprint

```
Set up my developer identity. I'm Alex, role: lead.

Create Sprint 1 with goal: "Build a production-ready Todo REST API 
with Express, TypeScript, and SQLite."

Tasks:
1. Project scaffolding with TypeScript + Express
2. Database schema and SQLite setup
3. Todo CRUD endpoints (GET, POST, PUT, DELETE)
4. Input validation with Zod
5. Error handling middleware
6. Unit tests for all endpoints
7. API documentation
```

### 3. Work Through Tasks

```
# Start with scaffolding
/plan the TypeScript + Express project structure.
# Review the plan, then:
/create the project scaffolding based on our plan.

# Move to database
/plan the SQLite database schema for todos.
/create the database layer.

# Build endpoints
/create the Todo CRUD endpoints following RESTful patterns.

# Add validation
/enhance the endpoints with Zod input validation.

# Write tests
/test all Todo endpoints with edge cases.
```

### 4. Review & Ship

```
# Full quality review
/review all implementations. Run quality gates.

# Check security
/security-scan the entire codebase.

# Sprint retrospective
/retrospective for Sprint 1.

# Commit everything
Commit all changes with proper conventional commit messages.
```

### 5. Verify CLI Dashboard

```bash
kit status     # Project health
kit verify     # Manifest integrity
kit scan       # Security scan
```

---

## Tips for Maximum Efficiency

### ⚡ Workflow Tips

| Tip | How |
|:---|:---|
| **Always plan before coding** | Use `/plan` to create a reviewed blueprint before `/create` |
| **Use specialized agents** | Ask for "the Security agent" or "the Database Architect" by name |
| **Run quality gates often** | Use `/review` after every logical chunk of work |
| **Track decisions** | The Decision Timeline records every architectural choice |
| **Use the marketplace** | `kit market search <keyword>` to find community plugins |

### 🤖 Agent Selection

The AI automatically selects the best agent for your task, but you can request specific ones:

```
Ask the Database Architect to design our schema.
Ask the Security Specialist to audit our auth flow.
Ask the Performance Expert to optimize our query.
```

### 📊 Reputation System

Agent performance is tracked automatically:
- **Success rate** — task completion percentage
- **Consistency** — streak of successful outcomes
- **Cycle time** — average time to complete tasks

High-reputation agents are preferred for critical tasks.

### 🔄 Session Management

Your session state persists between conversations:
- Tasks in progress
- Active sprint context
- Decision history
- Error budget metrics

Start each session with `/project_status` to see where you left off.

---

## Architecture for Teams

For larger teams, Devran AI Kit supports:

| Feature | How It Works |
|:---|:---|
| **Identity System** | Each developer has a unique identity with role-based access |
| **Task Governance** | Locking prevents concurrent modifications to the same areas |
| **Conflict Detection** | Alerts when multiple agents work on the same files |
| **Audit Trail** | Every task assignment, decision, and outcome is logged |
| **Plugin System** | Teams can create and share custom skills and agents |

---

## Quick Reference

```bash
# CLI Commands
kit init              # Install .agent folder
kit status            # Project dashboard
kit verify            # Manifest integrity check
kit scan              # Security scan
kit update            # Update to latest version
kit plugin list       # List installed plugins
kit market search <q> # Search marketplace
kit heal              # Self-healing for CI failures

# Slash Commands (in AI assistant)
/plan                    # Create implementation plan
/create                  # Build new features
/enhance                 # Improve existing code
/debug                   # Systematic debugging
/test                    # Write tests
/review                  # Quality gate pipeline
/deploy                  # Production deployment
/project_status          # Sprint & project status
/retrospective           # Sprint audit & review
/security-scan           # Security analysis
```
