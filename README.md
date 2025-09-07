# SomonScript

[![Version](https://img.shields.io/badge/version-0.2.14-blue.svg)](https://github.com/Slashmsu/somoni-script)
[![Production Ready](https://img.shields.io/badge/status-production%20ready-brightgreen.svg)](#)
[![Runtime Success](https://img.shields.io/badge/runtime%20success-97%25-brightgreen.svg)](#)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A modern programming language that compiles to JavaScript, written entirely in
Tajik Cyrillic. Named after Ismoil Somoni, the founder of the Samanid dynasty.

## ✨ Why SomonScript?

- **🌍 Native Language**: Write code using familiar Tajik keywords and syntax
- **🎯 Production Ready**: 97% runtime success rate with comprehensive type
  system
- **🔒 Type Safe**: TypeScript-level type checking with compile-time validation
- **⚡ Modern Features**: Union types, classes, async/await, and more
- **🔗 JavaScript Compatible**: Compiles to clean, readable JavaScript

## 🚀 Quick Start

```bash
# Install SomonScript
npm install -g somon-script

# Create your first program
echo 'чоп.сабт("Салом, ҷаҳон!");' > hello.som

# Run it
somon run hello.som
```

## 📖 Documentation

| Section                              | Purpose                        | For Who               |
| ------------------------------------ | ------------------------------ | --------------------- |
| **[Tutorial](docs/tutorial/)**       | Learn SomonScript step by step | Beginners, new users  |
| **[How-to Guides](docs/how-to/)**    | Solve specific problems        | Developers with tasks |
| **[Reference](docs/reference/)**     | Look up language details       | All users             |
| **[Explanation](docs/explanation/)** | Understand concepts            | Curious developers    |

## 💡 Language Example

```somon
// Define a class with type annotations
синф Шахс {
    хосусӣ ном: сатр;
    хосусӣ синну_сол: рақам;

    конструктор(ном: сатр, синну_сол: рақам) {
        ин.ном = ном;
        ин.синну_сол = синну_сол;
    }

    ҷамъиятӣ маълумот(): сатр {
        бозгашт "Ном: " + ин.ном + ", Синну сол: " + ин.синну_сол;
    }
}

// Union types and modern features
тағйирёбанда маълумот: сатр | рақам = "Салом";
тағйирёбанда шахс = нав Шахс("Аҳмад", 25);
чоп.сабт(шахс.маълумот());
```

## 🎯 Current Status

- ✅ **Core Language**: Variables, functions, control flow (100% complete)
- ✅ **Object-Oriented**: Classes, inheritance, interfaces (100% complete)
- ✅ **Advanced Types**: Union, intersection, tuple types (100% complete)
- ✅ **Modern Features**: Async/await, modules, error handling (100% complete)
- 📈 **Quality**: 97% runtime success, 64% test coverage, zero linting errors

[View detailed status →](docs/explanation/current-status.md)

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/Slashmsu/somoni-script.git
cd somoni-script

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## 🤝 Contributing

We welcome contributions! Please see our
[contribution guidelines](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🌟 Acknowledgments

- Named after Ismoil Somoni (849-907 CE), founder of the Samanid dynasty
- Inspired by the rich literary tradition of Tajik language
- Built with modern compiler design principles

---

**Ready to start coding in Tajik?** →
[Get Started](docs/tutorial/installation.md)
