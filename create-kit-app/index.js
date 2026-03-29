#!/usr/bin/env node

/**
 * create-kit-app
 * 
 * Project scaffolder for Devran AI Kit.
 * Creates a new project with .agent/ pre-configured and starter templates.
 * 
 * Usage:
 *   npx create-kit-app my-project
 *   npx create-kit-app my-project --template nextjs
 *   npx create-kit-app my-project --template node-api
 *   npx create-kit-app . (initialize in current directory)
 * 
 * @version 1.0.0
 * @license MIT
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/** @type {Record<string, string>} */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

const VERSION = '1.0.0';

/**
 * @typedef {Object} Template
 * @property {string} name
 * @property {string} description
 * @property {string[]} dependencies
 * @property {string[]} devDependencies
 * @property {Record<string, string>} scripts
 * @property {Record<string, string>} files
 */

/** @type {Record<string, Template>} */
const TEMPLATES = {
  'minimal': {
    name: 'Minimal',
    description: 'Bare project with Devran AI Kit only',
    dependencies: [],
    devDependencies: [],
    scripts: {
      'start': 'echo "Add your start script"',
      'test': 'echo "Add your test framework"',
    },
    files: {},
  },
  'node-api': {
    name: 'Node.js API',
    description: 'Express API with TypeScript and Vitest',
    dependencies: ['express'],
    devDependencies: ['typescript', 'vitest', '@types/express', '@types/node', 'tsx'],
    scripts: {
      'dev': 'tsx watch src/index.ts',
      'build': 'tsc',
      'start': 'node dist/index.js',
      'test': 'vitest run',
      'test:watch': 'vitest watch',
      'lint': 'tsc --noEmit',
    },
    files: {
      'src/index.ts': `import express from 'express';

const app = express();
const PORT = process.env['PORT'] || 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`🚀 Server running on http://localhost:\${PORT}\`);
});

export default app;
`,
      'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
`,
      'vitest.config.ts': `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    reporters: ['verbose'],
  },
});
`,
      '.env.example': `PORT=3000
NODE_ENV=development
`,
    },
  },
  'nextjs': {
    name: 'Next.js',
    description: 'Next.js app with TypeScript (uses create-next-app)',
    dependencies: [],
    devDependencies: [],
    scripts: {},
    files: {},
  },
};

/**
 * Display usage information
 * @returns {void}
 */
function showUsage() {
  console.log(`
${colors.cyan}create-kit-app v${VERSION}${colors.reset}
${colors.dim}Create a new project with Devran AI Kit pre-configured${colors.reset}

${colors.yellow}Usage:${colors.reset}
  npx create-kit-app <project-name> [options]

${colors.yellow}Options:${colors.reset}
  --template <name>    Project template (default: minimal)
  --help               Show this help message
  --version            Show version

${colors.yellow}Templates:${colors.reset}`);

  for (const [key, template] of Object.entries(TEMPLATES)) {
    console.log(`  ${colors.green}${key.padEnd(15)}${colors.reset} ${template.description}`);
  }

  console.log(`
${colors.yellow}Examples:${colors.reset}
  npx create-kit-app my-app
  npx create-kit-app my-api --template node-api
  npx create-kit-app .
`);
}

/**
 * Create project directory and initialize
 * @param {string} projectDir
 * @param {string} templateName
 * @returns {void}
 */
