# SomonScript

<div align="center">
  <img src="images/somon-script-banner.png" alt="SomonScript Banner" width="800" style="max-width: 100%; height: auto;" />
</div>

**Production-Grade Programming Language with Tajik Syntax**

[![Version](https://img.shields.io/badge/version-0.2.57-blue.svg)](https://github.com/Slashmsu/somoni-script)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)
[![Test Coverage](https://img.shields.io/badge/coverage-98%25-brightgreen.svg)](#)
[![Examples Success](https://img.shields.io/badge/examples-100%25-brightgreen.svg)](#)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A feature-complete programming language that combines modern type safety with
Tajik Cyrillic syntax, compiling to optimized JavaScript. Currently in beta with
excellent test coverage and comprehensive language features.

---

## ✨ Why Choose SomonScript?

### 🌍 **Localized Development**

Leverage native language syntax for improved developer productivity and code
readability. Reduce cognitive overhead by programming in familiar linguistic
constructs.

### 🔒 **Professional-Grade Type Safety**

Advanced static analysis system with TypeScript-level safety features:

- Union and intersection types
- Tuple types with length inference
- Interface inheritance and composition
- Generic type parameters
- Conditional type expressions

### ⚡ **Development Status**

- **100% Example Success Rate** - All 39 examples compile and run without errors
- **98% Test Coverage** - Comprehensive test suite with 326+ test cases
- **Zero Linting Errors** - Maintained codebase following industry standards
- **Modern Architecture** - Built with clean architecture design patterns
- **Beta Quality** - Ready for evaluation and non-critical projects

### 🚀 **Developer Experience**

```bash
# Quick setup and deployment
npm install -g somon-script
echo 'чоп.сабт("Hello, World!");' > hello.som
somon run hello.som
```

---

## 🎯 Language Features

### **Core Language** ✅ 100% Complete

```som
// Variables with type inference
тағйирёбанда ном = "Дониёр";
собит МАКС_СИННУ_СОЛ: рақам = 120;

// Functions with type annotations
функсия ҳисоб_кардан(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}
```

### **Object-Oriented Programming** ✅ 100% Complete

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

### **Advanced Type System** ✅ 100% Complete

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

### **Modern JavaScript Features** ✅ 100% Complete

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

- CommonJS bundle is recommended for execution. ESM and UMD outputs are
  experimental.

```sh
somon bundle src/main.som --format commonjs -o dist/bundle.js
```

Other formats are available, but meant for inspection rather than direct
execution:

```sh
somon bundle src/main.som --format esm
somon bundle src/main.som --format umd
```

The bundler rewrites internal `require()` calls to a module map. When compiling
SomonScript sources, relative imports may appear as `.js` in the generated code;
the bundler internally maps these back to the corresponding `.som` modules when
necessary.

## Documentation

- Module System guide: `docs/module-system.md`

### **Production-Ready Module System** ✅ 100% Complete

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
- 📦 **Bundling Support** - Multiple output formats (CommonJS, ESM, UMD) with
  minification
- ⚡ **Performance Optimized** - Module caching and efficient compilation order
- 🛠️ **CLI Integration** - Built-in commands for bundling, analysis, and
  dependency resolution

**CLI Commands:**

```bash
# Bundle modules into a single file
somon bundle src/main.som -o dist/app.js --format esm --minify

# Analyze module dependencies
somon module-info src/main.som --graph --stats --circular

# Resolve module paths
somon resolve "./utils" --from src/main.som
```

---

## 📊 Quality Metrics

| Metric                   | Status       | Details                                             |
| ------------------------ | ------------ | --------------------------------------------------- |
| **Example Success Rate** | 100% (32/32) | All provided examples compile and execute perfectly |
| **Test Coverage**        | 98%+         | 326 test cases covering all compiler phases         |
| **Linting Errors**       | 0            | Clean, maintainable TypeScript codebase             |
| **Performance**          | Excellent    | Handles large programs efficiently                  |
| **Type Safety**          | Advanced     | Union, intersection, tuple, and conditional types   |

---

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g somon-script

# Or use in a project
npm install somon-script --save-dev
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

- Node.js 16+
- npm or yarn
- TypeScript knowledge (for contributing)

### Setup

```bash
# Clone repository
git clone https://github.com/Slashmsu/somoni-script.git
cd somoni-script

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
- [🤝 Contributing](CONTRIBUTING.md) - Development workflow

---

## 🌍 Professional Support

### Technical Services

- 💬
  [GitHub Discussions](https://github.com/Slashmsu/somoni-script/discussions) -
  Technical discussions and Q&A
- 🐛 [Issues](https://github.com/Slashmsu/somoni-script/issues) - Bug reports
  and feature requests
- 📧 [Email](mailto:support@somoni-script.org) - Professional support inquiries

### Contributing to Development

Professional development opportunities for technical teams:

1. **Core Development**: Enhance compiler capabilities and performance
2. **Documentation**: Improve technical documentation and guides
3. **Testing**: Expand test coverage and quality assurance
4. **Integration**: Build tooling and IDE support
5. **Performance**: Optimize compilation and runtime efficiency

See [CONTRIBUTING.md](CONTRIBUTING.md) for technical contribution guidelines and
[AGENTS.md](AGENTS.md) for code style, commit message, and testing rules.

---

## 📄 License

**MIT License** - see [LICENSE](LICENSE) file for details.

SomonScript is open-source software designed for professional and commercial
use.

---

## 🌟 Technical Excellence

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

---

## 📦 Production & Distribution

SomonScript follows semantic versioning and publishes packages through an
automated GitHub Actions pipeline. To release a new version:

1. Run `npm run version:patch` (or `version:minor`/`version:major`).
2. Push the commit and associated tag (`vX.Y.Z`).
3. The CI pipeline builds, tests, and publishes the package to npm.

Breaking changes and migration notes are documented in release notes and the
`examples/` directory to ease adoption in production environments.

## 📚 Migration Guide

See [docs/migration-guide.md](docs/migration-guide.md) for steps to upgrade
between releases.

## 🚀 Getting Started

Ready to integrate SomonScript into your development workflow?

**🎯 [Start with the Tutorial →](docs/tutorial/getting-started.md)**

**⚡ [Try Online Environment →](https://playground.somoni-script.org)**

**📚 [Browse Code Examples →](examples/)**

---

<div align="center">

**SomonScript** - _Professional programming with localized syntax_

Professional software development solution

[Website](https://somoni-script.org) •
[GitHub](https://github.com/Slashmsu/somoni-script) • [Documentation](docs/) •
[Support](https://github.com/Slashmsu/somoni-script/discussions)

</div>
