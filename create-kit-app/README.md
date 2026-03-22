# create-kit-app

> Create a new project with [Devran AI Kit](https://github.com/devran-ai/kit) pre-configured.

## Quick Start

```bash
npx create-kit-app my-project
```

## Templates

| Template | Command | Description |
|:---------|:--------|:------------|
| **Minimal** | `npx create-kit-app my-app` | Bare project with .agent/ only |
| **Node.js API** | `npx create-kit-app my-api --template node-api` | Express + TypeScript + Vitest |
| **Next.js** | `npx create-kit-app my-app --template nextjs` | Next.js with TypeScript + Tailwind |

## What Gets Created

```
my-project/
├── .agent/              # 20 AI Agents, 34 Skills, 37 Commands, 21 Workflows
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

MIT — [Devran AI Kit](https://github.com/devran-ai/kit)
