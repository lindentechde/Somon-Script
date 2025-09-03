# Somoni-script

A programming language that compiles to JavaScript, written in Tajik Cyrillic. Named after Ismoil Somoni, the founder of the Samanid dynasty.

## Features

- **Tajik Cyrillic Syntax**: Write code using familiar Tajik keywords
- **Static Type System**: TypeScript-level type safety with Tajik annotations ✅
- **Interface System**: Complete interface support with optional properties ✅
- **JavaScript Compilation**: Compiles to clean, readable JavaScript
- **Type Checking**: Compile-time validation with detailed error messages ✅
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
// With type annotations for better safety
функсия салом(ном: сатр): сатр {
    тағйирёбанда паём: сатр = "Салом, " + ном + "!";
    чоп.сабт(паём);
    бозгашт паём;
}

салом("ҷаҳон");
```

Run it:
```bash
npm run dev
```

Or compile to JavaScript:
```bash
npm run build
```

## Current Status

**🎉 Somoni-script now has TypeScript-level type safety with beautiful Tajik syntax!**

### What's Working Now ✅

- **Static Type System**: Full type annotations in Tajik (`сатр`, `рақам`, `мантиқӣ`)
- **Interface System**: Complete interface support with optional properties
- **Type Checking**: Compile-time validation with detailed error messages
- **Array Types**: Typed arrays with element validation (`рақам[]`, `сатр[]`)
- **Function Types**: Parameter and return type checking
- **Type Aliases**: Custom type definitions with `навъ` keyword
- **CLI Compilation**: `somoni compile file.som --strict` for type checking

### Try It Now

```bash
# Install and try the type system
npm install -g somoni-script

# Create a typed example
cat > example.som << 'EOF'
интерфейс Корбар {
    ном: сатр;
    синну_сол: рақам;
}

функсия салом_гуфтан(корбар: Корбар): сатр {
    бозгашт "Салом, " + корбар.ном;
}

тағйирёбанда корбар: Корбар = {
    ном: "Аҳмад",
    синну_сол: 25
};

чоп.сабт(салом_гуфтан(корбар));
EOF

# Compile with type checking
somoni compile example.som --strict
```

**Type Error Detection:**
```bash
# This will produce a type error
echo 'тағйирёбанда ном: сатр = 42;' > error.som
somoni compile error.som --strict
# Error: Type 'рақам' is not assignable to type 'сатр'
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
- `--strict`: Enable strict type checking ✅ **NEW**
- `--target <target>`: Compilation target (es5, es2015, es2020, esnext)
- `--source-map`: Generate source maps
- `--minify`: Minify output

**Type Checking Example:**
```bash
# Compile with type checking
somoni compile typed-example.som --strict

# This will catch type errors at compile time!
```

### Run
```bash
somoni run input.som
```

### Initialize Project
```bash
somoni init [project-name]
```

## Examples

See the `examples/` directory for comprehensive code samples:

- `hello.som` - Basic hello world with Tajik console functions
- `variables.som` - Variable declarations using Tajik keywords
- `typed-variables.som` - **NEW**: Type annotations and array types ✅
- `conditions.som` - Conditional statements with Tajik built-ins
- `functions.som` - Function definitions with comprehensive Tajik vocabulary
- `typed-functions.som` - **NEW**: Functions with type signatures ✅
- `interfaces.som` - **NEW**: Interface definitions and usage ✅
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

## Development Roadmap

**🎉 Phase 1 Complete!** Somoni-script now has TypeScript-level type safety with Tajik Cyrillic syntax. Here's our roadmap for continued development:

### ✅ **Phase 1: Core Type System (COMPLETED)**

#### Type Annotations ✅
```somoni
// Fully implemented: Type annotations in Tajik
тағйирёбанда ном: сатр = "Аҳмад";
тағйирёбанда синну_сол: рақам = 25;
тағйирёбанда фаъол: мантиқӣ = дуруст;
```

#### Interface System ✅
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

#### Array Types ✅
```somoni
тағйирёбанда рақамҳо: рақам[] = [1, 2, 3];
тағйирёбанда номҳо: сатр[] = ["Аҳмад", "Фотима"];
```

#### Type Aliases ✅
```somoni
навъ КорбарИД = сатр;
навъ Синну_сол = рақам;
```

**Phase 1 Achievements:**
- ✅ Basic type annotations (сатр, рақам, мантиқӣ, холӣ)
- ✅ Type checker implementation with error reporting
- ✅ Interface definitions and validation
- ✅ Array type support with element validation
- ✅ Function signature type checking
- ✅ Type aliases (навъ keyword)
- ✅ Optional properties in interfaces
- ✅ Compile-time type validation with --strict flag

### 🔴 **Phase 2: Object-Oriented Programming (Next Priority)**

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
// Union types (parsing implemented, type checking in progress)
тағйирёбанда қимат: сатр | рақам = "салом";

// Intersection types (planned)
навъ КорбариАдмин = Корбар & Админ;

// Conditional types (planned)
навъ Натиҷа<Т> = Т extends сатр ? дуруст : нодуруст;
```

**Phase 2 Goals:**
- [ ] Class definitions with inheritance
- [ ] Constructor and method support
- [ ] Access modifiers (public, private, protected)
- [ ] Abstract classes and methods
- [ ] Union type checking (parsing exists)
- [ ] Intersection types
- [ ] Conditional and mapped types
- [ ] Generic type constraints

### 🔴 **Phase 3: Developer Experience (High Priority)**

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
| **Type System** | ✅ Complete | ✅ Full Static Typing | ✅ Phase 1 |
| **Interfaces** | ✅ Complete | ✅ Advanced Contracts | ✅ Phase 1 |
| **Type Aliases** | ✅ Complete | ✅ Type Aliases | ✅ Phase 1 |
| **Array Types** | ✅ Complete | ✅ Array Types | ✅ Phase 1 |
| **Function Types** | ✅ Complete | ✅ Function Signatures | ✅ Phase 1 |
| **Classes** | ❌ None | ✅ Full OOP Support | Phase 2 |
| **Generics** | 🟡 Basic Parsing | ✅ Template Types | Phase 2 |
| **Union Types** | 🟡 Parsing Only | ✅ Full Type Checking | Phase 2 |
| **Modules** | ✅ Basic ES6 | ✅ Advanced System | Phase 6 |
| **Async/Await** | ✅ Complete | ✅ Complete | ✅ Done |
| **Destructuring** | ❌ None | ✅ Full Support | Phase 4 |
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