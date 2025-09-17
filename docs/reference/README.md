# SomonScript Reference

Complete reference documentation for the SomonScript programming language.

## Overview

This section provides comprehensive reference material for SomonScript syntax,
APIs, and language features. Use this when you need detailed information about
specific language constructs.

## Quick Navigation

### **[🚀 Quick Start Guide](quick-start.md)**

Essential syntax reference and cheat sheet for rapid development.

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
тағйирёбанда собит функсия синф интерфейс
агар вагарна барои то кӯшиш гирифтан
ворид содор аз пешфарз
```

#### Type System

**Primitive Types:**

- `сатр` (string)
- `рақам` (number)
- `мантиқӣ` (boolean)
- `ҳеҷ` (null)
- `номуайян` (undefined)

**Complex Types:**

```som
// Arrays
тағйирёбанда рўйхат: рақам[] = [1, 2, 3];

// Objects
тағйирёбанда объект: { ном: сатр; синну: рақам } = {
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
тағйирёбанда комбинатсия: ТипА & ТипБ = { ... };
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
тақсим_кардан(сатр);          // parseInt
рақам_кардан(сатр);           // parseFloat
сатр_кардан(рақам);           // toString
навъ_муайян_кардан(қимат);    // typeof
```

### Syntax Reference

#### Variable Declarations

```som
// Mutable variables
тағйирёбанда ном: сатр = "Анвар";
тағйирёбанда синну: рақам = 25;
тағйирёбанда фаъол: мантиқӣ = рост;

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
    ҷамъиятӣ синну_сол_гузоштан(синну_сол: рақам): ҳеҷ {
        ин.синну_сол = синну_сол;
    }
}

// Inheritance
синф Админ мерос_мебарад Корбар {
    хосусӣ сатҳи_дастрасӣ: рақам;

    конструктор(ном: сатр, синну_сол: рақам, сатҳи_дастрасӣ: рақам) {
        супер(ном, синну_сол);
        ин.сатҳи_дастрасӣ = сатҳи_дастрасӣ;
    }
}

// Abstract classes
мухтасар синф Шакл {
    мухтасар масоҳат_ҳисоб_кардан(): рақам;
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
интерфейс Админ мерос_мебарад Корбар {
    сатҳи_дастрасӣ: рақам;
    иҷозатҳо: сатр[];
}

// Generic interface
интерфейс Контейнер<T> {
    қимат: T;
    андоза(): рақам;
}

// Function interface
интерфейс ҲисобкунакФунксия {
    (а: рақам, б: рақам): рақам;
}
```

#### Control Flow

```som
// Conditionals
агар шарт {
    // код
} вагарна агар дигар_шарт {
    // код
} вагарна {
    // код
}

// Ternary operator
тағйирёбанда натиҷа = шарт ? "рост" : "нодуруст";

// Switch equivalent
мувофиқи (қимат) {
    ҳолати "A":
        чоп.сабт("Алиф");
        пайваст;
    ҳолати "B":
        чоп.сабт("Бо");
        пайваст;
    пешфарз:
        чоп.сабт("Номаълум");
}

// Loops
барои тағйирёбанда и = 0; и < 10; и++ {
    чоп.сабт(и);
}

то шарт {
    // код
}

анҷом {
    // код
} то шарт;

барои тағйирёбанда элемент аз массив {
    чоп.сабт(элемент);
}

барои тағйирёбанда калид дар объект {
    чоп.сабт(калид, объект[калид]);
}
```

#### Error Handling

```som
кӯшиш {
    // хатарнок код
} гирифтан (хато) {
    чоп.хато("Хато рух дод:", хато.паём);
} ниҳоят {
    // ҳамеша иҷро мешавад
}

// Throwing errors
партофтан нав Хато("Паёми хато");

// Custom error types
синф ХатоиМаҳсус мерос_мебарад Хато {
    конструктор(паём: сатр) {
        супер(паём);
        ин.ном = "ХатоиМаҳсус";
    }
}
```

#### Module System

```som
// Exports
содор функсия ҷамъ(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}

содор собит ПИ = 3.14159;

содор пешфарз синф Асосӣ {
    // implementation
}

// Imports
ворид { ҷамъ, ПИ } аз "./math";
ворид Асосӣ аз "./main";
ворид * чун Math аз "./math";

// Dynamic imports
ҳамзамон функсия loadModule() {
    собит модул = интизор ворид("./dynamic-module");
    бозгашт модул.функсия();
}
```

### API Reference

#### Compiler Options

```json
{
  "compilerOptions": {
    "target": "es2020",
    "sourceMap": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

#### CLI Commands

```bash
# Compilation
somon compile <file> [options]
  --output, -o     Output file path
  --source-map     Generate source maps
  --minify         Minify output
  --target         JavaScript target (es5, es2015, es2020)

# Execution
somon run <file> [options]
  --debug          Enable debug mode
  --watch          Watch for changes

# Module operations
somon bundle <entry> [options]
  --format         Output format (commonjs, esm, umd)
  --output, -o     Bundle output path
  --minify         Minify bundle

# Information
somon --version    Show version
somon --help       Show help
```

### Language Grammar

**Complete BNF Grammar:**

```bnf
program        → declaration* EOF ;

declaration    → classDecl | funDecl | varDecl | statement ;

classDecl      → "синф" IDENTIFIER ( "мерос_мебарад" IDENTIFIER )? "{" function* "}" ;
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
primary        → "рост" | "нодуруст" | "ҳеҷ" | "ин"
               | NUMBER | STRING | IDENTIFIER | "(" expression ")" ;
```

### Reserved Keywords

```
агар          if
вагарна       else
барои         for
то            while
анҷом         do
кӯшиш         try
гирифтан      catch
ниҳоят        finally
функсия       function
синф          class
интерфейс     interface
ворид         import
содор         export
аз            from
пешфарз       default
тағйирёбанда  let/var
собит         const
бозгашт       return
партофтан     throw
нав           new
ин            this
супер         super
рост          true
нодуруст      false
ҳеҷ           null
номуайян      undefined
мерос_мебарад extends
хосусӣ        private
ҷамъиятӣ      public
мухтасар      abstract
```

## API Documentation

For detailed API documentation and interactive examples, visit:

- [Online API Reference](https://api.somoni-script.org)
- [TypeScript Definitions](https://github.com/Slashmsu/somoni-script/tree/main/types)

---

This reference is continuously updated. For the latest information, see the
[GitHub repository](https://github.com/Slashmsu/somoni-script).
