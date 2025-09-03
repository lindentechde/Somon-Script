# Somoni-script

A programming language that compiles to JavaScript, written in Tajik Cyrillic. Named after Ismoil Somoni, the founder of the Samanid dynasty.

## Features

- **Tajik Cyrillic Syntax**: Write code using familiar Tajik keywords
- **JavaScript Compilation**: Compiles to clean, readable JavaScript
- **TypeScript-like Features**: Modern language constructs
- **CLI Tools**: Easy compilation and project management

## Installation

```bash
npm install -g somoni-script
```

## Quick Start

Create a new project:
```bash
somoni init my-project
cd my-project
npm install
```

Write your first Somoni-script program (`src/main.som`):
```somoni
функсия салом() {
    чоп.сабт("Салом, ҷаҳон!");
}

салом();
```

Run it:
```bash
npm run dev
```

Or compile to JavaScript:
```bash
npm run build
```

## Language Reference

### Keywords (Калимаҳои калидӣ)

#### Core Language Keywords
| Somoni-script | English | JavaScript |
|---------------|---------|------------|
| `тағйирёбанда` | variable | `let` |
| `собит` | constant | `const` |
| `функсия` | function | `function` |
| `агар` | if | `if` |
| `вагарна` | else | `else` |
| `барои` | for | `for` |
| `то` | while | `while` |
| `бозгашт` | return | `return` |
| `синф` | class | `class` |
| `нав` | new | `new` |
| `ин` | this | `this` |
| `дуруст` | true | `true` |
| `нодуруст` | false | `false` |
| `холӣ` | null | `null` |

#### Import/Export Keywords
| Somoni-script | English | JavaScript |
|---------------|---------|------------|
| `ворид` | import | `import` |
| `содир` | export | `export` |
| `аз` | from | `from` |
| `пешфарз` | default | `default` |
| `чун` | as | `as` |

#### Built-in Functions
| Somoni-script | English | JavaScript |
|---------------|---------|------------|
| `чоп` | console | `console` |
| `сабт` | log | `log` |
| `хато` | error | `error` |
| `огоҳӣ` | warn | `warn` |
| `маълумот` | info | `info` |

#### Array Methods
| Somoni-script | English | JavaScript |
|---------------|---------|------------|
| `рӯйхат` | array | `Array` |
| `илова` | push | `push` |
| `баровардан` | pop | `pop` |
| `дарозӣ` | length | `length` |
| `харита` | map | `map` |
| `филтр` | filter | `filter` |
| `кофтан` | find | `find` |

#### String Methods
| Somoni-script | English | JavaScript |
|---------------|---------|------------|
| `сатр` | string | `String` |
| `дарозии_сатр` | string length | `length` |
| `пайвастан` | concat | `concat` |
| `ҷойивазкунӣ` | replace | `replace` |
| `ҷудокунӣ` | split | `split` |

#### Control Flow
| Somoni-script | English | JavaScript |
|---------------|---------|------------|
| `шикастан` | break | `break` |
| `давом` | continue | `continue` |
| `кӯшиш` | try | `try` |
| `гирифтан` | catch | `catch` |
| `ниҳоят` | finally | `finally` |
| `партофтан` | throw | `throw` |

#### Async Programming
| Somoni-script | English | JavaScript |
|---------------|---------|------------|
| `ҳамзамон` | async | `async` |
| `интизор` | await | `await` |
| `ваъда` | promise | `Promise` |

### Variables (Тағйирёбандаҳо)

```somoni
// Mutable variable
тағйирёбанда ном = "Аҳмад";
ном = "Фотима";

// Constant
собит сол = 2024;
```

Compiles to:
```javascript
let ном = "Аҳмад";
ном = "Фотима";

const сол = 2024;
```

### Functions (Функсияҳо)

```somoni
функсия ҷамъ_кардан(а, б) {
    бозгашт а + б;
}

тағйирёбанда натиҷа = ҷамъ_кардан(5, 3);
чоп.сабт("Натиҷа:", натиҷа);
```

Compiles to:
```javascript
function ҷамъ_кардан(а, б) {
    return а + б;
}

let натиҷа = ҷамъ_кардан(5, 3);
console.log("Натиҷа:", натиҷа);
```

### Conditionals (Шартҳо)

```somoni
агар (синну_сол >= 18) {
    чоп.сабт("Калонсол");
} вагарна {
    чоп.сабт("Хурдсол");
}
```

