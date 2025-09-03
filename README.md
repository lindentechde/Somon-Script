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

---

**Somoni-script** - Забони барномасозии тоҷикӣ барои ояндаи рақамӣ