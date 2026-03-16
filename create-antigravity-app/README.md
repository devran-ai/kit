# create-antigravity-app

> 🚀 Create a new project with [Antigravity AI Kit](https://github.com/besync-labs/antigravity-ai-kit) pre-configured.

## Quick Start

```bash
npx create-antigravity-app my-project
```

## Templates

| Template | Command | Description |
|:---------|:--------|:------------|
| **Minimal** | `npx create-antigravity-app my-app` | Bare project with .agent/ only |
| **Node.js API** | `npx create-antigravity-app my-api --template node-api` | Express + TypeScript + Vitest |
| **Next.js** | `npx create-antigravity-app my-app --template nextjs` | Next.js with TypeScript + Tailwind |

## What Gets Created

```
my-project/
├── .agent/              # 19 AI Agents, 31 Skills, 31 Commands, 15 Workflows
├── .githooks/           # Secret detection pre-commit hook
├── .gitignore           # Sensible defaults
├── package.json         # Project configuration
└── src/                 # Template-specific source files
```

## Options

```
--template <name>    Project template (minimal, node-api, nextjs)
--help               Show help
--version            Show version
```

## After Creation

Open your project in an AI-powered IDE and use these commands:

```
/plan       Create implementation plan
/create     Build a new feature  
/test       Write and run tests
/deploy     Deploy to production
```

## License

MIT — [Antigravity AI Kit](https://github.com/besync-labs/antigravity-ai-kit)
