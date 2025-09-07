# Basic Syntax

Learn the fundamental syntax elements of SomonScript and how they relate to
familiar programming concepts.

## Overview

SomonScript uses Tajik Cyrillic keywords with familiar programming syntax
patterns. If you know JavaScript or any C-style language, the structure will
feel familiar—only the keywords are in Tajik.

## Comments

SomonScript supports both single-line and multi-line comments:

```somon
// This is a single-line comment

/*
This is a
multi-line comment
*/

// Comments in Tajik are also perfectly fine
// Ин шарҳи як сатра аст
```

## Keywords and Identifiers

### Core Language Keywords

| SomonScript    | Meaning             | JavaScript |
| -------------- | ------------------- | ---------- |
| `тағйирёбанда` | variable/changeable | `let`      |
| `собит`        | constant            | `const`    |
| `функсия`      | function            | `function` |
| `агар`         | if                  | `if`       |
| `вагарна`      | else                | `else`     |
| `то`           | while               | `while`    |
| `барои`        | for                 | `for`      |
| `бозгашт`      | return              | `return`   |
| `синф`         | class               | `class`    |
| `нав`          | new                 | `new`      |
| `ин`           | this                | `this`     |

### Boolean Values

| SomonScript | Meaning | JavaScript |
| ----------- | ------- | ---------- |
| `дуруст`    | true    | `true`     |
| `нодуруст`  | false   | `false`    |
| `холӣ`      | null    | `null`     |

### Identifiers

Variable and function names can be:

- Tajik Cyrillic characters
- Latin characters
- Numbers (not at the beginning)
- Underscores

```somon
// Valid identifiers
тағйирёбанда ном = "Ahmad";
тағйирёбанда name = "Fatima";
тағйирёбанда синну_сол = 25;
тағйирёбанда age2 = 30;
```

## Statements and Expressions

### Statement Termination

Statements end with semicolons (like JavaScript):

```somon
тағйирёбанда ном = "Аҳмад";  // Variable declaration
чоп.сабт("Салом!");          // Function call
бозгашт 42;                  // Return statement
```

### Block Statements

Code blocks use curly braces:

```somon
агар (дуруст) {
    чоп.сабт("This is a block");
    чоп.сабт("Multiple statements");
}
```

## Data Types

### Primitive Types

```somon
// Numbers (integers and floats)
тағйирёбанда рақами_бутун = 42;
тағйирёбанда рақами_касрӣ = 3.14159;

// Strings
тағйирёбанда матн = "Салом, ҷаҳон!";
тағйирёбанда матни_дигар = 'Single quotes work too';

// Booleans
тағйирёбанда дуруст_аст = дуруст;
тағйирёбанда нодуруст_аст = нодуруст;

// Null
тағйирёбанда холӣ_қимат = холӣ;
```

### Type Annotations (Optional)

SomonScript supports TypeScript-style type annotations:

```somon
// With type annotations
тағйирёбанда ном: сатр = "Аҳмад";
тағйирёбанда синну_сол: рақам = 25;
тағйирёбанда фаъол: мантиқӣ = дуруст;

// Type annotation keywords
// сатр = string
// рақам = number
// мантиқӣ = boolean
```

## Variables and Constants

### Variable Declaration

```somon
// Mutable variables
тағйирёбанда ном = "Аҳмад";
ном = "Фотима";  // Can be changed

// Constants
собит ПИ = 3.14159;
// ПИ = 3.14;  // Error: cannot reassign constant
```

### Scope Rules

SomonScript follows JavaScript scope rules:

```somon
тағйирёбанда глобалӣ = "I'm global";

функсия тест() {
    тағйирёбанда маҳаллӣ = "I'm local";
    чоп.сабт(глобалӣ);  // Can access global
    чоп.сабт(маҳаллӣ);  // Can access local
}

// чоп.сабт(маҳаллӣ);  // Error: маҳаллӣ is not defined
```

## Functions

### Basic Function Syntax

