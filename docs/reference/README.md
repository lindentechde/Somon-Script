# SomonScript Reference

Complete reference documentation for the SomonScript programming language.

## Overview

This section provides comprehensive reference material for SomonScript syntax,
APIs, and language features. Use this when you need detailed information about
specific language constructs.

## Quick Navigation

### **[🚀 Quick Start Guide](quick-start.md)**

Essential syntax reference and cheat sheet for rapid development.

### **[▶ Playground](https://lindentechde.github.io/Somon-Script/)**

Write and run SomonScript in the browser, also offline
([how it works](../../playground/README.md)).

### **[⌨️ Reading input](input.md)**

`хондан()` and `хонданиРақам()`: reading lines and numbers the learner types or
a file holds.

### **[🎓 Learning mode](learning-mode.md)**

Warnings for beginners: `хондан() + 1`, `"5" * 2`, unused variables, properties
named like built-in members. `"режим": "таълимӣ"` in `somon.config.json`.

### **[🩺 Diagnostics](diagnostics.md)**

Compiler and run-time messages in Tajik, Russian and English, and their codes.

### Language Features

#### Core Language

- **Variables & Constants**: Declaration syntax and scope rules
- **Data Types**: Primitive and complex types
- **Operators**: Arithmetic, comparison, logical, and assignment
- **Control Flow**: Conditionals, loops, and error handling

#### Functions & Classes

- **Function Declarations**: Syntax, parameters, and return types
- **Arrow Functions**: Concise function syntax
- **Classes**: Object-oriented programming constructs
- **Inheritance**: Class extension and polymorphism

#### Advanced Types

- **Union Types**: Multiple possible types (`сатр | рақам`)
- **Intersection Types**: Combined types (`A & B`)
- **Tuple Types**: Fixed-length arrays with specific types
- **Generic Types**: Reusable type parameters
- **Conditional Types**: Type-level conditionals

#### Modules & Imports

- **Export Syntax**: Making functions and classes available
- **Import Syntax**: Using code from other modules
- **Module Resolution**: How SomonScript finds modules
- **Dynamic Imports**: Loading modules at runtime

## Reference Sections

### Language Specification

#### Lexical Structure

```som
// Comments
/* Multi-line comments */

// Identifiers (Tajik Cyrillic)
тағйирёбанда мояИдентификатор = "қимат";

// Keywords
// тағйирёбанда собит функсия синф интерфейс
// агар вагарна барои то кӯшиш гирифтан
// ворид содир аз пешфарз
```

#### Type System

**Primitive Types:**

- `сатр` (string)
- `рақам` (number)
- `мантиқӣ` (boolean)
- `холӣ` (null)
- `беқимат` (undefined)

**Complex Types:**

```som
// Arrays
тағйирёбанда рўйхат: рақам[] = [1, 2, 3];

// Objects
тағйирёбанда шахс: { ном: сатр; синну: рақам; } = {
    ном: "Анвар",
    синну: 30
};

// Functions
тағйирёбанда функ: (а: рақам, б: рақам) => рақам = (а, б) => а + б;
```

**Union & Intersection:**

```som
// Union types
тағйирёбанда маълумот: сатр | рақам = "test";

// Intersection types
тағйирёбанда комбинатсия: ТипА & ТипБ = { /* ... */ };
```

#### Built-in Objects

**Console (`чоп`)**

```som
чоп.сабт("Паём");              // console.log
чоп.хато("Хато");              // console.error
чоп.огоҳӣ("Огоҳӣ");           // console.warn
чоп.маълумот("Маълумот");      // console.info
```

**Math (`Риёзӣ`)**

```som
Риёзӣ.дуръшака(9);            // Math.sqrt(9)
Риёзӣ.қувват(2, 3);           // Math.pow(2, 3)
Риёзӣ.тасодуфӣ();            // Math.random()
Риёзӣ.дузкунӣ(4.7);          // Math.round(4.7)
```

**Global Functions**

```som
parseInt(матн);               // parseInt
parseFloat(матн);             // parseFloat
адад.баСатр();                // toString
typeof қимат;                 // typeof
```