Compiles to:
```javascript
if (синну_сол >= 18) {
    console.log("Калонсол");
} else {
    console.log("Хурдсол");
}
```

### Loops (Давраҳо)

```somoni
тағйирёбанда и = 0;
то (и < 10) {
    чоп.сабт(и);
    и = и + 1;
}
```

Compiles to:
```javascript
let и = 0;
while (и < 10) {
    console.log(и);
    и = и + 1;
}
```

### Data Types (Навъҳои додаҳо)

```somoni
// Numbers
тағйирёбанда рақам = 42;
тағйирёбанда касрӣ = 3.14;

// Strings
тағйирёбанда матн = "Салом";

// Booleans
тағйирёбанда дуруст_аст = дуруст;
тағйирёбанда нодуруст_аст = нодуруст;

// Null
тағйирёбанда холӣ_қимат = холӣ;
```

### Import/Export (Ворид/Содир)

```somoni
// Import named functions
ворид { ҷамъ_кардан, тақсим_кардан } аз "./math.som";

// Import with alias
ворид { ҷамъ_кардан чун ҷамъ } аз "./math.som";

// Import default
ворид пешфарз_функсия аз "./utils.som";

// Export function
содир функсия ҳисоб_кардан(а, б) {
    бозгашт а + б;
}

// Export default
содир пешфарз ҳисоб_кардан;
```

### Built-in Functions (Функсияҳои дарунсохт)

```somoni
// Console functions
чоп.сабт("Паём");           // console.log("Паём")
чоп.хато("Хато рӯй дод");    // console.error("Хато рӯй дод")
чоп.огоҳӣ("Огоҳӣ");         // console.warn("Огоҳӣ")

// Array methods
тағйирёбанда рӯйхат = [1, 2, 3];
рӯйхат.илова(4);            // рӯйхат.push(4)
тағйирёбанда охирин = рӯйхат.баровардан(); // рӯйхат.pop()

// String methods
тағйирёбанда матн = "Салом ҷаҳон";
тағйирёбанда дарозӣ = матн.дарозии_сатр;   // матн.length
тағйирёбанда калимаҳо = матн.ҷудокунӣ(" "); // матн.split(" ")
```

### Async Programming (Барномасозии ҳамзамон)

```somoni
ҳамзамон функсия маълумот_гирифтан() {
    кӯшиш {
        тағйирёбанда натиҷа = интизор fetch("/api/data");
        бозгашт натиҷа;
    } гирифтан (хато) {
        чоп.хато("Хато:", хато);
        партофтан хато;
    } ниҳоят {
        чоп.сабт("Амалиёт тамом шуд");
    }
}
```

### Operators (Операторҳо)

#### Arithmetic (Ҳисобӣ)
- `+` (ҷамъ)
- `-` (тарҳ)
- `*` (зарб)
- `/` (тақсим)
- `%` (боқимонда)

#### Comparison (Муқоисавӣ)
- `==` (баробар)
- `!=` (нобаробар)
- `<` (хурдтар)
- `>` (калонтар)
- `<=` (хурдтар ё баробар)
- `>=` (калонтар ё баробар)

#### Logical (Мантиқӣ)
- `&&` (ва)
- `||` (ё)
- `!` (на)

## CLI Commands

### Compile
```bash
somoni compile input.som -o output.js
```

Options:
- `-o, --output <file>`: Output file
- `--target <target>`: Compilation target (es5, es2015, es2020, esnext)
- `--source-map`: Generate source maps
- `--minify`: Minify output

### Run
```bash
somoni run input.som
```

### Initialize Project
```bash
somoni init [project-name]
```

## Examples

See the `examples/` directory for more code samples:

- `hello.som` - Basic hello world with Tajik console functions
- `variables.som` - Variable declarations using Tajik keywords
- `conditions.som` - Conditional statements with Tajik built-ins
- `functions.som` - Function definitions with comprehensive Tajik vocabulary
- `loops.som` - Loop constructs using maximum Tajik words
- `advanced.som` - Import/export, async programming, and advanced features

## File Extension

Somoni-script files use the `.som` extension.

## Development

### Building from Source

```bash
git clone https://github.com/your-org/somoni-script
cd somoni-script
npm install
npm run build
```

### Running Tests

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

## Language Philosophy

Somoni-script aims to make programming accessible to Tajik speakers by providing:

