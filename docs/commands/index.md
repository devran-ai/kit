# Commands

Slash commands provide quick execution of common operations. **37 commands** across 10 categories.

---

## Command Categories

### 📋 Planning & Management

| Command      | Purpose                    |
| :----------- | :------------------------- |
| `/plan`      | Create implementation plan |
| `/implement` | Execute plan with tracking |
| `/setup`     | Configure project context  |
| `/status`    | Current session status     |

### 🔨 Development

| Command     | Purpose                       |
| :---------- | :---------------------------- |
| `/build`    | Build new features            |
| `/tdd`      | Test-driven development       |
| `/fix`      | Fix linting/type/build errors |
| `/refactor` | Code refactoring              |
| `/cook`     | Full scratch-to-done workflow |

### ✅ Quality & Security

| Command          | Purpose                |
| :--------------- | :--------------------- |
| `/verify`        | Full verification loop |
| `/code-review`   | Quality review         |
| `/security-scan` | Security audit         |
| `/perf`          | Performance analysis   |

### 🗃️ Git & PRs

| Command        | Purpose                                       |
| :------------- | :-------------------------------------------- |
| `/git`         | Git operations                                |
| `/pr`          | Create production-grade pull requests         |
| `/pr-review`   | Review PR with senior engineering expertise   |
| `/pr-fix`      | Fix PR based on review comments               |
| `/pr-merge`    | Merge PR safely with dependency validation    |
| `/pr-split`    | Split oversized PRs into focused sub-PRs      |
| `/pr-status`   | Triage PRs with CI and merge readiness        |
| `/pr-describe` | Auto-generate PR title, summary, and labels   |
| `/changelog`   | Generate changelog                            |

### 🔍 Research & Discovery

| Command     | Purpose               |
| :---------- | :-------------------- |
| `/research` | Research technologies |
| `/scout`    | Explore codebase      |
| `/ask`      | Code questions        |

### 🗄️ Database

| Command | Purpose             |
| :------ | :------------------ |
| `/db`   | Database operations |

### 🔌 Integration & Deployment

| Command      | Purpose                  |
| :----------- | :----------------------- |
| `/integrate` | Third-party integrations |
| `/deploy`    | Deployment operations    |

### 🏛️ Architecture

| Command   | Purpose                |
| :-------- | :--------------------- |
| `/adr`    | Architecture decisions |
| `/design` | UI/UX design specs     |

### 💾 Session Management

| Command       | Purpose             |
| :------------ | :------------------ |
| `/checkpoint` | Save session state  |
| `/compact`    | Context compression |
| `/learn`      | Pattern extraction  |
| `/eval`       | Metrics evaluation  |

### ❓ Help & Utilities

| Command  | Purpose                |
| :------- | :--------------------- |
| `/help`  | **Comprehensive reference** — `/help commands`, `/help agents`, `/help workflows`, `/help skills`, `/help rules`, `/help checklists` |
| `/debug` | Systematic debugging   |
| `/doc`   | Generate documentation |

---

## Command Format

```
/command-name [arguments]
```

**Examples:**

```bash
/plan Add user authentication
/verify
/git commit "feat: add auth"
/deploy production
```