function createProject(projectDir, templateName) {
  const template = TEMPLATES[templateName];
  if (!template) {
    console.error(`${colors.red}❌ Unknown template: ${templateName}${colors.reset}`);
    console.error(`   Available: ${Object.keys(TEMPLATES).join(', ')}`);
    process.exit(1);
  }

  const projectName = path.basename(path.resolve(projectDir));
  const isCurrentDir = projectDir === '.';

  console.log(`
${colors.cyan}🚀 Creating ${template.name} project: ${projectName}${colors.reset}
`);

  // Step 1: Handle Next.js template specially
  if (templateName === 'nextjs') {
    console.log(`${colors.yellow}[1/3]${colors.reset} Scaffolding Next.js app...`);
    try {
      const target = isCurrentDir ? '.' : projectDir;
      execSync(`npx -y create-next-app@latest ${target} --typescript --tailwind --eslint --app --src-dir --no-import-alias`, {
        stdio: 'inherit',
      });
    } catch {
      console.error(`${colors.red}❌ Failed to create Next.js app${colors.reset}`);
      process.exit(1);
    }
  } else {
    // Create directory
    if (!isCurrentDir) {
      if (fs.existsSync(projectDir)) {
        console.error(`${colors.red}❌ Directory already exists: ${projectDir}${colors.reset}`);
        process.exit(1);
      }
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // Step 1: Create package.json
    console.log(`${colors.yellow}[1/3]${colors.reset} Creating package.json...`);
    /** @type {object} */
    const packageJson = {
      name: projectName,
      version: '0.1.0',
      private: true,
      description: `${projectName} — powered by Devran AI Kit`,
      scripts: template.scripts,
      engines: {
        node: '>=18.0.0',
      },
    };
    fs.writeFileSync(
      path.join(projectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2) + '\n'
    );

    // Create template files
    for (const [filePath, content] of Object.entries(template.files)) {
      const fullPath = path.join(projectDir, filePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }

    // Create .gitignore
    fs.writeFileSync(path.join(projectDir, '.gitignore'), [
      'node_modules/',
      'dist/',
      '.env',
      '.env.local',
      '*.log',
      '.DS_Store',
      '',
      '# Devran AI Kit (local dev tooling)',
      '# Install: npx @devran-ai/kit init',
      '.agent/',
      '',
    ].join('\n'));
  }

  // Step 2: Install Devran AI Kit
  console.log(`${colors.yellow}[2/3]${colors.reset} Installing Devran AI Kit...`);
  try {
    execSync('npx -y @devran-ai/kit init', {
      cwd: path.resolve(projectDir),
      stdio: 'pipe',
    });
    console.log(`   ${colors.green}✓${colors.reset} .agent/ installed`);
  } catch (/** @type {any} */ error) {
    console.error(`${colors.red}❌ Failed to install Devran AI Kit${colors.reset}`);
    console.error(error.message);
    process.exit(1);
  }

  // Generate IDE configurations (Cursor, OpenCode, Codex)
  try {
    const ideGenerator = require('../lib/ide-generator');
    const resolvedProjectDir = path.resolve(projectDir);
    const agentDir = path.join(resolvedProjectDir, '.agent');
    const manifestPath = path.join(agentDir, 'manifest.json');
    const rulesPath = path.join(agentDir, 'rules.md');
    if (fs.existsSync(manifestPath) && fs.existsSync(rulesPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
      const configs = ideGenerator.generateAllIdeConfigs(manifest, rulesContent);
      const result = ideGenerator.writeIdeConfigs(resolvedProjectDir, configs, { skipExisting: true });
      if (result.written.length > 0) {
        console.log(`   ${colors.green}✓${colors.reset} IDE configs generated (${result.written.length} files)`);
      }
    }
  } catch (err) {
    console.error(`   ${colors.red}✗${colors.reset} IDE config generation failed: ${err.message}`);
    // Non-fatal — IDE configs are optional
  }

  // Step 3: Install dependencies
  if (template.dependencies.length > 0 || template.devDependencies.length > 0) {
    console.log(`${colors.yellow}[3/3]${colors.reset} Installing dependencies...`);
    try {
      if (template.dependencies.length > 0) {
        execSync(`npm install ${template.dependencies.join(' ')}`, {
          cwd: path.resolve(projectDir),
          stdio: 'pipe',
        });
      }
      if (template.devDependencies.length > 0) {
        execSync(`npm install -D ${template.devDependencies.join(' ')}`, {
          cwd: path.resolve(projectDir),
          stdio: 'pipe',
        });
      }
      console.log(`   ${colors.green}✓${colors.reset} Dependencies installed`);
    } catch {
      console.warn(`${colors.yellow}⚠️  Some dependencies failed to install. Run npm install manually.${colors.reset}`);
    }
  } else {
    console.log(`${colors.yellow}[3/3]${colors.reset} No additional dependencies needed`);
  }

  // Initialize git
  try {
    execSync('git init', { cwd: path.resolve(projectDir), stdio: 'pipe' });
    execSync('git config core.hooksPath .githooks 2>nul || true', { cwd: path.resolve(projectDir), stdio: 'pipe' });
  } catch {
    // Git init is optional
  }

  // Done!
  console.log(`
${colors.green}✅ Project created successfully!${colors.reset}

${colors.cyan}Next steps:${colors.reset}
  ${isCurrentDir ? '' : `cd ${projectDir}\n  `}${template.dependencies.length > 0 ? '' : 'npm install\n  '}Open in your AI-powered IDE
  Run ${colors.green}/project_status${colors.reset} to verify Devran AI Kit

${colors.cyan}Quick start:${colors.reset}
  ${colors.green}/greenfield${colors.reset}  Generate master documentation and configure your development environment
  ${colors.green}/plan${colors.reset}       Create implementation plan
  ${colors.green}/create${colors.reset}     Build a new feature
  ${colors.green}/test${colors.reset}       Write and run tests

${colors.dim}📚 https://github.com/devran-ai/kit${colors.reset}
`);
}

// --- Main ---

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  showUsage();
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  console.log(VERSION);
  process.exit(0);
}

const projectDir = args[0];
const templateIndex = args.indexOf('--template');
const templateName = templateIndex !== -1 && args[templateIndex + 1]
  ? args[templateIndex + 1]
  : 'minimal';

if (!projectDir || projectDir.startsWith('--')) {
  console.error(`${colors.red}❌ Please specify a project name${colors.reset}`);
  showUsage();
  process.exit(1);
}

createProject(projectDir, templateName);