```somon
// Function declaration
функсия салом(ном) {
    бозгашт "Салом, " + ном + "!";
}

// Function call
тағйирёбанда паём = салом("Аҳмад");
чоп.сабт(паём);
```

### Functions with Type Annotations

```somon
// Function with typed parameters and return type
функсия ҷамъ(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}

// Function with optional parameters
функсия салом(ном: сатр, унвон?: сатр): сатр {
    агар (унвон) {
        бозгашт "Салом, " + унвон + " " + ном;
    }
    бозгашт "Салом, " + ном;
}
```

## Control Flow

### Conditional Statements

```somon
// if-else
агар (синну_сол >= 18) {
    чоп.сабт("Калонсол");
} вагарна {
    чоп.сабт("Хурдсол");
}

// Nested conditionals
агар (синну_сол < 13) {
    чоп.сабт("Кӯдак");
} вагарна агар (синну_сол < 20) {
    чоп.сабт("Наврасон");
} вагарна {
    чоп.сабт("Калонсол");
}
```

### Loops

#### While Loop

```somon
тағйирёбанда и = 0;
то (и < 5) {
    чоп.сабт("Итератсия: " + и);
    и = и + 1;
}
```

#### For Loop

```somon
барои (тағйирёбанда и = 0; и < 5; и++) {
    чоп.сабт("Рақам: " + и);
}
```

## Arrays

### Array Declaration

```somon
// Array literals
тағйирёбанда рақамҳо = [1, 2, 3, 4, 5];
тағйирёбанда номҳо = ["Аҳмад", "Фотима", "Ҳасан"];

// Typed arrays
тағйирёбанда рақамҳои_typed: рақам[] = [1, 2, 3];
тағйирёбанда номҳои_typed: сатр[] = ["Алӣ", "Марям"];
```

### Array Access and Methods

```somon
// Array access
чоп.сабт(номҳо[0]);  // "Аҳмад"

// Array methods (in Tajik)
номҳо.илова("Зайнаб");        // push
тағйирёбанда охирин = номҳо.баровардан();  // pop
чоп.сабт(номҳо.дарозӣ);       // length
```

## Objects

### Object Literals

```somon
// Simple object
тағйирёбанда шахс = {
    ном: "Аҳмад",
    синну_сол: 25,
    шаҳр: "Душанбе"
};

// Accessing properties
чоп.сабт(шахс.ном);
чоп.сабт(шахс["синну_сол"]);

// Modifying properties
шахс.синну_сол = 26;
```

## Operators

### Arithmetic Operators

```somon
тағйирёбанда а = 10;
тағйирёбанда б = 3;

чоп.сабт(а + б);  // 13 (addition)
чоп.сабт(а - б);  // 7  (subtraction)
чоп.сабт(а * б);  // 30 (multiplication)
чоп.сабт(а / б);  // 3.333... (division)
чоп.сабт(а % б);  // 1  (modulo)
```

### Comparison Operators

```somon
тағйирёбанда х = 5;
тағйирёбанда у = 10;

чоп.сабт(х == у);   // нодуруст (equal)
чоп.сабт(х != у);   // дуруст (not equal)
чоп.сабт(х < у);    // дуруст (less than)
чоп.сабт(х > у);    // нодуруст (greater than)
чоп.сабт(х <= у);   // дуруст (less than or equal)
чоп.сабт(х >= у);   // нодуруст (greater than or equal)
```

### Logical Operators

```somon
тағйирёбанда а = дуруст;
тағйирёбанда б = нодуруст;

чоп.сабт(а && б);   // нодуруст (logical AND)
чоп.сабт(а || б);   // дуруст (logical OR)
чоп.сабт(!а);       // нодуруст (logical NOT)
```

## String Operations

### String Concatenation

```somon
тағйирёбанда ном = "Аҳмад";
тағйирёбанда фамилия = "Аҳмадов";
тағйирёбанда номи_пурра = ном + " " + фамилия;

чоп.сабт("Салом, " + ном + "!");
```