### Syntax Reference

#### Variable Declarations

```som
// Mutable variables
тағйирёбанда ном: сатр = "Анвар";
тағйирёбанда синну: рақам = 25;
тағйирёбанда фаъол: мантиқӣ = дуруст;

// Constants
собит ПИ: рақам = 3.14159;
собит МАКСИМУМ: рақам = 100;

// Type inference
тағйирёбанда автоматӣ = "тип худкор муайян мешавад";
```

#### Function Syntax

```som
// Basic function
функсия салом(ном: сатр): сатр {
    бозгашт "Салом, " + ном;
}

// With default parameters
функсия салом_бо_пешфарз(ном: сатр = "Меҳмон"): сатр {
    бозгашт "Салом, " + ном;
}

// Arrow functions
тағйирёбанда ҷамъ = (а: рақам, б: рақам): рақам => а + б;

// Generic functions
функсия якхела<T>(элемент: T): T {
    бозгашт элемент;
}

// Async functions
ҳамзамон функсия маълумот_гирифтан(): Promise<сатр> {
    тағйирёбанда ҷавоб = интизор fetch("url");
    бозгашт интизор ҷавоб.text();
}
```

#### Class Syntax

```som
// Basic class
синф Корбар {
    хосусӣ ном: сатр;
    хосусӣ синну_сол: рақам;

    конструктор(ном: сатр, синну_сол: рақам) {
        ин.ном = ном;
        ин.синну_сол = синну_сол;
    }

    ҷамъиятӣ салом(): сатр {
        бозгашт `Салом, ман ${ин.ном}`;
    }

    // Getter
    ҷамъиятӣ синну_сол_гирифтан(): рақам {
        бозгашт ин.синну_сол;
    }

    // Setter
    ҷамъиятӣ синну_сол_гузоштан(синну_сол: рақам): холӣ {
        ин.синну_сол = синну_сол;
    }
}

// Inheritance
синф Админ мерос Корбар {
    хосусӣ сатҳи_дастрасӣ: рақам;

    конструктор(ном: сатр, синну_сол: рақам, сатҳи_дастрасӣ: рақам) {
        супер(ном, синну_сол);
        ин.сатҳи_дастрасӣ = сатҳи_дастрасӣ;
    }
}

// Abstract classes
мавҳум синф Шакл {
    мавҳум масоҳат_ҳисоб_кардан(): рақам;
}
```

#### Interface Syntax

```som
// Basic interface
интерфейс Корбар {
    ном: сатр;
    синну_сол: рақам;
    email?: сатр; // Optional property
}

// Extended interface
интерфейс Админ мерос Корбар {
    сатҳи_дастрасӣ: рақам;
    иҷозатҳо: сатр[];
}

// Generic interface
интерфейс Контейнер<T> {
    қимат: T;
    андоза(): рақам;
}

// Function type
навъ ҲисобкунакФунксия = (а: рақам, б: рақам) => рақам;
```

#### Control Flow

```som
// Conditionals
агар (шарт) {
    // код
} вагарна агар (дигар_шарт) {
    // код
} вагарна {
    // код
}

// Ternary operator
тағйирёбанда натиҷа = шарт ? "дуруст" : "нодуруст";

// Switch
интихоб (қимат) {
    ҳолат "A":
        чоп.сабт("Алиф");
        шикастан;
    ҳолат "B":
        чоп.сабт("Бо");
        шикастан;
    пешфарз:
        чоп.сабт("Номаълум");
}

// Loops
барои (тағйирёбанда и = 0; и < 10; и++) {
    чоп.сабт(и);
}

то (шарт) {
    // код
}

барои (тағйирёбанда элемент аз массив) {
    чоп.сабт(элемент);
}

барои (тағйирёбанда калид дар шахс) {
    чоп.сабт(калид, шахс[калид]);
}
```

#### Error Handling

```som
кӯшиш {
    // хатарнок код
} гирифтан (хато) {
    чоп.хато("Хато рух дод:", хато);
} ниҳоят {
    // ҳамеша иҷро мешавад
}

// Throwing errors
партофтан нав Хато("Паёми хато");

// Custom error types
синф ХатоиМаҳсус мерос Хато {
    конструктор(паём: сатр) {
        супер(паём);
        ин.ном = "ХатоиМаҳсус";
    }
}
```

