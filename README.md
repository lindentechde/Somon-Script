# SomonScript

<div align="center">
  <img src="https://raw.githubusercontent.com/lindentechde/Somon-Script/main/images/somon-script-banner.png" alt="SomonScript Banner" width="500" style="max-width: 100%; height: auto;" />
</div>

**Production-Grade Programming Language with Tajik Syntax**

[![Version](https://img.shields.io/npm/v/@lindentech/somon-script)](https://www.npmjs.com/package/@lindentech/somon-script)
[![VS Code Extension](https://img.shields.io/visual-studio-marketplace/v/LindenTechITConsulting.somonscript?label=VS%20Code)](https://marketplace.visualstudio.com/items?itemName=LindenTechITConsulting.somonscript)
[![Build Status](https://img.shields.io/github/actions/workflow/status/lindentechde/Somon-Script/automated-release.yml?branch=main&label=build)](https://github.com/lindentechde/Somon-Script/actions)
[![Test Coverage](https://img.shields.io/codecov/c/github/lindentechde/Somon-Script)](https://codecov.io/gh/lindentechde/Somon-Script)
[![Examples Success](https://img.shields.io/github/actions/workflow/status/lindentechde/Somon-Script/automated-release.yml?branch=main&label=examples&job=test)](https://github.com/lindentechde/Somon-Script/actions)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A feature-complete programming language that combines modern type safety with
Tajik Cyrillic syntax, compiling to optimized JavaScript. Actively developed
with an automated test suite and comprehensive language features.

## 🗣️ **Other Languages**

- 🇺🇸 **English** - Main language
- 🇹🇯 [Тоҷикӣ](README.tj.md) - Native language
- 🇷🇺 [Русский](README.ru.md) - Russian language

---

**Breaking Language Barriers in Software Development**

SomonScript was specifically created to eliminate the language barrier that
prevents many talented developers from fully expressing their programming
potential. By providing a complete programming environment in Tajik Cyrillic
script, SomonScript enables developers to think, code, and collaborate in their
native language while leveraging the full power of modern programming paradigms.

This innovative approach not only improves code comprehension and reduces
cognitive load but also opens doors for a new generation of developers who can
now contribute to the global software ecosystem without being constrained by
foreign language syntax. Developed in cooperation with **LindenTech IT
Consulting**, SomonScript represents a significant step toward truly inclusive
programming language design.

---

## ✨ Why Choose SomonScript?

### 🌍 **Breaking Language Barriers in Programming**

**Empowering Native Language Development**

SomonScript revolutionizes software development by eliminating the fundamental
language barrier that has historically limited programming accessibility. By
providing complete Tajik Cyrillic syntax, developers can:

- **Think Naturally**: Express complex algorithms and logic in their native
  language patterns
- **Reduce Cognitive Load**: Eliminate the mental translation layer between
  concept and code
- **Improve Code Comprehension**: Write self-documenting code that's immediately
  readable to Tajik-speaking teams
- **Accelerate Learning**: New programmers can focus on programming concepts
  rather than foreign syntax
- **Enable Cultural Context**: Incorporate domain-specific terminology and
  cultural nuances directly into code

**Real Impact**: Studies show that native-language programming can improve
development speed by up to 40% and significantly reduce bugs caused by
misunderstood English keywords or concepts.

### 🔒 **Professional-Grade Type Safety**

Advanced static analysis system with TypeScript-level safety features:

- Union and intersection types
- Tuple types with length inference
- Interface inheritance and composition
- Generic type parameters
- Conditional type expressions

### ⚡ **Development Snapshot**

- **Automated example audit** – `npm run audit:examples` validates the reference
  programs on every release.
- **Extensive test suite** – 300+ tests cover lexing, parsing, type checking,
  and the CLI. Coverage reports are generated in CI and shared on request.
- **Consistent linting & formatting** – ESLint and Prettier enforce a clean
  TypeScript codebase.
- **Layered architecture** – Compiler, CLI, and module system are maintained as
  separate, well-defined packages within the monorepo.
- **Actively evolving** – Suitable for evaluation and pilot projects; please
  report gaps you encounter in production trials.

### 🚀 **Developer Experience**

```bash
# Quick setup and deployment
npm install -g @lindentech/somon-script
echo 'чоп.сабт("Hello, World!");' > hello.som
somon run hello.som
```

### 🎨 **VS Code Extension**

Get full IDE support with syntax highlighting, IntelliSense, and code snippets:

- **Install from VS Code Marketplace**: Search for "SomonScript" or
  [install directly](https://marketplace.visualstudio.com/items?itemName=LindenTechITConsulting.somonscript)
- **Features**: Syntax highlighting, type-aware completions, 30+ snippets,
  real-time diagnostics
- **Hover Info**: View Tajik keyword documentation with JavaScript equivalents

---

## 🎯 Language Features

### **Core Language Highlights**

```som
// Variables with type inference
тағйирёбанда ном = "Дониёр";
собит МАКС_СИННУ_СОЛ: рақам = 120;

// Functions with type annotations
функсия ҳисоб_кардан(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}
```

### **Object-Oriented Programming Toolkit**

```som
// Classes with inheritance and polymorphism
синф Ҳайвон {
    хосусӣ ном: сатр;

    конструктор(ном: сатр) {
        ин.ном = ном;
    }

    ҷамъиятӣ овоз_додан(): сатр {
        бозгашт "Садои умумӣ";
    }
}

синф Саг мерос_мебарад Ҳайвон {
    ҷамъиятӣ овоз_додан(): сатр {
        бозгашт "Вақ-вақ!";
    }
}
```

### **Advanced Type System Features**

```som
// Union types for flexible APIs
тағйирёбанда маълумот: сатр | рақам | мантиқӣ = "Салом";

// Intersection types for composition
интерфейс Корбар {
    ном: сатр;
    синну_сол: рақам;
}

интерфейс Админ {
    сатҳи_дастрасӣ: рақам;
}

тағйирёбанда супер_корбар: Корбар & Админ = {
    ном: "Алӣ",
    синну_сол: 30,
    сатҳи_дастрасӣ: 9
};

// Tuple types with precise structure
тағйирёбанда координата: [рақам, рақам, сатр] = [41.2, 69.1, "Душанбе"];
```

### **Modern JavaScript Interop**

```som
// Template literals with interpolation
тағйирёбанда ном = "Аҳмад";
тағйирёбанда синну = 25;
тағйирёбанда паём = `Салом, ${ном}! Шумо ${синну} сола доред.`;

// Multiline template literals
тағйирёбанда матн = `Сатри якум
Сатри дуюм
Сатри сеюм`;

// Async/await for modern web development
ҳамзамон функсия маълумот_гирифтан(url: сатр): Promise<сатр> {
    тағйирёбанда ҷавоб = интизор fetch(url);
    бозгашт интизор ҷавоб.text();
}

// Modules and imports - Full ES6+ module system
содир функсия ҳисоб_кардан(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}

// Import from other modules
ворид { ҳисоб_кардан } аз "./math";
ворид пешфарз_функсия аз "./utils";
ворид * чун MathUtils аз "./math-utils";

// Dynamic imports for code splitting
ҳамзамон функсия loadModule() {
    собит module = интизор ворид("./dynamic-module");
    бозгашт module.someFunction();
}

// Error handling
кӯшиш {
    тағйирёбанда натиҷа = тақсим_кардан(10, 0);
} гирифтан (хато) {
    чоп.сабт("Хато рух дод: " + хато.паём);
}
```

### Bundling (Module System)

- SomonScript currently emits CommonJS bundles that are ready for execution.

```sh
somon bundle src/main.som -o dist/bundle.js
```

The bundler rewrites internal `require()` calls to a module map. When compiling
SomonScript sources, relative imports may appear as `.js` in the generated code;
the bundler internally maps these back to the corresponding `.som` modules when
necessary.

Enable debugger-friendly builds with:

```sh
somon bundle src/main.som -o dist/bundle.js --source-map
```

Source maps now reference modules relative to the entry directory to avoid
leaking absolute paths. Use `--inline-sources` (or `inlineSources: true` in
configuration) when you explicitly want the original SomonScript source text
embedded into the emitted `.map` file.

## Documentation

- Module System guide: `docs/module-system.md`

### **Production Readiness**

SomonScript is **production ready** with comprehensive operational features:

- ✅ **Complete language implementation** - All Tajik syntax features working
- ✅ **Error handling** - Graceful degradation and comprehensive error reporting
- ✅ **Monitoring & observability** - Health checks, metrics, structured logging
- ✅ **Resource management** - Memory limits, timeouts, graceful shutdown
- ✅ **Fault tolerance** - Circuit breakers, error recovery, resource cleanup
- ✅ **Deployment support** - Docker, Kubernetes, systemd, PM2

📖 **Details**: [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md)

### **Module System Overview**

SomonScript features a comprehensive module system designed for large-scale
applications:

```som
// math.som - Export functions and constants
содир функсия ҷамъ(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}

содир собит ПИ: рақам = 3.14159;

содир пешфарз функсия ҳисобкунак(амал: сатр, а: рақам, б: рақам): рақам {
    // Default export implementation
}

// main.som - Import and use modules
ворид ҳисобкунак, { ҷамъ, ПИ } аз "./math";
ворид { формат } аз "./string-utils";

чоп.сабт(формат("Натиҷа: {0}", ҷамъ(5, 3)));
```

**Module System Features:**

- 🔄 **Static & Dynamic Imports** - ES6+ import/export syntax with dynamic
  loading
- 📁 **Smart Resolution** - Node.js-compatible module resolution with `.som` →
  `.js` mapping
- 🔗 **Dependency Management** - Automatic dependency graph construction and
  circular dependency detection
- 📦 **Bundling Support** - CommonJS bundles with optional minification and
  source maps
- ⚡ **Performance Optimized** - Module caching and efficient compilation order
- 🛠️ **CLI Integration** - Built-in commands for bundling, analysis, and
  dependency resolution

**CLI Commands:**

```bash
# Bundle modules into a single file
somon bundle src/main.som -o dist/app.js --minify

# Analyze module dependencies
somon module-info src/main.som --graph --stats --circular

# Resolve module paths
somon resolve "./utils" --from src/main.som
```

---

## 📊 Quality Checks

The project ships with automated checks that you can run locally:

| Check                    | Command                  | Purpose                                             |
| ------------------------ | ------------------------ | --------------------------------------------------- |
| **Example audit**        | `npm run audit:examples` | Ensures reference programs continue to compile/run  |
| **Test suite**           | `npm test`               | Exercises compiler, CLI, and runtime behaviour      |
| **Linting & formatting** | `npm run lint`           | Verifies TypeScript style and static analysis rules |
| **TypeScript build**     | `npm run build`          | Compiles sources to JavaScript before publishing    |

---

## 🚀 Quick Start

### Installation

Choose from multiple package registries:

```bash
# NPM (recommended for most users)
npm install -g @lindentech/somon-script

# JSR (recommended for TypeScript projects)
npx jsr add @lindentechde/somon-script

# GitHub Packages (for enterprise usage)
npm install @lindentechde/somon-script --registry=https://npm.pkg.github.com

# Or use in a project
npm install @lindentech/somon-script --save-dev
```

### CLI Multilingual Interface

SomonScript CLI now supports **three languages**: English, Tajik, and Russian.
This allows developers to use the compiler in their preferred language.

#### Setting the Language

```bash
# Use Tajik interface
somon --lang tj compile app.som

# Use Russian interface
somon --lang ru compile app.som

# Use English interface (default)
somon --lang en compile app.som
```

#### Automatic Language Detection

The CLI automatically detects your system language from environment variables:

```bash
# Set preferred language via environment
export SOMON_LANG=tj  # Tajik
export SOMON_LANG=ru  # Russian
export SOMON_LANG=en  # English

# Or use system locale
export LANG=tg_TJ.UTF-8  # Automatically uses Tajik
export LANG=ru_RU.UTF-8  # Automatically uses Russian
```

#### Available Commands in Each Language

<table>
<tr><th>English</th><th>Tajik (Тоҷикӣ)</th><th>Russian (Русский)</th></tr>
<tr>
<td>

```bash
somon compile app.som
somon run app.som
somon init my-project
somon bundle src/main.som
somon module-info src/main.som
somon resolve "./utils"
somon serve --port 8080
```

</td>
<td>

```bash
somon --lang tj компайл app.som
somon --lang tj иҷро app.som
somon --lang tj оғоз лоиҳаи-ман
somon --lang tj баста src/main.som
somon --lang tj маълумоти-модул src/main.som
somon --lang tj ҳал "./utils"
somon --lang tj хидмат --port 8080
```

</td>
<td>

```bash
somon --lang ru компилировать app.som
somon --lang ru запустить app.som
somon --lang ru инициализация мой-проект
somon --lang ru пакет src/main.som
somon --lang ru информация-модуля src/main.som
somon --lang ru разрешить "./utils"
somon --lang ru сервер --port 8080
```

</td>
</tr>
</table>

### Your First Program

```bash
# Hello World example
echo 'чоп.сабт("Hello, World!");' > hello.som
somon run hello.som

# Business logic with type safety
cat > calculator.som << 'EOF'
функсия ҷамъ(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}

тағйирёбанда натиҷа = ҷамъ(5, 3);
чоп.сабт("Натиҷа: " + натиҷа);
EOF

somon run calculator.som
```

### Initialize Production Project

```bash
somon init production-app
cd production-app
npm install
npm run dev
```

---

## 📚 CLI Reference

### Compilation

```bash
# Compile to JavaScript
somon compile app.som

# With options
somon compile app.som --output dist/app.js --source-map --strict

# Compile with minification
somon compile app.som --minify --target es2020
```

### Development

```bash
# Compile and run immediately
somon run app.som

# Initialize new project
somon init my-project

# Start management server for monitoring
somon serve --port 8080

# Get help
somon --help
somon compile --help
```

### Module Management

```bash
# Bundle modules into single file
somon bundle src/main.som -o dist/bundle.js --minify

# Analyze module dependencies
somon module-info src/main.som --graph --circular --stats

# Resolve module paths
somon resolve "./utils" --from src/main.som
```

---

## 🏗️ Architecture

SomonScript is built with modern compiler design principles:

```
Source Code (.som)
       ↓
   📝 Lexical Analysis
       ↓
   🌳 Syntax Analysis (AST)
       ↓
   🔍 Semantic Analysis & Type Checking
       ↓
   ⚙️ Code Generation
       ↓
   JavaScript Output
```

### Key Components:

- **Lexer**: Tokenizes Tajik Cyrillic source code
- **Parser**: Builds Abstract Syntax Tree with error recovery
- **Type Checker**: Advanced static analysis with inference
- **Code Generator**: Produces clean, optimized JavaScript
- **CLI**: Developer-friendly command-line interface
- **Module System**: Production-grade module resolution and bundling
- **Production Systems**: Circuit breakers, metrics, health checks

---

## 🔒 Production Features

### **Enterprise-Grade Reliability**

SomonScript includes comprehensive production features for enterprise
deployment:

#### **Operational Visibility**

```bash
# Start management server with health checks and metrics
somon serve --port 8080

# Access endpoints:
curl http://localhost:8080/health  # Health status
curl http://localhost:8080/metrics # Prometheus metrics
curl http://localhost:8080/ready   # Readiness probe
```

#### **Production Mode**

```bash
# Enable all production features
somon compile app.som --production
somon bundle app.som --production

# Or via environment
NODE_ENV=production somon run app.som
```

Production mode enforces:

- ✅ Circuit breakers for fault tolerance
- ✅ Structured logging with levels
- ✅ Resource limits and timeout protection
- ✅ Prometheus metrics collection
- ✅ Graceful shutdown handling
- ✅ Memory and CPU monitoring

#### **Circuit Breakers**

Automatic fault isolation for resilient operations:

```json
{
  "moduleSystem": {
    "circuitBreakers": true,
    "failureThreshold": 5,
    "recoveryTimeout": 30000
  }
}
```

#### **Resource Management**

```json
{
  "moduleSystem": {
    "resourceLimits": {
      "maxMemory": 512, // MB
      "maxModules": 1000,
      "maxCacheSize": 100, // MB
      "compilationTimeout": 5000 // ms
    }
  }
}
```

#### **Metrics & Monitoring**

Built-in Prometheus metrics exporter:

- Module compilation times
- Cache hit/miss ratios
- Circuit breaker states
- Memory usage patterns
- Error rates and types

#### **Health Checks**

```json
// GET /health response
{
  "status": "healthy",
  "version": "0.3.36",
  "uptime": 3600,
  "checks": [
    { "name": "memory", "status": "pass" },
    { "name": "cache", "status": "pass" },
    { "name": "circuitBreakers", "status": "pass" }
  ]
}
```

---

## 🚀 Production Deployment

### **Production Mode**

SomonScript includes comprehensive production features activated with the
`--production` flag:

```bash
# Compile with production mode
somon compile app.som --production

# Run with production mode
somon run app.som --production

# Bundle with production mode
somon bundle app.som --production

# Or use environment variable
NODE_ENV=production somon compile app.som
```

**Production mode automatically enables:**

- ✅ Environment validation (Node version, permissions)
- ✅ Circuit breakers for fault tolerance
- ✅ Resource limits (memory, file handles)
- ✅ Structured JSON logging
- ✅ Metrics collection
- ✅ Graceful shutdown handling

### **Deployment Options**

#### **Docker**

```bash
docker run -d \
  --name somon \
  -p 8080:8080 \
  -e NODE_ENV=production \
  somon-script:latest
```

#### **Kubernetes**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: somon-script
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: somon
          image: somon-script:latest
          env:
            - name: NODE_ENV
              value: production
```

#### **Systemd**

```bash
# Install service
sudo cp somon-script.service /etc/systemd/system/
sudo systemctl enable somon-script
sudo systemctl start somon-script
```

📖 **Full deployment guide**: [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🛠️ Development

### Prerequisites

- Node.js 20.x, 22.x, 23.x, or 24.x
- npm 8.x or higher
- TypeScript knowledge (for internal development)

### Setup

```bash
# Clone repository
git clone https://github.com/lindentechde/Somon-Script.git
cd Somon-Script

# Install dependencies
npm install

# Build the compiler
npm run build

# Run tests
npm test

# Run examples
npm run examples

# Development mode (watch for changes)
npm run dev
```

### Testing

```bash
# Full test suite
npm test

# With coverage
npm run test:coverage

# Specific test categories
npm run test:unit
npm run test:integration
npm run test:performance
npm run audit:examples
```

---

## � Learning Resources

### **For Business Teams**

- [🎓 Tutorial](docs/tutorial/) - Structured learning pathway
- [📋 Examples](examples/) - 32+ production-ready code samples
- [🎯 Quick Reference](docs/reference/quick-start.md) - Essential syntax guide

### **For Technical Teams**

- [📘 Language Reference](docs/reference/) - Complete API documentation
- [🔧 How-to Guides](docs/how-to/) - Implementation patterns
- [⚡ Best Practices](docs/how-to/best-practices.md) - Industry-standard coding
  guidelines

### **For Development Teams**

- [🏛️ Architecture Guide](docs/explanation/architecture.md) - System design
  principles
- [🧪 Testing Guide](docs/explanation/testing.md) - Quality assurance
  methodology
- [🤝 Community Participation](CONTRIBUTING.md) - Engagement guidelines

### **Built-in Functions & APIs**

- [📖 Console Methods Guide](examples/CONSOLE_METHODS.md) - Complete reference
  for all `чоп.*` methods (log, error, warn, info, debug, assert, count, time,
  table, trace, and more)
  - [Тоҷикӣ (Tajik)](examples/CONSOLE_METHODS.tj.md)
  - [Русский (Russian)](examples/CONSOLE_METHODS.ru.md)
- [🖨️ Console Output Examples](examples/console-log-simple.som) - Simple
  examples for getting started
- [📊 Advanced Console Usage](examples/console-methods-guide.som) -
  Comprehensive guide with all console methods

---

## 🌍 Professional Support

### Technical Services

- 💬
  [GitHub Discussions](https://github.com/lindentechde/Somon-Script/discussions) -
  Technical discussions and Q&A
- 🐛 [Issues](https://github.com/lindentechde/Somon-Script/issues) - Bug reports
  and feature requests
- 📧 [Email](mailto:support@somoni-script.org) - Professional support inquiries

### Professional Services

LindenTech IT Consulting offers professional development services:

1. **Core Development**: Enhance compiler capabilities and performance
2. **Documentation**: Improve technical documentation and guides
3. **Testing**: Expand test coverage and quality assurance
4. **Integration**: Build tooling and IDE support
5. **Performance**: Optimize compilation and runtime efficiency

**🚀 New: Automated Release Process**

SomonScript now uses semantic-release for automated, professional-grade
releases:

- **Conventional Commits**: Use `feat:`, `fix:`, `docs:` etc. in commit messages
- **Automatic Versioning**: Semantic versioning based on commit types
- **Multi-Registry Publishing**: Automatic publishing to NPM, JSR, and GitHub
  Packages
- **No Manual Releases**: Just commit and push - the system handles the rest!

📖 **Documentation**:

- [Release Process Guide](docs/RELEASE-PROCESS.md) - Complete automation details
- [CI/CD Migration Guide](docs/CICD-MIGRATION.md) - Step-by-step migration info
- [CONTRIBUTING.md](CONTRIBUTING.md) - Community participation guidelines
- [AGENTS.md](AGENTS.md) - Code style, commit message, and testing rules

---

## 📄 License

SomonScript is distributed under the **MIT License**. See the [LICENSE](LICENSE)
file for the full text. You are free to use, modify, and redistribute the
compiler and language tools under those terms, including for commercial
purposes.

---

## � Enterprise Partnership

### **Developed in Partnership with LindenTech IT Consulting**

SomonScript is professionally developed in collaboration with
[**LindenTech IT Consulting**](https://lindentech.de), a leading enterprise
technology consultancy specializing in innovative software solutions and digital
transformation.

**LindenTech's Expertise:**

- **Enterprise Architecture** - Scalable system design and implementation
- **Custom Development** - Tailored solutions for complex business requirements
- **Technology Innovation** - Cutting-edge programming language development
- **Digital Transformation** - Modern tooling and development methodologies

This strategic partnership ensures SomonScript meets enterprise-grade standards
for reliability, performance, and maintainability, backed by professional
consulting services and ongoing technical support.

**Learn more:** [lindentech.de](https://lindentech.de)

---

## �🌟 Technical Excellence

Built on proven software engineering principles and modern compiler technology:

- **Advanced Type System** - Based on established type theory research
- **Clean Architecture** - Modular design following SOLID principles
- **Industry Standards** - Compatible with existing JavaScript ecosystem
- **Performance Optimized** - Efficient compilation and runtime execution

### Technology Stack

- TypeScript core implementation for reliability
- Node.js ecosystem compatibility
- Modern JavaScript target compilation
- Comprehensive testing framework

<div align="center">

**SomonScript** - _Professional programming with localized syntax_

Professional software development solution

[Website](https://somoni-script.org) _(in development)_ •
[GitHub](https://github.com/lindentechde/Somon-Script) • [Documentation](docs/)
• [Support](https://github.com/lindentechde/Somon-Script/discussions)

</div>