1. **Familiar Keywords**: Using Tajik Cyrillic terms for programming concepts
2. **Modern Syntax**: TypeScript-like features and clean syntax
3. **JavaScript Compatibility**: Seamless integration with existing JavaScript ecosystem
4. **Educational Value**: Teaching programming concepts in native language

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Named after Ismoil Somoni (849-907 CE), founder of the Samanid dynasty
- Inspired by the rich literary tradition of Tajik language
- Built with modern compiler design principles

## Roadmap to TypeScript-Level Power

Somoni-script currently provides a solid foundation with Tajik Cyrillic syntax and modern JavaScript features. To become as powerful as TypeScript, we have identified key areas for development:

### 🔴 **Phase 1: Core Type System (Critical Priority)**

#### Type Annotations
```somoni
// Current: No types
тағйирёбанда ном = "Аҳмад";

// Target: Type annotations in Tajik
тағйирёбанда ном: сатр = "Аҳмад";
тағйирёбанда синну_сол: рақам = 25;
тағйирёбанда фаъол: мантиқӣ = дуруст;
```

#### Interface System
```somoni
интерфейс Корбар {
    ном: сатр;
    синну_сол: рақам;
    email?: сатр;  // Optional property
}

функсия салом_гуфтан(корбар: Корбар): сатр {
    бозгашт "Салом, " + корбар.ном;
}
```

#### Generic Types
```somoni
функсия якхела<Т>(қимат: Т): Т {
    бозгашт қимат;
}

интерфейс Рӯйхат<Т> {
    элементҳо: Т[];
    илова(элемент: Т): холӣ;
}
```

**Phase 1 Goals:**
- [ ] Basic type annotations (сатр, рақам, мантиқӣ, холӣ)
- [ ] Type checker implementation
- [ ] Interface definitions and validation
- [ ] Basic generic type support
- [ ] Function signature type checking

### 🔴 **Phase 2: Object-Oriented Programming (Critical Priority)**

#### Class System
```somoni
синф Ҳайвон {
    ном: сатр;
    
    конструктор(ном: сатр) {
        ин.ном = ном;
    }
    
    овоз_додан(): сатр {
        бозгашт "Овоз";
    }
}

синф Саг мерос Ҳайвон {
    овоз_додан(): сатр {
        бозгашт "Вақ вақ";
    }
}
```

#### Advanced Type Features
```somoni
// Union types
тағйирёбанда қимат: сатр | рақам = "салом";

// Intersection types
навъ КорбариАдмин = Корбар & Админ;

// Conditional types
навъ Натиҷа<Т> = Т extends сатр ? дуруст : нодуруст;
```

**Phase 2 Goals:**
- [ ] Class definitions with inheritance
- [ ] Constructor and method support
- [ ] Access modifiers (public, private, protected)
- [ ] Abstract classes and methods
- [ ] Union and intersection types
- [ ] Conditional and mapped types

### 🔴 **Phase 3: Developer Experience (Critical Priority)**

#### Language Server Protocol
- [ ] IntelliSense with Tajik keyword completion
- [ ] Real-time type checking and error reporting
- [ ] Go to definition and find references
- [ ] Symbol renaming and refactoring
- [ ] Hover information and documentation

#### IDE Integration
- [ ] VS Code extension with full language support
- [ ] Syntax highlighting for .som files
- [ ] Debugging support with source maps
- [ ] Code formatting and linting
- [ ] Snippet support for common patterns

#### Build System Enhancement
```json
// somoni.config.json
{
  "compilerOptions": {
    "target": "es2020",
    "strict": true,
    "sourceMap": true,
    "outDir": "./dist",
    "typeChecking": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Phase 3 Goals:**
- [ ] Language Server Protocol implementation
- [ ] VS Code extension development
- [ ] Advanced compiler configuration
- [ ] Source map generation for debugging
- [ ] Watch mode for development

### 🟡 **Phase 4: Modern Language Features (High Priority)**

#### Advanced Control Flow
```somoni
// Enhanced for loops
барои (тағйирёбанда и = 0; и < 10; и++) {
    чоп.сабт(и);
}

// Switch statements
интихоб (қимат) {
    ҳолат 1:
        чоп.сабт("Як");
        шикастан;
    ҳолат 2:
        чоп.сабт("Ду");
        шикастан;
    пешфарз:
        чоп.сабт("Дигар");
}
```

#### Destructuring and Spread
```somoni
// Array destructuring
тағйирёбанда [якум, дуюм] = [1, 2];

