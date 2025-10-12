# Contributing to SomonScript

Thanks for your interest in improving SomonScript! We welcome issues, pull
requests, documentation updates, and example contributions from the community.

## 🧾 License and Contributor Terms

SomonScript is released under the [MIT License](LICENSE). By submitting a
contribution, you agree that it will be licensed under the same terms. Please do
not include third-party code or assets unless they are also compatible with the
MIT License and you have permission to share them.

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x, 22.x, 23.x, or 24.x (see `package.json` engines field)
- npm 8.x or higher
- Git for version control
- Basic understanding of compilers and TypeScript

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-username/somon-script.git
cd somon-script

# Install dependencies
npm install

# Build the project
npm run build

# Run tests to verify setup
npm test
```

## 🏗️ Project Architecture

### Core Components

- **Lexer** (`src/lexer.ts`): Tokenizes Tajik Cyrillic keywords
- **Parser** (`src/parser.ts`): Builds Abstract Syntax Trees
- **Type Checker** (`src/type-checker.ts`): Static analysis with advanced type
  system
- **Code Generator** (`src/codegen.ts`): Emits JavaScript with source maps
- **Module System** (`src/module-system/`): Multi-file compilation and bundling

### Directory Structure

```
src/
├── compiler.ts          # Main compilation orchestrator
├── keyword-map.ts       # Tajik → JavaScript keyword mapping (90+ keywords)
├── lexer.ts            # Tokenization
├── parser.ts           # AST generation
├── type-checker.ts     # Static type analysis
├── codegen.ts          # JavaScript code generation
├── module-system/      # Module resolution and bundling
│   ├── module-resolver.ts
│   ├── module-loader.ts
│   ├── module-registry.ts
│   └── module-system.ts
├── cli/                # Command-line interface
│   └── program.ts
└── utils/              # Shared utilities
```

## 🛠️ How to Contribute

### 1. Fork and Branch

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/your-username/somon-script.git
cd somon-script
git remote add upstream https://github.com/original/somon-script.git

# Create a feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

Follow the coding standards:

- Match existing code style (Prettier configured)
- Add JSDoc comments for public APIs
- Avoid `any` types in production code (`src/`)
- Keep complexity below 15 (ESLint enforced)
- Update or add tests for new functionality

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm run test:coverage       # Coverage report

# Validate example programs
npm run audit:examples

# Check code quality
npm run lint                # ESLint checks
npm run lint:fix           # Auto-fix issues
npm run format             # Prettier formatting
npm run type-check         # TypeScript validation
```

### 4. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Feature
git commit -m "feat: add support for async/await keywords"

# Bug fix
git commit -m "fix: resolve module resolution in bundler"

# Documentation
git commit -m "docs: update installation guide"

# Performance
git commit -m "perf: optimize lexer tokenization"

# Refactoring
git commit -m "refactor: extract common parser utilities"

# Tests
git commit -m "test: add edge cases for type checker"

# Build/CI
git commit -m "ci: add Node.js 24 to test matrix"
```

### 5. Submit Pull Request

1. Push your branch: `git push origin feature/your-feature-name`
2. Open a pull request on GitHub
3. Provide clear description of changes and motivation
4. Link any related issues
5. Ensure all CI checks pass

## ✅ Project Standards

### Code Quality Requirements

- **Coverage Thresholds**:
  - Branches: 55%
  - Functions: 75%
  - Lines: 68%
- **Complexity Limit**: 15 (per function/method)
- **Type Safety**: No `any` types in production code
- **Performance**: Examples must compile in <1000ms

### Testing Guidelines

#### Unit Tests

Test individual components in isolation:

```typescript
// tests/lexer.test.ts
describe('Lexer', () => {
  it('should tokenize Tajik keywords', () => {
    const tokens = tokenize('тағйирёбанда x = 5');
    expect(tokens).toMatchSnapshot();
  });
});
```

#### Integration Tests

Test complete compilation pipeline:

```typescript
// tests/integration/compiler.test.ts
describe('Compiler Integration', () => {
  it('should compile Tajik program to JavaScript', () => {
    const result = compile('чоп.сабт("Салом!")');
    expect(result.code).toContain('console.log');
    expect(result.errors).toHaveLength(0);
  });
});
```

#### Custom Test Matchers

Use provided matchers in `tests/setup.ts`:

```typescript
expect(code).toCompileSuccessfully();
expect(code).toHaveTypeError('Type mismatch');
```

### Documentation Standards

- Add JSDoc for all public APIs
- Update relevant `.md` files when adding features
- Include code examples in documentation
- Keep CLAUDE.md updated for AI-assisted development

## 📚 Areas for Contribution

### High Priority

- 🐛 Bug fixes and error message improvements
- 📖 Documentation translations (Russian, Tajik, English)
- 🧪 Test coverage for edge cases
- ⚡ Performance optimizations

### Feature Ideas

- 🔧 Additional Tajik keyword mappings
- 🎯 Enhanced type system features
- 📦 ESM bundling support (currently CommonJS only)
- 🔍 Better error recovery in parser
- 🌐 Language server protocol implementation

### Documentation

- 📝 Tutorial improvements
- 🎓 Educational examples
- 🔄 Migration guides from other languages
- 📊 Performance benchmarks

## 🔧 Development Commands

### Building

```bash
npm run build          # TypeScript compilation
npm run dev           # Watch mode
npm run clean         # Remove build artifacts
```

### Testing

```bash
npm test              # Full test suite (326+ tests)
npm run test:unit     # Component tests
npm run test:integration # End-to-end tests
npm run test:coverage # Coverage report
npm run test:ci      # CI-optimized run
```

### Code Quality

```bash
npm run lint         # ESLint validation
npm run lint:fix     # Auto-fix issues
npm run format       # Prettier formatting
npm run type-check   # TypeScript checking
```

### CLI Development

```bash
# Test CLI commands locally
node dist/cli/program.js compile test.som
node dist/cli/program.js run test.som
node dist/cli/program.js bundle src/main.som -o dist/app.js
```

## 🐛 Debugging Tips

### VSCode Configuration

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug SomonScript",
  "program": "${workspaceFolder}/dist/cli/program.js",
  "args": ["compile", "test.som"],
  "console": "integratedTerminal",
  "skipFiles": ["<node_internals>/**"]
}
```

### Common Issues

1. **Build Errors**: Run `npm run clean && npm run build`
2. **Test Failures**: Check Node.js version compatibility
3. **Module Resolution**: Verify `.som` file extensions
4. **Type Errors**: Run `npm run type-check` for details

## 📣 Community Expectations

We strive to foster a respectful, inclusive environment:

- Treat all community members with empathy and patience
- Assume good intent during discussions
- Provide constructive feedback
- Welcome newcomers and help them get started
- Respect different perspectives and experiences

## 🎯 Pull Request Checklist

Before submitting:

- [ ] Tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Examples validate: `npm run audit:examples`
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow convention
- [ ] PR description explains changes
- [ ] Related issues are linked

## 📫 Questions or Support

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: General questions and ideas
- **Email**: info@lindentech.de for direct support
- **Contributing Guide**: This document for contribution guidelines

We appreciate your contributions and look forward to collaborating with you!
