# SomonScript

<div align="center">
  <img src="https://raw.githubusercontent.com/lindentechde/Somon-Script/main/images/somon-script-banner.png" alt="SomonScript Banner" width="500" style="max-width: 100%; height: auto;" />
</div>

**Production-Grade Programming Language with Tajik Syntax**

[![Version](https://img.shields.io/npm/v/@lindentech/somon-script)](https://www.npmjs.com/package/@lindentech/somon-script)
[![Build Status](https://img.shields.io/github/actions/workflow/status/lindentechde/Somon-Script/version-release.yml?branch=main&label=build)](https://github.com/lindentechde/Somon-Script/actions)
[![Test Coverage](https://img.shields.io/codecov/c/github/lindentechde/Somon-Script)](https://codecov.io/gh/lindentechde/Somon-Script)
[![Examples Success](https://img.shields.io/github/actions/workflow/status/lindentechde/Somon-Script/version-release.yml?branch=main&label=examples&job=test)](https://github.com/lindentechde/Somon-Script/actions)
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

## Documentation

- Module System guide: `docs/module-system.md`

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

# Get help
somon --help
somon compile --help
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

---

## 🛠️ Development

### Prerequisites

- Node.js 20.x or 22.x (LTS)
- npm or yarn
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