// Object destructuring
тағйирёбанда {ном, синну_сол} = корбар;

// Spread operator
тағйирёбанда нав_рӯйхат = [...кӯҳна_рӯйхат, элементи_нав];
```

#### Arrow Functions
```somoni
// Concise function syntax
тағйирёбанда ҷамъ = (а: рақам, б: рақам): рақам => а + б;

// Array methods with arrow functions
рӯйхат.харита(х => х * 2);
```

**Phase 4 Goals:**
- [ ] Enhanced for loop syntax
- [ ] Switch/case statements
- [ ] Array and object destructuring
- [ ] Spread and rest operators
- [ ] Arrow function expressions
- [ ] Template literals with interpolation

### 🟡 **Phase 5: Standard Library and Ecosystem (High Priority)**

#### Rich Standard Library
```somoni
// Collections
ворид { Рӯйхат, Харита, Маҷмӯа } аз "std/collections";

// File system
ворид { Файл, Роҳ } аз "std/fs";

// Networking
ворид { HTTP, Сервер } аз "std/net";

// Data formats
ворид { JSON, XML } аз "std/encoding";
```

#### Testing Framework
```somoni
ворид { тест, интизор, тавсиф } аз "somoni-test";

тавсиф("Математикаи асосӣ", () => {
    тест("ҷамъ кардани рақамҳо", () => {
        тағйирёбанда натиҷа = ҷамъ(2, 3);
        интизор(натиҷа).баробар_бошад(5);
    });
});
```

#### Package Management
```bash
# Package ecosystem commands
somoni install рақамҳо-утилс
somoni publish мани-китобхона
somoni search веб-фреймворк
```

**Phase 5 Goals:**
- [ ] Comprehensive standard library
- [ ] Built-in testing framework
- [ ] Package manager implementation
- [ ] Documentation generation tools
- [ ] Web framework ecosystem
- [ ] Database connectivity libraries

### 🟢 **Phase 6: Advanced Compiler Features (Medium Priority)**

#### Module System Enhancement
```somoni
// Namespace support
номфазо Математика {
    содир функсия ҷамъ(а: рақам, б: рақам): рақам;
    содир собит ПИ = 3.14159;
}

// Re-exports
содир { Корбар, Админ } аз "./types";
содир * аз "./utilities";
```

#### Decorators
```somoni
@зебкунанда
синф МинКомпонент {
    @хосият
    ном: сатр = "Компонент";
    
    @усул
    рендер(): сатр {
        бозгашт `<div>${ин.ном}</div>`;
    }
}
```

**Phase 6 Goals:**
- [ ] Namespace and module declarations
- [ ] Decorator syntax and implementation
- [ ] Advanced module resolution
- [ ] Declaration file generation (.d.som)
- [ ] Compiler plugins architecture

## Current vs Target Feature Comparison

| Feature | Current Status | Target Status | Phase |
|---------|---------------|---------------|-------|
| **Type System** | ❌ None | ✅ Full Static Typing | Phase 1 |
| **Interfaces** | ❌ None | ✅ Advanced Contracts | Phase 1 |
| **Classes** | ❌ None | ✅ Full OOP Support | Phase 2 |
| **Generics** | ❌ None | ✅ Template Types | Phase 1 |
| **Modules** | ✅ Basic ES6 | ✅ Advanced System | Phase 6 |
| **Async/Await** | ✅ Complete | ✅ Complete | ✅ Done |
| **Destructuring** | ❌ None | ✅ Full Support | Phase 4 |
| **Union Types** | ❌ None | ✅ Advanced Types | Phase 2 |
| **LSP Support** | ❌ None | ✅ Full IDE Integration | Phase 3 |
| **Package Ecosystem** | ❌ None | ✅ Rich Libraries | Phase 5 |
| **Testing** | ❌ None | ✅ Built-in Framework | Phase 5 |

## Contributing to the Roadmap

We welcome contributions to help achieve these goals! Each phase represents significant opportunities for community involvement:

- **Type System**: Compiler engineers and language designers
- **Developer Tools**: IDE extension and tooling developers  
- **Standard Library**: Library authors and API designers
- **Documentation**: Technical writers and educators
- **Testing**: QA engineers and test framework developers

---

**Somoni-script** - Забони барномасозии тоҷикӣ барои ояндаи рақамӣ