### String Methods

```somon
тағйирёбанда матн = "Салом, ҷаҳон!";

чоп.сабт(матн.дарозии_сатр);           // length
чоп.сабт(матн.ҷойивазкунӣ("ҷаҳон", "дӯстон"));  // replace
тағйирёбанда калимаҳо = матн.ҷудокунӣ(", ");      // split
```

## Error Handling

### Try-Catch-Finally

```somon
кӯшиш {
    // Code that might throw an error
    тағйирёбанда натиҷа = 10 / 0;
    чоп.сабт(натиҷа);
} гирифтан (хато) {
    чоп.хато("Хато рӯй дод: " + хато);
} ниҳоят {
    чоп.сабт("Ин ҳамеша иҷро мешавад");
}
```

## Built-in Functions

### Console Functions

```somon
чоп.сабт("Паём");           // console.log
чоп.хато("Хато");           // console.error
чоп.огоҳӣ("Огоҳӣ");         // console.warn
чоп.маълумот("Маълумот");   // console.info
```

## Examples

### Complete Example: Simple Calculator

```somon
// Simple calculator in SomonScript
функсия ҳисобгар(амал: сатр, а: рақам, б: рақам): рақам {
    агар (амал == "ҷамъ") {
        бозгашт а + б;
    } вагарна агар (амал == "тарҳ") {
        бозгашт а - б;
    } вагарна агар (амал == "зарб") {
        бозгашт а * б;
    } вагарна агар (амал == "тақсим") {
        агар (б != 0) {
            бозгашт а / б;
        } вагарна {
            чоп.хато("Ба сифр тақсим кардан мумкин нест!");
            бозгашт 0;
        }
    } вагарна {
        чоп.хато("Амали номаълум: " + амал);
        бозгашт 0;
    }
}

// Test the calculator
чоп.сабт("10 + 5 = " + ҳисобгар("ҷамъ", 10, 5));
чоп.сабт("10 - 5 = " + ҳисобгар("тарҳ", 10, 5));
чоп.сабт("10 * 5 = " + ҳисобгар("зарб", 10, 5));
чоп.сабт("10 / 5 = " + ҳисобгар("тақсим", 10, 5));
```

## Syntax Comparison

| Concept      | SomonScript           | JavaScript             |
| ------------ | --------------------- | ---------------------- |
| Variable     | `тағйирёбанда х = 5;` | `let x = 5;`           |
| Constant     | `собит ПИ = 3.14;`    | `const PI = 3.14;`     |
| Function     | `функсия test() {}`   | `function test() {}`   |
| If statement | `агар (шарт) {}`      | `if (condition) {}`    |
| While loop   | `то (шарт) {}`        | `while (condition) {}` |
| Return       | `бозгашт 42;`         | `return 42;`           |

## Best Practices

1. **Use meaningful Tajik names**: `тағйирёбанда номи_корбар` instead of
   `тағйирёбанда х`
2. **Add type annotations**: Helps catch errors early
3. **Use consistent formatting**: Follow JavaScript conventions for braces and
   indentation
4. **Comment in Tajik or English**: Whatever helps your team understand the code
5. **Use semicolons**: Always end statements with semicolons

## Common Mistakes

1. **Mixing JavaScript keywords**: Use `тағйирёбанда` not `let`
2. **Forgetting semicolons**: Each statement needs a semicolon
3. **Wrong boolean values**: Use `дуруст`/`нодуруст` not `true`/`false`
4. **Incorrect file extension**: Use `.som` not `.js`

## Next Steps

Now that you understand the basic syntax, continue with:

1. **[Variables and Types](variables-and-types.md)** - Deep dive into the type
   system
2. **[Functions](functions.md)** - Master function definitions and usage
3. **[Control Flow](control-flow.md)** - Advanced conditionals and loops
4. **[Reference](../reference/)** - Complete language reference

---

**Ready to dive deeper?** → [Variables and Types](variables-and-types.md)