#### Module System

```som
// Exports
содир функсия ҷамъ(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}

содир собит ПИ = 3.14159;

содир пешфарз синф Асосӣ {
    // implementation
}
```

```som
// Imports
ворид { ҷамъ, ПИ } аз "./math";
ворид Асосӣ аз "./main";
ворид * чун Math аз "./math";

// Dynamic imports
ҳамзамон функсия loadModule() {
    собит модул = интизор ворид("./dynamic-module");
    бозгашт модул.иҷро();
}
```

### API Reference

#### Compiler Options

```json
{
  "compilerOptions": {
    "target": "es2022",
    "sourceMap": true,
    "strict": true
  }
}
```

`strict` makes type errors fatal and turns on null checks and unknown-member
errors (see [Strict Mode](../../llm-guide/03-types.md#strict-mode---strict)).

#### CLI Commands

```bash
# Compilation
somon compile <file> [options]
  --output, -o     Output file path
  --source-map     Generate source maps
  --minify         Minify output
  --target         JavaScript target (es5, es2015 … es2025, esnext; default es2022)
  --lib            TypeScript libs available at run time (e.g. es2022,dom)

# Execution
somon run <file> [options]
  --debug          Enable debug mode
  --watch          Watch for changes

# Module operations
somon bundle <entry> [options]
  --format         Output format: commonjs (default), esm or iife
  --global-name    Global that receives the exports of an iife bundle
  --output, -o     Bundle output path
  --minify         Minify bundle
  --source-map     Generate source maps
  --inline-sources Inline original sources into emitted source maps

# Information
somon --version    Show version
somon --help       Show help
```

### Language Grammar

**Complete BNF Grammar:**

```bnf
program        → declaration* EOF ;

declaration    → classDecl | funDecl | varDecl | statement ;

classDecl      → "синф" IDENTIFIER ( "мерос" IDENTIFIER )? "{" function* "}" ;
funDecl        → "функсия" IDENTIFIER "(" parameters? ")" ( ":" type )? block ;
varDecl        → ( "тағйирёбанда" | "собит" ) IDENTIFIER ( ":" type )? ( "=" expression )? ";" ;

statement      → exprStmt | ifStmt | whileStmt | forStmt | returnStmt | blockStmt ;

expression     → assignment ;
assignment     → ( call "." )? IDENTIFIER "=" assignment | logic_or ;
logic_or       → logic_and ( "||" logic_and )* ;
logic_and      → equality ( "&&" equality )* ;
equality       → comparison ( ( "!=" | "===" ) comparison )* ;
comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
term           → factor ( ( "-" | "+" ) factor )* ;
factor         → unary ( ( "/" | "*" ) unary )* ;
unary          → ( "!" | "-" ) unary | call ;
call           → primary ( "(" arguments? ")" | "." IDENTIFIER )* ;
primary        → "дуруст" | "нодуруст" | "холӣ" | "ин"
               | NUMBER | STRING | IDENTIFIER | "(" expression ")" ;
```

### Reserved Keywords

```
агар          if
вагарна       else
барои         for
то            while
кӯшиш         try
гирифтан      catch
ниҳоят        finally
функсия       function
синф          class
интерфейс     interface
ворид         import
содир         export
аз            from
пешфарз       default
тағйирёбанда  let/var
собит         const
бозгашт       return
партофтан     throw
нав           new
ин            this
супер         super
дуруст        true
нодуруст      false
холӣ          null
беқимат       undefined
мерос         extends
хосусӣ        private
ҷамъиятӣ      public
мавҳум        abstract
```

## API Documentation

The compiler API (`compile`, `format`, `migrate`, the module system) is
described by the TypeScript declarations shipped with the package
(`dist/index.d.ts`); `npm run docs` generates HTML documentation from them with
TypeDoc.

---

For the latest information, see the
[GitHub repository](https://github.com/lindentechde/Somon-Script).
